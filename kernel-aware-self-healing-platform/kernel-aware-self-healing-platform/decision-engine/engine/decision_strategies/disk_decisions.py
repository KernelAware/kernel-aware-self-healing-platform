from engine.decision_strategies.base_decisions import BaseDecision


class DiskDecision(BaseDecision):
    """Describe a Disk alert decision without planning remediation."""

    def decide(self, incident, rule, policy):
        actions = [
            action.get("action_type")
            for action in rule.get("actions", [])
            if isinstance(action, dict) and action.get("action_type")
        ]
        return {
            "decision": "ALERT_ONLY",
            "Selected_action": "alert" if "alert" in actions else None,
            "all_actions": actions,
            "reason": "Disk incident is informational; no healing action is executed.",
        }
