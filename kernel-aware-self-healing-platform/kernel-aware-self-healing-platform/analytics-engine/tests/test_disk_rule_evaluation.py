import os
import sys
import time
import unittest
from unittest.mock import patch


sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from analyzer.server_analyzer import analyze_server
from detection.disk_duration import DiskDurationStateError, observe_disk_violation
from detection.duration import verify_prometheus_duration
from detection.strategies.disk_detector import DiskDetector
from load_data.system_metrics.metrics_loader import PROMETHEUS_SCRAPE_INTERVAL_SECONDS


def _rule(system_id=1, monitor_type="disk", rule_id=3):
    return {
        "rule": {
            "id": rule_id,
            "system_id": system_id,
            "name": "Test Disk" if monitor_type == "disk" else "Test CPU",
            "status": "ENABLED",
            "monitor_type": monitor_type,
            "priority": "High",
            "severity": "Warning",
        },
        "targets": [{"target_type": "host", "target": "whole system"}],
        "metrics": [{
            "id": 3,
            "metric": "disk_read_bytes" if monitor_type == "disk" else "cpu_usage_percent",
            "operator": "Greater Than (>)",
            "threshold": 90,
            "duration_seconds": 5,
        }],
    }


def _sample(value=6_225_961_472, timestamp=None):
    return {
        "metric": {
            "__name__": "disk_read_bytes",
            "instance": "host.docker.internal:8001",
            "job": "monitoring-agent",
            "system_id": "1",
        },
        "value": [timestamp or time.time(), str(value)],
    }


class DiskRuleEvaluationTests(unittest.TestCase):
    def test_history_verification_keeps_disk_exporter_metric_name(self):
        labels = {
            "__name__": "disk_read_bytes",
            "instance": "host.docker.internal:8001",
            "job": "monitoring-agent",
            "system_id": "1",
        }
        history = [{
            "metric": labels,
            "values": [[95, "1000"], [100, "1100"], [105, "1200"]],
        }]

        with patch("detection.duration.query_prometheus_range", return_value=history) as query:
            verified, reason = verify_prometheus_duration(
                "disk_read_bytes",
                labels,
                "Greater Than (>)",
                90,
                5,
                now=105,
                canonicalize_metric=False,
            )

        self.assertTrue(verified, reason)
        expression = query.call_args.args[0]
        self.assertIn("disk_read_bytes{", expression)
        self.assertNotIn("process_disk_read_bytes", expression)
        self.assertEqual(query.call_args.args[1:], (95, 105, PROMETHEUS_SCRAPE_INTERVAL_SECONDS))

    def test_analytics_filters_rules_to_requested_system(self):
        rules = [
            _rule(system_id=1),
            _rule(system_id=2, rule_id=1),
            _rule(system_id=1, monitor_type="cpu", rule_id=2),
            _rule(system_id=2, monitor_type="cpu", rule_id=4),
        ]

        with patch("analyzer.server_analyzer.load_rules", return_value=rules), \
             patch("analyzer.server_analyzer.detect", return_value={}) as detect:
            analyze_server(1)
            self.assertEqual(
                [(call.args[0]["rule"]["id"], call.args[0]["rule"]["system_id"])
                 for call in detect.call_args_list],
                [(3, 1), (2, 1)],
            )

            detect.reset_mock()
            analyze_server(2)
            self.assertEqual(
                [(call.args[0]["rule"]["id"], call.args[0]["rule"]["system_id"])
                 for call in detect.call_args_list],
                [(1, 2), (4, 2)],
            )

    @patch("detection.strategies.disk_detector.mark_disk_incident_active")
    @patch("detection.strategies.disk_detector.manage_disk_incident")
    @patch("detection.strategies.disk_detector.verify_prometheus_duration", return_value=(True, None))
    @patch("detection.strategies.disk_detector.observe_disk_violation")
    @patch("detection.strategies.disk_detector.get_disk_violation_state")
    @patch("detection.strategies.disk_detector.get_disk_metric", return_value=[_sample()])
    def test_sustained_disk_violation_uses_raw_metric_and_creates_incident(
        self, query, get_state, observe, verify, manage, mark_active
    ):
        state = {"status": "pending", "started_at": 100}
        get_state.return_value = state
        observe.return_value = (True, state)
        manage.return_value = {"outcome": "active", "incident": {"incident_id": "inc-3"}}
        mark_active.return_value = {"status": "active", "incident_id": "inc-3"}

        result = DiskDetector().detect(_rule())

        self.assertEqual(result["outcome"], "violation_confirmed")
        self.assertEqual(result["violations_observed"], 1)
        self.assertEqual(result["violations_confirmed"], 1)
        query.assert_called_once_with(1, "disk_read_bytes", require_freshness=True)
        self.assertEqual(verify.call_args.args[0], "disk_read_bytes")
        self.assertFalse(verify.call_args.kwargs["canonicalize_metric"])
        manage.assert_called_once()
        self.assertEqual(manage.call_args.args[0]["value"], 6_225_961_472)

    @patch("detection.strategies.disk_detector.manage_disk_incident")
    @patch("detection.strategies.disk_detector.verify_prometheus_duration", return_value=(True, None))
    @patch("detection.strategies.disk_detector.observe_disk_violation", return_value=(False, {"status": "pending"}))
    @patch("detection.strategies.disk_detector.get_disk_violation_state", return_value=None)
    @patch("detection.strategies.disk_detector.get_disk_metric", return_value=[_sample()])
    def test_first_observation_starts_timer_without_incident(
        self, _query, _get_state, observe, verify, manage
    ):
        result = DiskDetector().detect(_rule())

        observe.assert_called_once()
        verify.assert_not_called()
        manage.assert_not_called()
        self.assertEqual(result["outcome"], "duration_not_confirmed")
        self.assertEqual(result["violations_observed"], 1)
        self.assertEqual(result["reason"], "violation duration has not elapsed")

    @patch("detection.strategies.disk_detector.manage_disk_incident")
    @patch("detection.strategies.disk_detector.verify_prometheus_duration", return_value=(False, "range history missing"))
    @patch("detection.strategies.disk_detector.observe_disk_violation", return_value=(True, {"status": "pending"}))
    @patch("detection.strategies.disk_detector.get_disk_violation_state", return_value={"status": "pending"})
    @patch("detection.strategies.disk_detector.get_disk_metric", return_value=[_sample()])
    def test_history_failure_is_reported_and_blocks_creation(
        self, _query, _get_state, _observe, verify, manage
    ):
        result = DiskDetector().detect(_rule())

        verify.assert_called_once()
        manage.assert_not_called()
        self.assertEqual(result["outcome"], "duration_not_confirmed")
        self.assertEqual(result["reason"], "range history missing")

    @patch("detection.strategies.disk_detector.manage_disk_incident")
    @patch("detection.strategies.disk_detector.observe_disk_violation")
    @patch("detection.strategies.disk_detector.get_disk_violation_state", side_effect=DiskDurationStateError("Redis read failed"))
    @patch("detection.strategies.disk_detector.get_disk_metric", return_value=[_sample()])
    def test_redis_read_failure_is_reported_and_does_not_create_incident(
        self, _query, _get_state, observe, manage
    ):
        result = DiskDetector().detect(_rule())

        observe.assert_not_called()
        manage.assert_not_called()
        self.assertEqual(result["outcome"], "duration_not_confirmed")
        self.assertIn("Redis violation state unavailable", result["reason"])

    @patch("detection.strategies.disk_detector.manage_disk_incident")
    @patch("detection.strategies.disk_detector.get_disk_metric", return_value=[])
    def test_missing_or_stale_series_does_not_create_incident(self, _query, manage):
        result = DiskDetector().detect(_rule())

        manage.assert_not_called()
        self.assertEqual(result["matched_samples"], 0)
        self.assertEqual(result["violations_confirmed"], 0)
        self.assertEqual(result["outcome"], "skipped")

    @patch("detection.strategies.disk_detector.manage_disk_incident")
    @patch("detection.strategies.disk_detector.verify_prometheus_duration", return_value=(True, None))
    @patch("detection.strategies.disk_detector.observe_disk_violation", return_value=(True, {"status": "pending"}))
    @patch("detection.strategies.disk_detector.get_disk_violation_state", return_value={"status": "pending"})
    @patch("detection.strategies.disk_detector.get_disk_metric", return_value=[_sample()])
    def test_warmup_suppression_is_explicit_and_later_enabled_call_can_create(
        self, _query, get_state, observe, verify, manage
    ):
        detector = DiskDetector()
        warmup = detector.detect(_rule(), allow_incident_creation=False)
        self.assertEqual(warmup["reason"], "waiting for the first evaluation round to complete")
        manage.assert_not_called()

        manage.return_value = {"outcome": "active", "incident": {"incident_id": "inc-3"}}
        with patch("detection.strategies.disk_detector.mark_disk_incident_active", return_value={"status": "active"}):
            enabled = detector.detect(_rule(), allow_incident_creation=True)

        self.assertEqual(enabled["outcome"], "violation_confirmed")
        self.assertEqual(manage.call_count, 1)

    @patch("detection.disk_duration.redis_client.set")
    @patch("detection.disk_duration.redis_client.get", side_effect=[None, '{"started_at":100,"status":"pending"}'])
    def test_redis_timer_advances_and_completes_five_second_duration(self, redis_get, redis_set):
        identity = {"system_id": "1", "rule_id": "3", "metric_id": 3}

        first_sustained, first_state = observe_disk_violation(identity, 5, now=100)
        second_sustained, second_state = observe_disk_violation(identity, 5, now=106)

        self.assertFalse(first_sustained)
        self.assertEqual(first_state["started_at"], 100)
        self.assertTrue(second_sustained)
        self.assertEqual(second_state["last_observed_at"], 106)
        self.assertEqual(redis_get.call_count, 2)
        self.assertEqual(redis_set.call_count, 2)

    @patch("detection.strategies.disk_detector.clear_disk_violation", return_value=True)
    @patch("detection.strategies.disk_detector.manage_disk_incident", return_value={"outcome": "resolved", "incident": {"incident_id": "inc-3"}})
    @patch("detection.strategies.disk_detector.get_disk_violation_state", side_effect=[{"status": "pending"}, None])
    @patch("detection.strategies.disk_detector.observe_disk_violation", return_value=(False, {"status": "pending"}))
    @patch("detection.strategies.disk_detector.get_disk_metric", side_effect=[[_sample(1)], [_sample()]])
    def test_recovery_clears_timer_and_next_violation_starts_fresh(
        self, _query, _observe, get_state, manage, clear
    ):
        detector = DiskDetector()
        recovered = detector.detect(_rule())
        self.assertEqual(recovered["outcome"], "recovery_confirmed")
        clear.assert_called_once()

        pending = detector.detect(_rule())
        self.assertEqual(pending["outcome"], "duration_not_confirmed")
        self.assertEqual(pending["reason"], "violation duration has not elapsed")
        self.assertEqual(get_state.call_count, 2)
        self.assertEqual(manage.call_count, 1)


if __name__ == "__main__":
    unittest.main()
