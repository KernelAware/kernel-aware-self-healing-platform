from engine.decision_strategies.base_decisions import BaseDecision


class DiskDecision(BaseDecision):
    def decide(self, incident, rule, policy):
        actions = [action["action_type"] for action in rule.get("actions", [])]
        metric = incident.get("violated_metric", {}).get("metric")
        for action in ("run-automation", "run-command", "send-notification", "alert"):
            if action in actions:
                decision = "AUTOMATION" if action == "run-automation" else "NOTIFY" if action in ("send-notification", "alert") else "COMMAND"
                return {"decision": decision, "Selected_action": action, "actions": actions, "all_actions": actions, "reason": f"Disk condition violated for {metric}"}
        return {"decision": "NO_ACTION", "Selected_action": None, "actions": actions, "all_actions": actions, "reason": "No supported Disk remediation action"}