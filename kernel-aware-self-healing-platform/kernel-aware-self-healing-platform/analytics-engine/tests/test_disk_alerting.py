import importlib.util
import json
import sys
import types
import unittest
from unittest.mock import MagicMock, patch


if importlib.util.find_spec("redis") is None:
    redis_stub = types.ModuleType("redis")

    class RedisConnectionError(Exception):
        pass

    class RedisClientStub:
        def __init__(self, **kwargs):
            pass

        def ping(self):
            return True

        def delete(self, key):
            return 0

    redis_stub.Redis = RedisClientStub
    redis_stub.ConnectionError = RedisConnectionError
    sys.modules["redis"] = redis_stub

from detection.duration import verify_prometheus_duration
from detection.strategies.disk_detector import (
    DISK_EXPORTER_METRIC_LABELS,
    DiskDetector,
    PER_DISK_SCOPE,
    WHOLE_SYSTEM_SCOPE,
    classify_disk_metric_scope,
)
from incident_management import manager
from incident_management.alert_service import build_payload, publish_rule_alert
from load_data.system_metrics.metrics_loader import (
    build_metric_selector,
    get_disk_metric,
    query_prometheus_range,
)


def sample_rule(target_type="host", target="Whole System", duration=30, recovery=None):
    return {
        "rule": {
            "id": 12,
            "system_id": 1,
            "monitor_type": "disk",
            "status": "ENABLED",
            "severity": "Critical",
            "priority": "P1",
        },
        "targets": [{"target_type": target_type, "target": target}],
        "metrics": [{
            "metric": "disk_busy_percentage",
            "operator": "Greater Than (>)",
            "threshold": 80,
            "duration_seconds": duration,
        }],
        "recovery": recovery or [],
    }


def sample_result(value, mountpoint="/mnt/data"):
    return {
        "metric": {"system_id": "1"},
        "value": ["1760000000", str(value)],
    }


def partition_sample_result(value, mountpoint="/mnt/data", device="/dev/sda1"):
    return {
        "metric": {
            "system_id": "1",
            "device": device,
            "mountpoint": mountpoint,
            "filesystem": "ext4",
        },
        "value": ["1760000000", str(value)],
    }


def per_disk_sample_result(value, disk="sda1"):
    return {
        "metric": {"system_id": "1", "disk": disk},
        "value": ["1760000000", str(value)],
    }


class MemoryRedis:
    def __init__(self):
        self.values = {}
        self.fail_get = False
        self.fail_set = False
        self.fail_delete = False

    def get(self, key):
        if self.fail_get:
            raise RuntimeError("Redis read failed")
        return self.values.get(key)

    def set(self, key, value, ex=None):
        if self.fail_set:
            raise RuntimeError("Redis write failed")
        self.values[key] = value

    def delete(self, key):
        if self.fail_delete:
            raise RuntimeError("Redis delete failed")
        self.values.pop(key, None)


class DiskDetectorTests(unittest.TestCase):
    def setUp(self):
        self.redis = MemoryRedis()
        self.duration_redis_patch = patch("detection.disk_duration.redis_client", self.redis)
        self.duration_redis_patch.start()
        self.manager_redis_patch = patch.object(manager, "redis_client", self.redis)
        self.manager_redis_patch.start()
        self.events = []
        self.publish_patch = patch.object(manager, "publish_incident", side_effect=self._persist)
        self.publish_patch.start()

    def tearDown(self):
        self.publish_patch.stop()
        self.manager_redis_patch.stop()
        self.duration_redis_patch.stop()

    def _persist(self, incident, event):
        self.events.append((incident["incident_id"], event, dict(incident)))
        return {"incident": {"id": incident["incident_id"], "status": incident.get("status")}}

    def evaluate(self, rule, value, now, rows=None):
        from detection.strategies import disk_detector

        rows = rows if rows is not None else [sample_result(value)]
        with patch.object(disk_detector, "get_disk_metric", return_value=rows), \
             patch.object(disk_detector.time, "time", return_value=now):
            return DiskDetector().detect(rule)

    def test_metric_scope_uses_exporter_label_layout(self):
        from detection.strategies.disk_detector import PARTITION_SCOPE

        self.assertEqual(classify_disk_metric_scope(" DISK_USAGE_PERCENT "), PARTITION_SCOPE)
        self.assertEqual(classify_disk_metric_scope("disk_read_bytes"), WHOLE_SYSTEM_SCOPE)
        self.assertEqual(classify_disk_metric_scope(" disk_per_read_bytes "), PER_DISK_SCOPE)
        self.assertIsNone(classify_disk_metric_scope("disk_usage_percentage"))
        self.assertEqual(
            DISK_EXPORTER_METRIC_LABELS["disk_usage_percent"],
            frozenset({"device", "mountpoint", "filesystem"}),
        )

    def test_initial_violation_waits_for_redis_duration_then_opens_once(self):
        rule = sample_rule(duration=10)
        first = self.evaluate(rule, 90, now=100)
        self.assertEqual(first["outcome"], "duration_not_confirmed")
        self.assertEqual(self.events, [])
        state_keys = [key for key in self.redis.values if key.startswith("kaisp:disk:violation:")]
        self.assertEqual(len(state_keys), 1)
        state = json.loads(self.redis.get(state_keys[0]))
        self.assertEqual(state["started_at"], 100)
        self.assertEqual(state["status"], "pending")

        still_pending = self.evaluate(rule, 91, now=109)
        self.assertEqual(still_pending["outcome"], "duration_not_confirmed")
        triggered = self.evaluate(rule, 92, now=110)
        self.assertEqual(triggered["outcome"], "violation_confirmed")
        self.assertEqual([event for _, event, _ in self.events], ["opened"])
        active_state = json.loads(self.redis.get(state_keys[0]))
        self.assertEqual(active_state["started_at"], 100)
        self.assertEqual(active_state["status"], "active")
        self.assertTrue(active_state["incident_id"].startswith("INC-"))

    def test_continued_violation_reuses_id_and_does_not_republish(self):
        rule = sample_rule(duration=5)
        self.evaluate(rule, 90, now=100)
        self.evaluate(rule, 90, now=105)
        first_id = self.events[0][0]
        self.evaluate(rule, 95, now=120)
        self.assertEqual([event for _, event, _ in self.events], ["opened"])
        self.assertEqual(self.events[0][0], first_id)

    def test_recovery_before_duration_clears_timer_and_later_violation_starts_fresh(self):
        rule = sample_rule(duration=10)
        self.evaluate(rule, 90, now=100)
        self.evaluate(rule, 70, now=105)
        self.assertEqual(self.events, [])
        self.evaluate(rule, 90, now=120)
        state_key = next(key for key in self.redis.values if key.startswith("kaisp:disk:violation:"))
        state = json.loads(self.redis.get(state_key))
        self.assertEqual(state["started_at"], 120)
        self.assertEqual(state["status"], "pending")
        self.evaluate(rule, 90, now=129)
        self.assertEqual(self.events, [])
        self.evaluate(rule, 90, now=130)
        self.assertEqual([event for _, event, _ in self.events], ["opened"])

    def test_recovery_resolves_same_incident_and_recurrence_uses_new_id(self):
        rule = sample_rule(duration=10)
        self.evaluate(rule, 90, now=100)
        self.evaluate(rule, 90, now=110)
        first_id = self.events[0][0]
        recovered = self.evaluate(rule, 70, now=115)
        self.assertEqual(recovered["outcome"], "recovery_confirmed")
        self.assertEqual([event for _, event, _ in self.events], ["opened", "resolved"])
        self.assertEqual(self.events[1][0], first_id)
        self.assertEqual(self.events[1][2]["status"], "RESOLVED")

        self.evaluate(rule, 90, now=120)
        self.evaluate(rule, 90, now=130)
        later_id = self.events[-1][0]
        self.assertEqual(self.events[-1][1], "opened")
        self.assertNotEqual(later_id, first_id)

    def test_multiple_rules_have_independent_timers_and_resolution(self):
        first_rule = sample_rule(duration=5)
        first_rule["rule"]["id"] = 21
        second_rule = sample_rule(target_type="host", target="Whole System", duration=15)
        second_rule["rule"]["id"] = 22

        self.evaluate(first_rule, 90, now=100)
        self.evaluate(second_rule, 90, now=100)
        self.evaluate(first_rule, 90, now=105)
        self.assertEqual([event for _, event, _ in self.events], ["opened"])
        self.evaluate(second_rule, 90, now=110)
        self.assertEqual(len(self.events), 1)
        self.evaluate(first_rule, 70, now=111)
        self.assertEqual([event for _, event, _ in self.events], ["opened", "resolved"])
        self.evaluate(second_rule, 90, now=115)
        self.assertEqual(self.events[-1][1], "opened")
        self.assertEqual(self.events[-1][2]["rule_id"], 22)

    def test_duplicate_metric_conditions_in_one_rule_get_separate_incidents(self):
        rule = sample_rule(duration=0)
        second = dict(rule["metrics"][0])
        second["threshold"] = 85
        rule["metrics"].append(second)
        self.evaluate(rule, 90, now=100)
        opened = [event for event in self.events if event[1] == "opened"]
        self.assertEqual(len(opened), 2)
        self.assertNotEqual(opened[0][0], opened[1][0])
        self.assertNotEqual(opened[0][2]["fingerprint"], opened[1][2]["fingerprint"])

    def test_whole_system_series_must_be_unlabeled_and_no_history_query_is_used(self):
        from detection.strategies import disk_detector

        rule = sample_rule(duration=0)
        with patch.object(disk_detector, "get_disk_metric", return_value=[partition_sample_result(95)]), \
             patch.object(disk_detector.time, "time", return_value=100), \
             patch("load_data.system_metrics.metrics_loader.query_prometheus_range") as history:
            result = DiskDetector().detect(rule)
        self.assertEqual(result["outcome"], "skipped")
        self.assertEqual(self.events, [])
        history.assert_not_called()

    def test_partition_usage_queries_the_selected_device(self):
        from detection.strategies import disk_detector

        rule = sample_rule(target_type="partition", target="/dev/sda1", duration=0)
        rule["metrics"][0]["metric"] = "disk_usage_percent"
        result = partition_sample_result(95, device="/dev/sda1")
        with patch.object(disk_detector, "get_disk_metric", return_value=[result]) as query, \
             patch.object(disk_detector.time, "time", return_value=100):
            DiskDetector().detect(rule)
        query.assert_called_once_with(
            1, "disk_usage_percent", {"device": "/dev/sda1"}, require_freshness=True
        )
        self.assertEqual(self.events[0][1], "opened")
        self.assertEqual(self.events[0][2]["series_labels"]["device"], "/dev/sda1")

    def test_partition_target_maps_partition_suffix_to_exporter_disk_label(self):
        from detection.strategies import disk_detector

        rule = sample_rule(target_type="partition", target="/dev/nvme0n1p6", duration=0)
        rule["metrics"][0]["metric"] = "disk_per_read_bytes"
        info = partition_sample_result(1, device="/dev/nvme0n1p6")
        disk = per_disk_sample_result(100, disk="nvme0n1")
        with patch.object(disk_detector, "get_disk_metric", side_effect=[[info], [disk]]) as query, \
             patch.object(disk_detector.time, "time", return_value=100):
            DiskDetector().detect(rule)
        self.assertEqual(query.call_args_list[0].args, (1, "disk_partition_info", {"device": "/dev/nvme0n1p6"}))
        self.assertEqual(query.call_args_list[1].args, (1, "disk_per_read_bytes", {"disk": "nvme0n1"}))
        self.assertEqual(self.events[0][2]["target"], "/dev/nvme0n1p6")

    def test_non_disk_or_disabled_rule_is_not_evaluated(self):
        from detection.strategies import disk_detector

        rule = sample_rule()
        rule["rule"]["status"] = "DISABLED"
        with patch.object(disk_detector, "get_disk_metric") as query:
            result = DiskDetector().detect(rule)
        self.assertEqual(result["outcome"], "skipped")
        query.assert_not_called()
        rule["rule"]["status"] = "ENABLED"
        rule["rule"]["monitor_type"] = "process"
        with patch.object(disk_detector, "get_disk_metric") as query:
            result = DiskDetector().detect(rule)
        self.assertEqual(result["outcome"], "skipped")
        query.assert_not_called()

    def test_redis_state_errors_do_not_open_or_resolve_incidents(self):
        rule = sample_rule(duration=0)
        self.redis.fail_get = True
        result = self.evaluate(rule, 90, now=100)
        self.assertEqual(result["outcome"], "duration_not_confirmed")
        self.assertEqual(self.events, [])
        self.redis.fail_get = False
        self.evaluate(rule, 90, now=100)
        self.redis.fail_set = True
        result = self.evaluate(rule, 70, now=101)
        self.assertEqual(result["outcome"], "recovery_not_confirmed")
        self.assertEqual([event for _, event, _ in self.events], ["opened"])

    def test_backend_resolution_failure_is_retained_and_retried(self):
        rule = sample_rule(duration=0)
        self.evaluate(rule, 90, now=100)
        first_id = self.events[0][0]
        self.publish_patch.stop()
        first_resolution = {"pending": True}

        def persist_after_one_failure(item, event):
            if event == "resolved" and first_resolution["pending"]:
                first_resolution["pending"] = False
                raise TimeoutError("backend unavailable")
            return self._persist(item, event)

        self.publish_patch = patch.object(
            manager,
            "publish_incident",
            side_effect=persist_after_one_failure,
        )
        self.publish_patch.start()
        with patch.object(manager.logger, "exception"):
            pending = self.evaluate(rule, 70, now=101)
        self.assertEqual(pending["outcome"], "recovery_not_confirmed")
        state_key = next(key for key in self.redis.values if key.startswith("kaisp:disk:violation:"))
        self.assertEqual(json.loads(self.redis.get(state_key))["status"], "resolution_pending")
        self.evaluate(rule, 70, now=102)
        self.assertEqual([event for _, event, _ in self.events], ["opened", "resolved"])
        self.assertEqual(self.events[-1][0], first_id)


class DiskMetricLoaderTests(unittest.TestCase):
    def test_disk_metric_queries_existing_exporter_series(self):
        with patch("load_data.system_metrics.metrics_loader.query_prometheus") as query:
            get_disk_metric(1, "disk_usage_percent", {"device": "/dev/sda1"})
        query.assert_called_once_with('disk_usage_percent{device="/dev/sda1",system_id="1"}')


class PrometheusDurationTests(unittest.TestCase):
    labels = {
        "system_id": "1",
        "device": "/dev/sda1",
        "mountpoint": "/mnt/data",
        "filesystem": "ext4",
    }

    def range_row(self, values):
        return {"metric": self.labels, "values": values}

    def test_range_loader_calls_prometheus_query_range(self):
        response = MagicMock()
        response.status_code = 200
        response.json.return_value = {"status": "success", "data": {"result": []}}
        with patch("load_data.system_metrics.metrics_loader.requests.get", return_value=response) as get:
            result = query_prometheus_range("disk_usage_percent{system_id=\"1\"}", 700, 1000, 5)
        self.assertEqual(result, [])
        self.assertTrue(get.call_args.args[0].endswith("/api/v1/query_range"))
        self.assertEqual(get.call_args.kwargs["params"], {
            "query": 'disk_usage_percent{system_id="1"}',
            "start": 700,
            "end": 1000,
            "step": 5,
        })

    def test_selector_does_not_repeat_prometheus_metric_name_label(self):
        selector = build_metric_selector(
            "disk_usage_percent",
            {"__name__": "disk_usage_percent", "system_id": "1"},
        )
        self.assertEqual(selector, 'disk_usage_percent{system_id="1"}')

    def test_range_loader_reports_sanitized_prometheus_error_body(self):
        query = 'disk_usage_percent{__name__="disk_usage_percent",device="/private/mount"}'
        response = MagicMock()
        response.status_code = 400
        response.text = (
            '{"status":"error","errorType":"bad_data",'
            f'"error":"parse error for {query}"' + "}"
        )
        with patch("load_data.system_metrics.metrics_loader.requests.get", return_value=response):
            with self.assertLogs("load_data.system_metrics.metrics_loader", level="ERROR") as captured:
                with self.assertRaisesRegex(RuntimeError, "parse error"):
                    query_prometheus_range(query, 700, 1000, 5)
        self.assertIn("response_body=", captured.output[0])
        self.assertIn("parse error", captured.output[0])
        self.assertNotIn("/private/mount", captured.output[0])

    def test_300_second_condition_requires_every_fresh_sample(self):
        now = 1000
        values = [[now - 300 + index * 5, "90"] for index in range(61)]
        labels = {"__name__": "disk_usage_percent", **self.labels}
        row = {"metric": labels, "values": values}
        with patch("detection.duration.query_prometheus_range", return_value=[row]) as query:
            satisfied, reason = verify_prometheus_duration(
                "disk_usage_percent", labels, "Greater Than (>)", 80, 300, now=now
            )
        self.assertTrue(satisfied)
        self.assertIsNone(reason)
        self.assertEqual(query.call_args.args[1:], (700, 1000, 5.0))
        self.assertEqual(
            query.call_args.args[0],
            '(disk_usage_percent{device="/dev/sda1",filesystem="ext4",mountpoint="/mnt/data",system_id="1"}) and '
            '((time() - timestamp(disk_usage_percent{device="/dev/sda1",filesystem="ext4",mountpoint="/mnt/data",system_id="1"})) <= 6.25)',
        )

    def test_a_false_historical_sample_breaks_continuous_violation(self):
        now = 1000
        values = [[now - 300 + index * 5, "90"] for index in range(61)]
        values[30][1] = "70"
        with patch("detection.duration.query_prometheus_range", return_value=[self.range_row(values)]):
            satisfied, reason = verify_prometheus_duration(
                "disk_usage_percent", self.labels, "Greater Than (>)", 80, 300, now=now
            )
        self.assertFalse(satisfied)
        self.assertIsNone(reason)

    def test_scrape_gap_or_insufficient_retention_cannot_prove_duration(self):
        now = 1000
        gap_values = [[now - 300 + index * 5, "90"] for index in range(61) if index != 30]
        with patch("detection.duration.query_prometheus_range", return_value=[self.range_row(gap_values)]):
            satisfied, reason = verify_prometheus_duration(
                "disk_usage_percent", self.labels, "Greater Than (>)", 80, 300, now=now
            )
        self.assertFalse(satisfied)
        self.assertIn("scrape gap", reason)

        recent_values = [[now - 150 + index * 5, "90"] for index in range(31)]
        with patch("detection.duration.query_prometheus_range", return_value=[self.range_row(recent_values)]):
            satisfied, reason = verify_prometheus_duration(
                "disk_usage_percent", self.labels, "Greater Than (>)", 80, 300, now=now
            )
        self.assertFalse(satisfied)
        self.assertIn("full configured duration", reason)

    def test_duration_zero_requires_a_fresh_sample(self):
        with patch("detection.duration.query_prometheus", return_value=[]):
            satisfied, reason = verify_prometheus_duration(
                "disk_usage_percent", self.labels, "Greater Than (>)", 80, 0
            )
        self.assertFalse(satisfied)
        self.assertIn("fresh Prometheus sample", reason)


class RuleIterationTests(unittest.TestCase):
    def test_disk_analyzer_prints_only_one_compact_line_for_a_real_skipped_rule(self):
        from analyzer import server_analyzer

        rule = {
            "rule": {
                "id": 97, "system_id": 1, "monitor_type": "disk", "status": "ENABLED",
            },
            "targets": [{"target_type": "process", "target": "chrome (PID 115211)"}],
            "metrics": [{"metric": "disk_usage_percent", "operator": "Greater Than (>)", "threshold": 90}],
        }
        with patch.object(server_analyzer, "load_rules", return_value=[rule]), \
             self.assertLogs(level="WARNING") as captured:
            server_analyzer.analyze_disk_server(1)

        self.assertEqual(len(captured.output), 1)
        self.assertTrue(captured.output[0].endswith("Disk Rule 97: SKIPPED — Process target"))

    def test_compact_terminal_statuses_cover_violation_recovery_and_skip(self):
        from analyzer import server_analyzer

        rules = [
            {"rule": {"id": 301, "system_id": 1, "monitor_type": "disk", "status": "ENABLED"}},
            {"rule": {"id": 302, "system_id": 1, "monitor_type": "disk", "status": "ENABLED"}},
            {"rule": {"id": 303, "system_id": 1, "monitor_type": "disk", "status": "ENABLED"}},
        ]
        outcomes = [
            {"outcome": "violation_confirmed", "violations_confirmed": 1},
            {"outcome": "condition_not_violated"},
            {"outcome": "skipped", "reason": "disk_x metric cannot be evaluated against a partition target"},
        ]
        with patch.object(server_analyzer, "load_rules", return_value=rules), \
             patch.object(server_analyzer, "detect", side_effect=outcomes), \
             self.assertLogs(server_analyzer.logger, level="WARNING") as captured:
            server_analyzer.analyze_disk_server(1)

        self.assertEqual(
            [line.split(":", 2)[-1] for line in captured.output],
            [
                "Disk Rule 301: VIOLATED",
                "Disk Rule 302: NOT VIOLATED",
                "Disk Rule 303: SKIPPED — incompatible metric and target",
            ],
        )

    def test_dynamic_rule_count_beyond_live_set_is_fully_selected_and_logged(self):
        from analyzer import server_analyzer

        # This synthetic fixture is intentionally larger than the live set;
        # it is not a production cap or expected rule count.
        synthetic_rule_count = 20
        disk_rules = [
            {
                "rule": {
                    "id": 9000 + index,
                    "system_id": 1,
                    "monitor_type": " Disk " if index % 2 else "dIsK",
                    "status": "ENABLED",
                },
                "targets": [],
                "metrics": [],
            }
            for index in reversed(range(synthetic_rule_count))
        ]
        rules = disk_rules + [
            {"rule": {"id": 20000, "system_id": 1, "monitor_type": "process", "status": "ENABLED"}},
            {"rule": {"id": 20001, "system_id": 1, "monitor_type": "disk", "status": "DISABLED"}},
        ]
        expected_ids = [item["rule"]["id"] for item in disk_rules]

        def healthy_result(rule):
            return {
                "rule_id": rule["rule"]["id"],
                "outcome": "condition_not_violated",
                "reason": None,
            }

        with patch.object(server_analyzer, "load_rules", return_value=rules), \
             patch.object(server_analyzer, "detect", side_effect=healthy_result) as detect, \
             self.assertLogs(server_analyzer.logger, level="WARNING") as captured:
            server_analyzer.analyze_disk_server(1)

        self.assertEqual(
            [call.args[0]["rule"]["id"] for call in detect.call_args_list],
            expected_ids,
        )
        self.assertEqual(detect.call_count, synthetic_rule_count)
        terminal_lines = [line.split(":", 2)[-1] for line in captured.output]
        self.assertEqual(len(terminal_lines), synthetic_rule_count)
        self.assertEqual(
            terminal_lines,
            [f"Disk Rule {rule_id}: NOT VIOLATED" for rule_id in expected_ids],
        )

    def test_only_enabled_disk_rules_for_the_requested_system_reach_dispatch(self):
        from analyzer import server_analyzer

        rules = [
            {"rule": {"id": 103, "system_id": 1, "monitor_type": "process", "status": "ENABLED"}},
            {"rule": {"id": 130, "system_id": 1, "monitor_type": "service", "status": "ENABLED"}},
            {"rule": {"id": 94, "system_id": 1, "monitor_type": " Disk ", "status": "ENABLED"}},
            {"rule": {"id": 95, "system_id": "1", "monitor_type": "DiSk", "status": "ENABLED"}},
            {"rule": {"id": 96, "system_id": 1, "monitor_type": "disk", "status": "DISABLED"}},
            {"rule": {"id": 97, "system_id": 2, "monitor_type": "disk", "status": "ENABLED"}},
            {"rule": {"id": 98, "system_id": 1, "status": "ENABLED"}},
            {"rule": {"id": 99, "system_id": 1, "monitor_type": None, "status": "ENABLED"}},
            {"rule": {"id": 100, "system_id": 1, "monitor_type": " DISK ", "status": " enabled "}},
            {"rule": {"id": 101, "system_id": 1, "monitor_type": "disk"}},
            {"rule": {"id": 102, "system_id": 1, "monitor_type": "disk", "status": None}},
        ]
        with patch.object(server_analyzer, "load_rules", return_value=rules), \
             patch.object(server_analyzer, "detect") as detect:
            with self.assertLogs(server_analyzer.logger, level="WARNING") as captured:
                server_analyzer.analyze_disk_server(1)

        self.assertEqual([call.args[0]["rule"]["id"] for call in detect.call_args_list], [94, 95, 100])
        self.assertEqual(
            [call.args[0]["rule"]["monitor_type"] for call in detect.call_args_list],
            ["disk", "disk", "disk"],
        )
        terminal_lines = [line.split(":", 2)[-1] for line in captured.output]
        self.assertEqual(
            terminal_lines,
            [
                "Disk Rule 94: SKIPPED — evaluation failed",
                "Disk Rule 95: SKIPPED — evaluation failed",
                "Disk Rule 100: SKIPPED — evaluation failed",
            ],
        )

    def test_shared_analyzer_remains_unfiltered_for_other_workflows(self):
        from analyzer import server_analyzer

        rules = [
            {"rule": {"id": 103, "system_id": 1, "monitor_type": "process", "status": "ENABLED"}},
            {"rule": {"id": 104, "system_id": 1, "monitor_type": "cpu", "status": "ENABLED"}},
        ]
        with patch.object(server_analyzer, "load_rules", return_value=rules), \
             patch.object(server_analyzer, "detect") as detect:
            server_analyzer.analyze_server(1)

        self.assertEqual(
            [call.args[0]["rule"]["id"] for call in detect.call_args_list],
            [103, 104],
        )

    def test_one_bad_rule_does_not_prevent_later_rules_from_running(self):
        from analyzer import server_analyzer

        rules = [
            {"rule": {"id": 94, "system_id": 1, "monitor_type": "disk", "status": "ENABLED"}},
            {"rule": {"id": 95, "system_id": 1, "monitor_type": "disk", "status": "ENABLED"}},
        ]
        with patch.object(server_analyzer, "load_rules", return_value=rules), \
             patch.object(server_analyzer, "detect", side_effect=[RuntimeError("bad rule"), None]) as detect, \
             self.assertLogs(server_analyzer.logger, level="WARNING") as captured:
            server_analyzer.analyze_disk_server(1)

        self.assertEqual(detect.call_count, 2)
        self.assertEqual(
            [line.split(":", 2)[-1] for line in captured.output],
            [
                "Disk Rule 94: SKIPPED — evaluation failed",
                "Disk Rule 95: SKIPPED — evaluation failed",
            ],
        )

    def test_rule_97_process_target_skip_does_not_prevent_rule_134(self):
        from analyzer import server_analyzer

        rules = [
            {
                "rule": {
                    "id": 97, "system_id": 1, "monitor_type": "disk", "status": "ENABLED",
                },
                "targets": [{"target_type": "process", "target": "chrome (PID 115211)"}],
            },
            {
                "rule": {
                    "id": 134, "system_id": 1, "monitor_type": "disk", "status": "ENABLED",
                },
                "targets": [{"target_type": "partition", "target": "/dev/nvme0n1p6"}],
            },
        ]
        with patch.object(server_analyzer, "load_rules", return_value=rules), \
             patch.object(server_analyzer, "detect", side_effect=[
                 {"outcome": "skipped", "reason": "Process targets are unsupported by Disk evaluation"},
                 {"outcome": "condition_not_violated", "reason": None},
             ]) as detect, self.assertLogs(server_analyzer.logger, level="WARNING") as captured:
            server_analyzer.analyze_disk_server(1)

        self.assertEqual(
            [call.args[0]["rule"]["id"] for call in detect.call_args_list],
            [97, 134],
        )
        self.assertEqual(
            [line.split(":", 2)[-1] for line in captured.output],
            [
                "Disk Rule 97: SKIPPED — Process target",
                "Disk Rule 134: NOT VIOLATED",
            ],
        )


class RuleAlertPublisherTests(unittest.TestCase):
    def incident(self):
        return {
            "incident_id": "INC-publisher",
            "rule_id": 12,
            "system_id": 1,
            "monitor_type": "disk",
            "target_type": "partition",
            "target": "/dev/sda1",
            "incident_severity": "Critical",
            "incident_priority": "P1",
            "metric": "disk_usage_percent",
            "value": 91,
            "violated_metric": {
                "metric": "disk_usage_percent",
                "operator": "Greater Than (>)",
                "threshold": 80,
                "duration_seconds": 30,
            },
        }

    def test_successful_rule_publish_requires_persisted_incident_response(self):
        response = MagicMock()
        response.json.return_value = {"status": "success", "incident": {"id": "INC-publisher"}}
        with patch("incident_management.alert_service.requests.post", return_value=response) as post:
            result = publish_rule_alert(self.incident(), "opened")
        self.assertEqual(result["incident"]["id"], "INC-publisher")
        self.assertTrue(post.call_args.args[0].endswith("/rule-alerts"))

    def test_success_without_persisted_incident_is_treated_as_failure(self):
        response = MagicMock()
        response.json.return_value = {"status": "success"}
        with patch("incident_management.alert_service.requests.post", return_value=response):
            with self.assertRaises(RuntimeError):
                publish_rule_alert(self.incident(), "opened")


class IncidentManagerTests(unittest.TestCase):
    def setUp(self):
        self.redis = MemoryRedis()
        self.redis_patch = patch.object(manager, "redis_client", self.redis)
        self.redis_patch.start()
        self.publish_patch = patch.object(manager, "publish_incident", side_effect=lambda item, event: {"incident": {"id": item["incident_id"]}})
        self.publish = self.publish_patch.start()
        self.de_patch = patch.object(manager, "_send_process_to_decision_engine")
        self.send_decision = self.de_patch.start()

    def tearDown(self):
        self.de_patch.stop()
        self.publish_patch.stop()
        self.redis_patch.stop()

    def incident(self, target="/dev/sda1"):
        return {
            "rule_id": 12, "system_id": 1, "monitor_type": "disk", "target_type": "partition",
            "target": target, "metric": "disk_usage_percent", "value": 91,
            "incident_severity": "Critical", "incident_priority": "P1",
            "violated_metric": {"metric": "disk_usage_percent", "operator": "Greater Than (>)", "threshold": 80, "duration_seconds": 30},
            "actions": [{"action_type": "run-command"}],
        }

    def test_repeated_observations_dedupe_and_recovery_allows_a_new_incident(self):
        first = manager.manage_incidents(self.incident(), True)
        updated = manager.manage_incidents(self.incident(), True)
        resolved = manager.manage_incidents(self.incident(), False)
        later = manager.manage_incidents(self.incident(), True)
        self.assertEqual(first["incident_id"], updated["incident_id"])
        self.assertEqual(resolved["status"], "RESOLVED")
        self.assertNotEqual(first["incident_id"], later["incident_id"])
        self.assertEqual(
            [call.args[1] for call in self.publish.call_args_list],
            ["opened", "resolved", "opened"],
        )
        self.send_decision.assert_not_called()

    def test_successful_persistence_response_clears_retry_marker_and_reuses_id(self):
        self.publish.side_effect = lambda item, event: {"incident": {"id": "INC-database-id"}}
        managed = manager.manage_incidents(self.incident(), True)
        stored = json.loads(self.redis.get(manager._active_key(managed["fingerprint"])))
        self.assertEqual(stored["incident_id"], "INC-database-id")
        self.assertNotIn("_backend_pending_event", stored)

        updated = manager.manage_incidents(self.incident(), True)
        self.assertEqual(updated["incident_id"], "INC-database-id")
        self.assertEqual([call.args[1] for call in self.publish.call_args_list], ["opened"])

    def test_failed_open_retries_as_opened_before_later_updates(self):
        self.publish.side_effect = TimeoutError("backend response timed out")
        with patch.object(manager.logger, "exception"):
            first = manager.manage_incidents(self.incident(), True)
        self.publish.side_effect = lambda item, event: {"incident": {"id": item["incident_id"]}}
        second = manager.manage_incidents(self.incident(), True)
        manager.manage_incidents(self.incident(), True)
        self.assertEqual(first["incident_id"], second["incident_id"])
        self.assertEqual(
            [call.args[1] for call in self.publish.call_args_list],
            ["opened", "opened"],
        )

    def test_stale_disk_update_retry_is_cleared_without_republishing(self):
        incident = self.incident()
        fingerprint = manager.incident_fingerprint(incident)
        key = manager._active_key(fingerprint)
        self.redis.set(key, json.dumps({
            **incident,
            "fingerprint": fingerprint,
            "incident_id": "INC-existing",
            "status": "OPEN",
            "_backend_pending_event": "updated",
        }))

        current = manager.manage_incidents(incident, True)

        self.assertEqual(current["incident_id"], "INC-existing")
        self.assertNotIn("_backend_pending_event", json.loads(self.redis.get(key)))
        self.publish.assert_not_called()

    def test_non_disk_ongoing_incidents_keep_existing_update_behavior(self):
        incident = self.incident()
        incident["monitor_type"] = "process"

        manager.manage_incidents(incident, True)
        manager.manage_incidents(incident, True)

        self.assertEqual(
            [call.args[1] for call in self.publish.call_args_list],
            ["opened", "updated"],
        )

    def test_failed_resolution_is_retried_before_a_new_open(self):
        first = manager.manage_incidents(self.incident(), True)
        self.publish.side_effect = TimeoutError("backend response timed out")
        with patch.object(manager.logger, "exception"):
            manager.manage_incidents(self.incident(), False)
        self.publish.side_effect = lambda item, event: {"incident": {"id": item["incident_id"]}}
        reopened = manager.manage_incidents(self.incident(), True)
        self.assertNotEqual(first["incident_id"], reopened["incident_id"])
        self.assertEqual(
            [call.args[1] for call in self.publish.call_args_list],
            ["opened", "resolved", "resolved", "opened"],
        )

    def test_separate_partitions_get_distinct_incident_identities(self):
        first = manager.manage_incidents(self.incident("/dev/sda1"), True)
        second = manager.manage_incidents(self.incident("/dev/sda2"), True)
        self.assertNotEqual(first["incident_id"], second["incident_id"])
        self.assertNotEqual(first["fingerprint"], second["fingerprint"])

if __name__ == "__main__":
    unittest.main()
