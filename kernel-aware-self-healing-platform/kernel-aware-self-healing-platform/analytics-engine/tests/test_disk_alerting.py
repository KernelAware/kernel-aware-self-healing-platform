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
from detection.strategies.disk_detector import DiskDetector
from incident_management import manager
from incident_management.alert_service import build_payload, publish_rule_alert
from load_data.system_metrics.metrics_loader import (
    build_metric_selector,
    get_disk_metric,
    query_prometheus_range,
)


def sample_rule(target_type="partition", target="/dev/sda1", duration=30, recovery=None):
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
            "metric": "disk_usage_percent",
            "operator": "Greater Than (>)",
            "threshold": 80,
            "duration_seconds": duration,
        }],
        "recovery": recovery or [],
    }


def sample_result(value, mountpoint="/mnt/data"):
    return {
        "metric": {
            "system_id": "1",
            "device": "/dev/sda1",
            "mountpoint": mountpoint,
            "filesystem": "ext4",
        },
        "value": ["1760000000", str(value)],
    }


class MemoryRedis:
    def __init__(self):
        self.values = {}

    def get(self, key):
        return self.values.get(key)

    def set(self, key, value, ex=None):
        self.values[key] = value

    def delete(self, key):
        self.values.pop(key, None)


class DiskDetectorTests(unittest.TestCase):
    def test_disk_usage_metric_queries_the_monitoring_agent_series(self):
        with patch("load_data.system_metrics.metrics_loader.query_prometheus") as query:
            get_disk_metric(1, "disk_usage_percent")
        query.assert_called_once_with('disk_usage_percent{system_id="1"}')

    def test_current_disk_query_filters_stale_series_without_duplicate_metric_matcher(self):
        with patch("load_data.system_metrics.metrics_loader.query_prometheus") as query:
            get_disk_metric(
                1, "disk_usage_percent", {"device": "/dev/sda1"}, require_freshness=True
            )
        selector = query.call_args.args[0]
        self.assertEqual(
            selector,
            '(disk_usage_percent{device="/dev/sda1",system_id="1"}) and '
            '((time() - timestamp(disk_usage_percent{device="/dev/sda1",system_id="1"})) <= 6.25)',
        )
        self.assertNotIn("__name__", selector)

    def test_below_threshold_does_not_open_an_incident(self):
        with patch("detection.strategies.disk_detector.get_disk_metric", return_value=[sample_result(70)]), \
             patch("detection.strategies.disk_detector.manage_incidents") as manage:
            DiskDetector().detect(sample_rule())
        self.assertFalse(any(call.kwargs.get("condition_violated") for call in manage.call_args_list))

    def test_duration_pending_does_not_open_an_incident(self):
        with patch("detection.strategies.disk_detector.get_disk_metric", return_value=[sample_result(90)]), \
             patch("detection.strategies.disk_detector.verify_prometheus_duration", return_value=(False, None)), \
             patch("detection.strategies.disk_detector.manage_incidents") as manage:
            DiskDetector().detect(sample_rule())
        manage.assert_not_called()

    def test_sustained_violation_submits_one_normalized_observation(self):
        with patch("detection.strategies.disk_detector.get_disk_metric", return_value=[sample_result(90)]), \
             patch("detection.strategies.disk_detector.verify_prometheus_duration", return_value=(True, None)) as duration, \
             patch("detection.strategies.disk_detector.manage_incidents") as manage:
            with self.assertLogs("detection.strategies.disk_detector", level="INFO") as captured:
                DiskDetector().detect(sample_rule())
        manage.assert_called_once()
        diagnostic = " ".join(captured.output)
        for field in ("rule_id=12", "metric=disk_usage_percent", "target=/dev/sda1", "value=90.0", "threshold=80.0", "severity=Critical", "duration_seconds=30"):
            self.assertIn(field, diagnostic)
        incident = manage.call_args.args[0]
        self.assertEqual(incident["monitor_type"], "disk")
        self.assertEqual(incident["target"], "/dev/sda1")
        self.assertEqual(incident["system_id"], 1)
        self.assertEqual(duration.call_args.args[0], "disk_usage_percent")
        self.assertEqual(duration.call_args.args[4], 30)

    def test_whole_system_rejects_partition_labeled_metrics(self):
        with patch("detection.strategies.disk_detector.get_disk_metric", return_value=[sample_result(91)]) as query, \
             patch("detection.strategies.disk_detector.manage_incidents") as manage:
            DiskDetector().detect(sample_rule("host", "whole system"))
        query.assert_not_called()
        manage.assert_not_called()

    def test_whole_system_uses_one_host_level_observation(self):
        aggregate = {"metric": {"system_id": "1"}, "value": ["1760000000", "91"]}
        rule = sample_rule("host", "whole system")
        rule["metrics"][0]["metric"] = "disk_read_bytes"
        with patch("detection.strategies.disk_detector.get_disk_metric", return_value=[aggregate]), \
             patch("detection.strategies.disk_detector.verify_prometheus_duration", return_value=(True, None)), \
             patch("detection.strategies.disk_detector.manage_incidents") as manage:
            DiskDetector().detect(rule)
        manage.assert_called_once()
        self.assertEqual(manage.call_args.args[0]["target_type"], "host")
        self.assertEqual(manage.call_args.args[0]["target"], "whole system")

    def test_whole_system_partition_metric_is_skipped_but_valid_host_metric_runs(self):
        rule = sample_rule("host", "whole system")
        rule["metrics"].append({
            "metric": "disk_busy_percentage",
            "operator": "Greater Than (>)",
            "threshold": 80,
            "duration_seconds": 30,
        })
        aggregate = {"metric": {"system_id": "1"}, "value": ["1760000000", "91"]}
        with patch("detection.strategies.disk_detector.get_disk_metric", return_value=[aggregate]) as query, \
             patch("detection.strategies.disk_detector.verify_prometheus_duration", return_value=(True, None)), \
             patch("detection.strategies.disk_detector.manage_incidents") as manage:
            DiskDetector().detect(rule)
        query.assert_called_once_with(1, "disk_busy_percentage", require_freshness=True)
        manage.assert_called_once()
        self.assertEqual(manage.call_args.args[0]["metric"], "disk_busy_percentage")

    def test_unknown_disk_metric_does_not_prevent_later_metric_evaluation(self):
        rule = sample_rule("host", "whole system")
        rule["metrics"] = [
            {"metric": "disk_usage_percentage", "operator": "Greater Than (>)", "threshold": 80},
            {"metric": "disk_read_bytes", "operator": "Greater Than (>)", "threshold": 10, "duration_seconds": 0},
        ]
        aggregate = {"metric": {"system_id": "1"}, "value": ["1760000000", "91"]}
        with patch("detection.strategies.disk_detector.get_disk_metric", return_value=[aggregate]) as query, \
             patch("detection.strategies.disk_detector.verify_prometheus_duration", return_value=(True, None)), \
             patch("detection.strategies.disk_detector.manage_incidents") as manage:
            DiskDetector().detect(rule)
        query.assert_called_once_with(1, "disk_read_bytes", require_freshness=True)
        manage.assert_called_once()

    def test_disabled_rule_does_not_query_prometheus(self):
        rule = sample_rule()
        rule["rule"]["status"] = "DISABLED"
        with patch("detection.strategies.disk_detector.get_disk_metric") as query:
            DiskDetector().detect(rule)
        query.assert_not_called()

    def test_prometheus_error_or_missing_series_does_not_mark_recovery(self):
        with patch("detection.strategies.disk_detector.get_disk_metric", side_effect=RuntimeError("offline")), \
             patch("detection.strategies.disk_detector.logger.exception"), \
             patch("detection.strategies.disk_detector.manage_incidents") as manage:
            DiskDetector().detect(sample_rule())
        manage.assert_not_called()

    def test_missing_prometheus_series_does_not_assume_recovery(self):
        with patch("detection.strategies.disk_detector.get_disk_metric", return_value=[]), \
             patch("detection.strategies.disk_detector.manage_incidents") as manage:
            DiskDetector().detect(sample_rule())
        manage.assert_not_called()

    def test_recovery_condition_and_duration_resolve_incident(self):
        recovery = [{
            "verification_required": True,
            "metric": "disk_usage_percent",
            "operator": "Less Than (<)",
            "recovery_threshold": 75,
            "recovery_duration_seconds": 60,
        }]
        with patch("detection.strategies.disk_detector.get_disk_metric", side_effect=[[sample_result(70)], [sample_result(70)]]), \
             patch("detection.strategies.disk_detector.verify_prometheus_duration", return_value=(True, None)), \
             patch("detection.strategies.disk_detector.manage_incidents") as manage:
            DiskDetector().detect(sample_rule(recovery=recovery))
        manage.assert_called_once()
        self.assertFalse(manage.call_args.kwargs["condition_violated"])

    def test_partition_target_filters_per_disk_metric_by_exported_disk_label(self):
        rule = sample_rule("partition", "/dev/sda1")
        rule["metrics"][0]["metric"] = "disk_per_read_bytes"
        disk_sample = {
            "metric": {"system_id": "1", "disk": "sda"},
            "value": ["1", "500"],
        }
        with patch("detection.strategies.disk_detector.get_disk_metric", return_value=[disk_sample]) as query, \
             patch("detection.strategies.disk_detector.verify_prometheus_duration", return_value=(True, None)) as duration, \
             patch("detection.strategies.disk_detector.manage_incidents") as manage:
            DiskDetector().detect(rule)
        query.assert_called_once_with(
            1, "disk_per_read_bytes", {"disk": "sda"}, require_freshness=True
        )
        self.assertEqual(duration.call_args.args[0], "disk_per_read_bytes")
        self.assertEqual(manage.call_args.args[0]["target_type"], "partition")
        self.assertEqual(manage.call_args.args[0]["target"], "/dev/sda1")
        self.assertNotIn("pid", manage.call_args.args[0])

    def test_whole_system_target_does_not_evaluate_per_disk_metric(self):
        rule = sample_rule("host", "whole system")
        rule["metrics"][0]["metric"] = "disk_per_read_bytes"
        with patch("detection.strategies.disk_detector.get_disk_metric") as query, \
             patch("detection.strategies.disk_detector.manage_incidents") as manage:
            DiskDetector().detect(rule)
        query.assert_not_called()
        manage.assert_not_called()

    def test_process_target_is_rejected_by_disk_detector(self):
        rule = sample_rule("process", "worker (PID 123)")
        with patch("detection.strategies.disk_detector.get_disk_metric") as query, \
             patch("detection.strategies.disk_detector.manage_incidents") as manage:
            DiskDetector().detect(rule)
        query.assert_not_called()
        manage.assert_not_called()

    def test_alert_payload_preserves_severity_and_priority(self):
        incident = {
            "incident_id": "INC-test", "fingerprint": "fp", "rule_id": 12,
            "system_id": 1, "monitor_type": "disk", "target_type": "partition",
            "target": "/dev/sda1", "incident_severity": "Critical",
            "incident_priority": "P1", "metric": "disk_usage_percent", "value": 91,
            "violated_metric": {"metric": "disk_usage_percent", "operator": "Greater Than (>)", "threshold": 80, "duration_seconds": 30},
        }
        payload = build_payload(incident, "opened")
        self.assertEqual(payload["incident_detail"]["severity"], "Critical")
        self.assertEqual(payload["incident_detail"]["priority"], "P1")
        self.assertEqual(payload["alert"]["system_id"], 1)
        self.assertEqual(payload["alert"]["target"], "/dev/sda1")


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
    def test_one_bad_rule_does_not_prevent_later_rules_from_running(self):
        from analyzer import server_analyzer

        rules = [
            {"rule": {"id": 94, "monitor_type": "disk", "status": "ENABLED"}},
            {"rule": {"id": 95, "monitor_type": "disk", "status": "ENABLED"}},
        ]
        with patch.object(server_analyzer, "load_rules", return_value=rules), \
             patch.object(server_analyzer, "detect", side_effect=[RuntimeError("bad rule"), None]) as detect, \
             patch.object(server_analyzer.logger, "exception") as log:
            server_analyzer.analyze_server(1)

        self.assertEqual(detect.call_count, 2)
        log.assert_called_once()
        self.assertIn(94, log.call_args.args)


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
        self.assertEqual([call.args[1] for call in self.publish.call_args_list], ["opened", "updated", "resolved", "opened"])
        self.send_decision.assert_not_called()

    def test_successful_persistence_response_clears_retry_marker_and_reuses_id(self):
        self.publish.side_effect = lambda item, event: {"incident": {"id": "INC-database-id"}}
        managed = manager.manage_incidents(self.incident(), True)
        stored = json.loads(self.redis.get(manager._active_key(managed["fingerprint"])))
        self.assertEqual(stored["incident_id"], "INC-database-id")
        self.assertNotIn("_backend_pending_event", stored)

        updated = manager.manage_incidents(self.incident(), True)
        self.assertEqual(updated["incident_id"], "INC-database-id")
        self.assertEqual([call.args[1] for call in self.publish.call_args_list], ["opened", "updated"])

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
            ["opened", "opened", "updated"],
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
