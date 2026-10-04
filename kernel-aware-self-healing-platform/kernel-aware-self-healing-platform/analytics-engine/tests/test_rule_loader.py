import unittest
from unittest.mock import patch

from load_data.user_rules.rule_loader import load_rules, normalize_rule


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


class DiskRuleLoaderTests(unittest.TestCase):
    def setUp(self):
        self.disk_rule = {
            "rule": {
                "id": 9001,
                "system_id": 9001,
                "name": "High Disk Usage",
                "monitor_type": "disk",
                "priority": "High",
                "severity": "High",
            },
            "targets": [{
                "target_type": "Filesystem / Mount Point",
                "target": "/data",
            }],
            "metrics": [{
                "id": 9001,
                "metric": "Disk Usage (%)",
                "operator": "Greater Than (>)",
                "threshold": 90.0,
                "duration_seconds": 300,
            }],
            "actions": [{
                "action_type": "send-notification",
            }],
            "notifications": [],
            "recovery": [],
        }

    def test_disk_rule_loads_with_target_metric_and_action(self):
        with patch(
            "load_data.user_rules.rule_loader.httpx.get",
            return_value=FakeResponse([self.disk_rule]),
        ) as get:
            rules = load_rules(9001)

        get.assert_called_once_with(
            "http://localhost:8000/get_user_rules",
            params={"system_id": 9001},
        )
        rule = rules[0]
        self.assertEqual(rule["rule"]["monitor_type"], "disk")
        self.assertEqual(rule["rule"]["monitor_source"], "disk")
        self.assertEqual(rule["targets"][0]["target"], "/data")
        self.assertEqual(rule["targets"][0]["mountpoint"], "/data")
        self.assertEqual(rule["metrics"][0]["metric"], "Disk Usage (%)")
        self.assertEqual(rule["metrics"][0]["threshold"], 90.0)
        self.assertEqual(rule["metrics"][0]["operator"], "Greater Than (>)")
        self.assertEqual(rule["metrics"][0]["duration_seconds"], 300)
        self.assertEqual(rule["actions"][0]["action_type"], "send-notification")

    def test_process_rule_is_not_normalized(self):
        process_rule = {
            "rule": {"monitor_type": "process"},
            "targets": [{"target_type": "process", "target": "nginx"}],
            "metrics": [],
            "actions": [],
        }
        self.assertIs(normalize_rule(process_rule), process_rule)


if __name__ == "__main__":
    unittest.main()
