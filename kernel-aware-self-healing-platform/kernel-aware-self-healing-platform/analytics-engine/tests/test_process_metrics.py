import os
import sys
import unittest
from unittest.mock import patch


sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from detection.duration import verify_prometheus_duration
from detection.duration import check_duration
from detection.strategies.process_detector import ProcessDetector
from incident_management import manager
from load_data.system_metrics.metrics_loader import (
    canonical_process_metric,
    get_process_metric_selector,
)


class ProcessMetricTests(unittest.TestCase):
    def test_display_cpu_metric_maps_to_exported_metric(self):
        metric, selector = get_process_metric_selector(
            1,
            "chrome@service=user@1000.service@pid=7498",
            {"metric": "CPU Usage (%)"},
            require_freshness=True,
        )

        self.assertEqual(metric, "process_cpu_percent")
        self.assertIn("process_cpu_percent", selector)
        self.assertIn('name="chrome"', selector)
        self.assertIn('pid="7498"', selector)

    def test_historical_verification_uses_canonical_cpu_selector(self):
        rows = [{
            "metric": {
                "__name__": "process_cpu_percent",
                "name": "chrome",
                "pid": "7498",
            },
            "values": [[98, "90"], [100, "90"], [102, "90"]],
        }]

        with patch("detection.duration.query_prometheus_range", return_value=rows) as query:
            verified, reason = verify_prometheus_duration(
                "CPU Usage (%)",
                {"__name__": "process_cpu_percent", "name": "chrome", "pid": "7498"},
                "Greater Than (>)",
                80,
                2,
                now=102,
            )

        self.assertTrue(verified, reason)
        self.assertIn("process_cpu_percent{", query.call_args.args[0])

    def test_network_usage_remains_unsupported(self):
        with self.assertRaisesRegex(ValueError, "Unsupported Process metric"):
            canonical_process_metric("Network Usage (%)")

    @patch("load_data.system_metrics.metrics_loader.query_prometheus", return_value=[])
    def test_missing_memory_series_remains_unavailable(self, query):
        from load_data.system_metrics.metrics_loader import get_process_metric

        self.assertEqual(
            get_process_metric(
                1, "chrome@service=user@1000.service@pid=7498",
                {"metric": "Memory Usage (%)"}, require_freshness=True,
            ),
            [],
        )
        self.assertIn("process_memory_percent", query.call_args.args[0])

    @patch("detection.duration.redis_client")
    def test_redis_duration_preserves_original_start_time(self, redis):
        redis.get.side_effect = [None, "100"]
        self.assertFalse(check_duration({"rule_id": 1}, 30, now=100))
        self.assertTrue(check_duration({"rule_id": 1}, 30, now=130))
        redis.set.assert_called_once()

    @patch("incident_management.manager.redis_client.set")
    @patch("incident_management.manager.requests.post", side_effect=RuntimeError("unavailable"))
    def test_decision_engine_failure_leaves_publication_retryable(self, _post, redis_set):
        incident = {
            "incident_id": "incident-1",
            "fingerprint": "fingerprint-1",
            "monitor_type": "process",
        }

        self.assertFalse(manager._evaluate_for_publication("key", incident))
        self.assertEqual(incident["_decision_status"], "pending")
        self.assertGreater(incident["_decision_retry_at"], 0)

    @patch("detection.strategies.process_detector.manage_incidents")
    @patch("detection.strategies.process_detector.verify_prometheus_duration")
    @patch("detection.strategies.process_detector.check_duration", return_value=True)
    @patch("detection.strategies.process_detector.get_process_metric", return_value=[{
        "metric": {"__name__": "process_cpu_percent", "name": "chrome", "pid": "7498"},
        "value": [100, "90"],
    }])
    @patch("detection.strategies.process_detector.get_process_metric_selector", return_value=(
        "process_cpu_percent",
        'process_cpu_percent{name="chrome",pid="7498",system_id="1"}',
    ))
    def test_qualified_process_incident_reaches_incident_manager(
        self, _selector, _metric, _duration, verify, manage
    ):
        verify.return_value = (True, None)
        ProcessDetector().detect({
            "rule": {
                "id": 108,
                "system_id": 1,
                "status": "ENABLED",
            },
            "targets": [{"target": "chrome@service=user@1000.service@pid=7498"}],
            "metrics": [{
                "metric": "CPU Usage (%)",
                "operator": "Greater Than (>)",
                "threshold": 80,
                "duration_seconds": 30,
            }],
        })

        self.assertEqual(manage.call_count, 1)
        self.assertTrue(manage.call_args.kwargs["condition_violated"])
        self.assertEqual(manage.call_args.args[0]["pid"], "7498")

    @patch("incident_management.manager.redis_client.set")
    @patch("incident_management.manager.requests.post")
    def test_decision_engine_publish_allows_publication(self, post, redis_set):
        response = post.return_value
        response.status_code = 200
        response.json.return_value = {
            "incident_id": "incident-1",
            "fingerprint": "fingerprint-1",
            "outcome": "APPROVAL_REQUIRED",
            "decision": {"decision": "RESTART"},
            "policy": {"allowed": False},
            "publication": {"outcome": "PUBLISH", "reason": "Monitoring is enabled"},
        }
        incident = {
            "incident_id": "incident-1",
            "fingerprint": "fingerprint-1",
            "monitor_type": "process",
        }

        self.assertTrue(manager._evaluate_for_publication("key", incident))
        self.assertEqual(incident["_decision_publication_outcome"], "PUBLISH")


if __name__ == "__main__":
    unittest.main()
