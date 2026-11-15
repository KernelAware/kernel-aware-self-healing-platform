from engine.decision_strategies.base_decisions import BaseDecision


class CpuDecision(BaseDecision):

    def decide(self, incident, rule, policy):
        actions = [
            action["action_type"]
            for action in rule["actions"]
        ]

        action_decisions = [
            ("require-approval", "WAITING_APPROVAL", "CPU remediation requires approval"),
            ("restart-service", "RESTART", "CPU usage remained above the configured threshold"),
            ("run-automation", "AUTOMATION", "CPU violation requires automation"),
            ("create-incident", "CREATE_INCIDENT", "CPU violation requires incident tracking"),
            ("send-notification", "NOTIFY", "High CPU usage detected"),
        ]

        for action_type, decision, reason in action_decisions:
            if action_type in actions:
                return {
                    "decision": decision,
                    "Selected_action": action_type,
                    "all_actions": actions,
                    "reason": reason,
                }

        return {
            "decision": "NO_ACTION",
            "Selected_action": None,
            "all_actions": actions,
            "reason": "No suitable CPU remediation",
        }