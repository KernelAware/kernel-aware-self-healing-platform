import os
import sys
import unittest
from unittest.mock import patch


sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from detection.duration import check_duration
from detection.strategies.cpu_detector import CpuDetector
from detection.threshold import check_threshold
from load_data.system_metrics.metrics_loader import get_cpu_metric


class CpuThresholdTests(unittest.TestCase):
    def test_symbolic_and_descriptive_operators(self):
        cases = [
            (37.8, ">", 8, True),
            (37.8, "Greater Than (>)", 8, True),
            (5, ">", 8, False),
            (5, "Less Than (<)", 8, True),
            (8, ">=", 8, True),
            (8, "Greater Than or Equal To (>=)", 8, True),
            (8, "<=", 8, True),
            (8, "Less Than or Equal To (<=)", 8, True),
            (8, "==", 8, True),
            (8, "Equal To (==)", 8, True),
            (9, "!=", 8, True),
            (9, "Not Equal To (!=)", 8, True),
            (8, "Equal (=)", 8, True),
            (8, "Greater Than or Equal (>=)", 8, True),
            (8, " Less Than (<) ", 8, False),
        ]
        for value, operator, threshold, expected in cases:
            with self.subTest(operator=operator):
                self.assertEqual(check_threshold(value, operator, threshold), expected)

    def test_numeric_strings_compare_numerically_and_unknown_is_false(self):
        self.assertTrue(check_threshold("37.8", " > ", 8))
        self.assertTrue(check_threshold(8, ">=", "8"))
        self.assertFalse(check_threshold(1, "approximately", 0))
        self.assertFalse(check_threshold("not-a-number", ">", 0))

    @patch("load_data.system_metrics.metrics_loader.query_prometheus", return_value=[])
    def test_cpu_metric_selector_preserves_system_and_core_scope(self, query):
        get_cpu_metric(3, {"metric": "cpu_core_usage_percent", "core": "2"})
        self.assertEqual(
            query.call_args.args[0],
            'cpu_core_usage_percent{system_id="3", core="2"}',
        )

    @patch("detection.strategies.cpu_detector.manage_incidents")
    @patch("detection.strategies.cpu_detector.duration_snapshot", return_value=("PENDING", 0, 30))
    @patch("detection.strategies.cpu_detector.check_duration", return_value=False)
    @patch("detection.strategies.cpu_detector.get_cpu_metric", return_value=[{
        "metric": {"__name__": "cpu_usage_percent", "instance": "host:8001"},
        "value": [100, "37.8"],
    }])
    def test_rule_one_violation_starts_duration_before_incident(
        self, _metric, duration, _snapshot, manage
    ):
        CpuDetector().detect({
            "rule": {"id": 1, "system_id": 3, "severity": "high", "priority": 1},
            "targets": [{"target_type": "server", "target": "localhost", "host": "127.0.0.1"}],
            "metrics": [{
                "metric": "cpu_usage_percent",
                "operator": ">",
                "threshold": 8,
                "duration_seconds": 30,
            }],
        })
        duration.assert_called_once()
        self.assertEqual(duration.call_args.kwargs["duration_seconds"], 30)
        manage.assert_not_called()

    @patch("detection.strategies.cpu_detector.manage_incidents")
    @patch("detection.strategies.cpu_detector.clear_duration", return_value=True)
    @patch("detection.strategies.cpu_detector.get_cpu_metric", return_value=[{
        "metric": {"__name__": "cpu_usage_percent"},
        "value": [100, "5"],
    }])
    def test_non_violation_clears_pending_timer(self, _metric, clear, manage):
        CpuDetector().detect({
            "rule": {"id": 1, "system_id": 3},
            "metrics": [{
                "metric": "cpu_usage_percent",
                "operator": ">",
                "threshold": 8,
                "duration_seconds": 30,
            }],
        })
        clear.assert_called_once()
        self.assertFalse(manage.call_args.kwargs["condition_violated"])

    @patch("detection.duration.redis_client")
    def test_rule_one_timer_completes_at_thirty_seconds(self, redis):
        redis.get.side_effect = [None, "100", "100", "100"]
        identity = {"system_id": 3, "rule_id": 1, "target": "localhost"}
        self.assertFalse(check_duration(identity, 30, now=100))
        self.assertFalse(check_duration(identity, 30, now=129))
        self.assertTrue(check_duration(identity, 30, now=130))


if __name__ == "__main__":
    unittest.main()
