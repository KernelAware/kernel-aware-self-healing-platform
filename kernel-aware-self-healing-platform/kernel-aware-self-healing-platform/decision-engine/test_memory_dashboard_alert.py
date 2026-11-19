
from unittest.mock import patch, Mock

from rules.rule_loader import load_rules
from policies.policy_checker import check_policy
from engine.decision import make_decision
from action_planner.actions import create_action_plan

incident = {
    "rule_id": 119,
    "system_id": 1,
    "incident_type": "memory",
    "severity": "high",
    "priority": "Medium",
    "target": "host.docker.internal:8001",
    "pid": None,
    "violated_metric": {
        "id": 106,
        "metric": "system_memory_usage_percent",
        "operator": "Greater Than (>)",
        "threshold": 50.0,
        "duration_seconds": 10
    },
    "value": 61.2
}

rule = load_rules(incident)
policy = check_policy(rule)
decision = make_decision(incident, rule, policy)

with patch("action_planner.actions.notify_backend") as mock_notify, \
     patch("action_planner.actions.save_incident") as mock_save, \
     patch("action_planner.actions.send_to_healing_engine") as mock_healing:

    result = create_action_plan(decision, incident, rule, policy)

    assert mock_notify.called, "Dashboard notification was not requested"
    assert mock_save.called, "Incident was not saved through save_incident"
    mock_healing.assert_not_called()

    incident_detail, alert = mock_notify.call_args.args

    assert alert["rule_id"] == 119
    assert alert["status"] == "WAITING_APPROVAL"
    assert incident_detail["policy"]["approvalRequired"] is True

    print("PASS: Dashboard notification was requested.")
    print("PASS: Alert is marked as waiting for approval.")
    print("PASS: Healing engine was not called.")
    print("Action-plan result:", result)
    print("Alert payload:", alert)
