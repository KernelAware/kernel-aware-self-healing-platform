import importlib.util
import sys
import types
import unittest
from unittest.mock import patch


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

from detection.duration import check_duration, clear_duration
from detection.strategies.disk_detector import DiskDetector
from incident_management import manager
from incident_management.alert_service import build_payload
from load_data.system_metrics.metrics_loader import get_disk_metric


def sample_rule(target_type="filesystem", target="/mnt/data", duration=30, recovery=None):
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

    def test_below_threshold_does_not_open_an_incident(self):
        with patch("detection.strategies.disk_detector.get_disk_metric", return_value=[sample_result(70)]), \
             patch("detection.strategies.disk_detector.manage_incidents") as manage:
            DiskDetector().detect(sample_rule())
        self.assertFalse(any(call.kwargs.get("condition_violated") for call in manage.call_args_list))

    def test_duration_pending_does_not_open_an_incident(self):
        with patch("detection.strategies.disk_detector.get_disk_metric", return_value=[sample_result(90)]), \
             patch("detection.strategies.disk_detector.check_duration", return_value=False), \
             patch("detection.strategies.disk_detector.manage_incidents") as manage:
            DiskDetector().detect(sample_rule())
        manage.assert_not_called()

    def test_sustained_violation_submits_one_normalized_observation(self):
        with patch("detection.strategies.disk_detector.get_disk_metric", return_value=[sample_result(90)]), \
             patch("detection.strategies.disk_detector.check_duration", return_value=True), \
             patch("detection.strategies.disk_detector.manage_incidents") as manage:
            DiskDetector().detect(sample_rule())
        manage.assert_called_once()
        incident = manage.call_args.args[0]
        self.assertEqual(incident["monitor_type"], "disk")
        self.assertEqual(incident["target"], "/mnt/data")
        self.assertEqual(incident["system_id"], 1)

    def test_whole_system_series_keep_filesystems_separate(self):
        samples = [sample_result(91, "/mnt/a"), sample_result(92, "/mnt/b")]
        with patch("detection.strategies.disk_detector.get_disk_metric", return_value=samples), \
             patch("detection.strategies.disk_detector.check_duration", return_value=True), \
             patch("detection.strategies.disk_detector.manage_incidents") as manage:
            DiskDetector().detect(sample_rule("host", "Whole System"))
        self.assertEqual(
            {call.args[0]["target"] for call in manage.call_args_list},
            {"/mnt/a", "/mnt/b"},
        )

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
             patch("detection.strategies.disk_detector.check_duration", return_value=True), \
             patch("detection.strategies.disk_detector.manage_incidents") as manage:
            DiskDetector().detect(sample_rule(recovery=recovery))
        manage.assert_called_once()
        self.assertFalse(manage.call_args.kwargs["condition_violated"])

    def test_disk_process_target_uses_exported_process_disk_counter(self):
        rule = sample_rule("process", "worker (PID 123)")
        rule["metrics"][0]["metric"] = "disk_read_bytes"
        process_sample = {"metric": {"system_id": "1", "name": "worker", "pid": "123"}, "value": ["1", "500"]}
        with patch("detection.strategies.disk_detector.get_process_metric", return_value=[process_sample]) as query, \
             patch("detection.strategies.disk_detector.check_duration", return_value=True), \
             patch("detection.strategies.disk_detector.manage_incidents") as manage:
            DiskDetector().detect(rule)
        query.assert_called_once_with(1, "worker", {"metric": "disk_read_bytes"})
        self.assertEqual(manage.call_args.args[0]["monitor_type"], "disk")
        self.assertEqual(manage.call_args.args[0]["pid"], "123")

    def test_disk_usage_for_process_target_uses_disk_exporter_series(self):
        rule = sample_rule("process", "worker (PID 123)")
        disk_sample = sample_result(91)
        with patch("detection.strategies.disk_detector.get_disk_metric", return_value=[disk_sample]) as disk_query, \
             patch("detection.strategies.disk_detector.get_process_metric") as process_query, \
             patch("detection.strategies.disk_detector.manage_incidents") as manage:
            DiskDetector().detect(rule)
        disk_query.assert_called_once_with(1, "disk_usage_percent")
        process_query.assert_not_called()
        manage.assert_not_called()

    def test_alert_payload_preserves_severity_and_priority(self):
        incident = {
            "incident_id": "INC-test", "fingerprint": "fp", "rule_id": 12,
            "system_id": 1, "monitor_type": "disk", "target_type": "filesystem",
            "target": "/mnt/data", "incident_severity": "Critical",
            "incident_priority": "P1", "metric": "disk_usage_percent", "value": 91,
            "violated_metric": {"metric": "disk_usage_percent", "operator": "Greater Than (>)", "threshold": 80, "duration_seconds": 30},
        }
        payload = build_payload(incident, "opened")
        self.assertEqual(payload["incident_detail"]["severity"], "Critical")
        self.assertEqual(payload["incident_detail"]["priority"], "P1")
        self.assertEqual(payload["alert"]["system_id"], 1)
        self.assertEqual(payload["alert"]["target"], "/mnt/data")


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

    def incident(self, target="/mnt/data"):
        return {
            "rule_id": 12, "system_id": 1, "monitor_type": "disk", "target_type": "filesystem",
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

    def test_separate_filesystems_get_distinct_incident_identities(self):
        first = manager.manage_incidents(self.incident("/mnt/a"), True)
        second = manager.manage_incidents(self.incident("/mnt/b"), True)
        self.assertNotEqual(first["incident_id"], second["incident_id"])
        self.assertNotEqual(first["fingerprint"], second["fingerprint"])

    def test_duration_state_is_started_elapsed_and_reset(self):
        identity = {"category": "disk", "system_id": 1, "target": "/mnt/data"}
        with patch("detection.duration.redis_client", self.redis):
            self.assertFalse(check_duration(identity, 10, now=100))
            self.assertFalse(check_duration(identity, 10, now=105))
            self.assertTrue(check_duration(identity, 10, now=110))
            clear_duration(identity)
            self.assertFalse(check_duration(identity, 10, now=200))

    def test_process_detector_stays_on_shared_manager_path(self):
        from detection.strategies.process_detector import ProcessDetector

        rule = {
            "rule": {"id": 7, "system_id": 1, "monitor_type": "process", "status": "ENABLED", "severity": "High", "priority": "P2"},
            "targets": [{"target": "worker"}],
            "metrics": [{"metric": "CPU Usage (%)", "operator": "Greater Than (>)", "threshold": 50, "duration_seconds": 0}],
            "actions": [{"action_type": "alert"}],
        }
        result = {"metric": {"pid": "123", "name": "worker"}, "value": ["1", "70"]}
        with patch("detection.strategies.process_detector.get_process_metric", return_value=[result]), \
             patch("detection.strategies.process_detector.check_duration", return_value=True), \
             patch("detection.strategies.process_detector.manage_incidents") as manage:
            ProcessDetector().detect(rule)
        self.assertEqual(manage.call_args.args[0]["monitor_type"], "process")


if __name__ == "__main__":
    unittest.main()
