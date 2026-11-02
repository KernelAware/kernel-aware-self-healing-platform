import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from main import evaluate_incident
from policies.policy_checker import check_policy


class DecisionEndpointTests(unittest.TestCase):
    def test_disk_alert_is_permitted_only_when_saved_approval_policy_allows_it(self):
        def rule_with_approval(approval):
            return {
                "rule": {"status": "ENABLED"},
                "actions": [{
                    "action_type": "alert",
                    "approval_required": approval,
                    "allowed_during": "ALWAYS",
                }],
            }

        allowed = check_policy(rule_with_approval("NEVER"))
        approval_required = check_policy(rule_with_approval("ALWAYS"))

        self.assertIs(allowed["allowed"], True)
        self.assertEqual(allowed["actions"], ["alert"])
        self.assertIs(approval_required["allowed"], False)
        self.assertEqual(approval_required["reason"], "Approval required")

    def test_decisions_route_returns_decision_without_planning_actions(self):
        incident = {
            "incident_id": "INC-disk-1",
            "fingerprint": "stable-disk-fingerprint",
            "incident_type": "disk",
            "monitor_type": "disk",
            "rule_id": 12,
            "system_id": 1,
            "severity": "Critical",
            "priority": "P1",
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
        rules = {"rule": {"id": 12, "system_id": 1, "monitor_type": "disk", "status": "ENABLED"}, "actions": []}
        policy = {"allowed": False, "decision": "NO_ACTION", "reason": "No action allowed"}
        decision = {"decision": "NO_ACTION", "action": None}

        with patch("main.load_rules", return_value=rules) as load_rules, \
             patch("main.check_policy", return_value=policy) as check_policy, \
             patch("main.make_decision", return_value=decision) as make_decision, \
             patch("main.create_action_plan", create=True) as create_action_plan:
            response = evaluate_incident(incident)

        load_rules.assert_called_once_with(incident)
        check_policy.assert_called_once_with(rules)
        make_decision.assert_called_once_with(incident, rules, policy)
        create_action_plan.assert_not_called()
        self.assertEqual(response, {
            "outcome": "DENIED",
            "incident_id": incident["incident_id"],
            "fingerprint": incident["fingerprint"],
            "decision": decision,
            "policy": policy,
        })

    def test_disk_incident_uses_alert_only_strategy_but_still_obeys_approval_policy(self):
        incident = {
            "incident_id": "INC-disk-approved-gate",
            "fingerprint": "disk-fingerprint",
            "incident_type": "disk",
            "monitor_type": "disk",
            "rule_id": 12,
            "system_id": 1,
            "severity": "Critical",
            "priority": "P1",
            "target": "Whole System",
            "metric": "disk_read_count",
            "value": 120,
            "violated_metric": {
                "metric": "disk_read_count",
                "operator": "Greater Than (>)",
                "threshold": 50,
            },
        }
        rules = {
            "rule": {"id": 12, "system_id": 1, "monitor_type": "disk", "status": "ENABLED"},
            "actions": [{"action_type": "alert", "approval_required": "ALWAYS"}],
        }
        approval_required = {
            "allowed": False,
            "decision": "WAIT_FOR_APPROVAL",
            "reason": "Approval required",
        }
        with patch("main.load_rules", return_value=rules), \
             patch("main.check_policy", return_value=approval_required):
            response = evaluate_incident(incident)

        self.assertEqual(response["outcome"], "APPROVAL_REQUIRED")
        self.assertIs(response["policy"]["allowed"], False)
        self.assertEqual(response["decision"]["decision"], "ALERT_ONLY")
        self.assertNotIn("No decision strategy available", response["decision"]["reason"])

    def test_disk_alert_only_strategy_returns_permitted_contract_when_policy_allows(self):
        incident = {
            "incident_id": "INC-disk-permitted",
            "fingerprint": "disk-fingerprint-permitted",
            "monitor_type": "disk",
            "rule_id": 12,
            "system_id": 1,
            "severity": "Critical",
            "priority": "P1",
            "target": "Whole System",
            "metric": "disk_read_count",
            "value": 120,
            "violated_metric": {"metric": "disk_read_count", "operator": ">", "threshold": 50},
        }
        rules = {
            "rule": {"id": 12, "system_id": 1, "monitor_type": "disk", "status": "ENABLED"},
            "actions": [{"action_type": "alert"}],
        }
        allowed = {"allowed": True, "decision": "EXECUTE", "actions": ["alert"]}
        with patch("main.load_rules", return_value=rules), patch("main.check_policy", return_value=allowed):
            response = evaluate_incident(incident)

        self.assertEqual(response["outcome"], "PERMITTED")
        self.assertIs(response["policy"]["allowed"], True)
        self.assertEqual(response["decision"]["decision"], "ALERT_ONLY")

    def test_missing_rule_is_reported_as_invalid_rule(self):
        incident = {
            "incident_id": "INC-invalid-rule",
            "fingerprint": "fp-invalid-rule",
            "rule_id": 155,
            "system_id": 1,
            "monitor_type": "disk",
            "target": "Whole System",
            "metric": "disk_read_count",
            "value": 100,
            "severity": "Critical",
            "priority": "P1",
            "violated_metric": {"metric": "disk_read_count", "operator": ">", "threshold": 50},
        }
        with patch("main.load_rules", side_effect=ValueError("Rule does not exist")):
            with self.assertLogs("main", level="WARNING") as captured:
                with self.assertRaises(HTTPException) as raised:
                    evaluate_incident(incident)

        self.assertEqual(raised.exception.status_code, 422)
        self.assertEqual(raised.exception.detail, {"outcome": "INVALID_RULE"})
        self.assertIn("rule_id=155", captured.output[0])

    def test_rule_service_failure_is_logged_and_returned_as_503(self):
        from unittest.mock import MagicMock

        incident = {
            "incident_id": "INC-decision-service-error",
            "fingerprint": "fp-decision-service-error",
            "rule_id": 12,
            "system_id": 1,
            "monitor_type": "disk",
            "target": "Whole System",
            "metric": "disk_read_count",
            "value": 100,
            "severity": "Critical",
            "priority": "P1",
            "violated_metric": {"metric": "disk_read_count", "operator": ">", "threshold": 50},
        }
        upstream = MagicMock()
        upstream.status_code = 503
        upstream.text = '{"detail":"database unavailable"}'
        error = RuntimeError("rule service unavailable")
        error.response = upstream
        with patch("main.load_rules", side_effect=error):
            with self.assertLogs("main", level="ERROR") as captured:
                with self.assertRaises(HTTPException) as raised:
                    evaluate_incident(incident)

        self.assertEqual(raised.exception.status_code, 503)
        self.assertIn("upstream_status=503", captured.output[0])
        self.assertIn("database unavailable", captured.output[0])


if __name__ == "__main__":
    unittest.main()
