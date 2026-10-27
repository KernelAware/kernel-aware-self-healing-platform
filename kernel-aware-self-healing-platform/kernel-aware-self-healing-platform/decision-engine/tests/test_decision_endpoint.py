import sys
import unittest
from pathlib import Path
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from main import evaluate_incident


class DecisionEndpointTests(unittest.TestCase):
    def test_decisions_route_returns_decision_without_planning_actions(self):
        incident = {
            "incident_id": "INC-disk-1",
            "fingerprint": "stable-disk-fingerprint",
            "incident_type": "disk",
            "monitor_type": "disk",
            "rule_id": 12,
            "system_id": 1,
            "target": "/mnt/data",
            "metric": "disk_usage_percent",
            "value": 92,
            "violated_metric": {
                "metric": "disk_usage_percent",
                "operator": "Greater Than (>)",
                "threshold": 80,
                "duration_seconds": 30,
            },
        }
        rules = {"rule": {"id": 12}, "actions": []}
        policy = {"allowed": False, "decision": "NO_ACTION"}
        decision = {"decision": "NO_ACTION", "action": None}

        with patch("main.load_rules", return_value=rules) as load_rules, \
             patch("main.check_policy", return_value=policy) as check_policy, \
             patch("main.make_decision", return_value=decision) as make_decision, \
             patch("main.create_action_plan") as create_action_plan:
            response = evaluate_incident(incident)

        load_rules.assert_called_once_with(incident)
        check_policy.assert_called_once_with(rules)
        make_decision.assert_called_once_with(incident, rules, policy)
        create_action_plan.assert_not_called()
        self.assertEqual(response, {
            "incident": incident,
            "decision": decision,
            "policy": policy,
        })


if __name__ == "__main__":
    unittest.main()
