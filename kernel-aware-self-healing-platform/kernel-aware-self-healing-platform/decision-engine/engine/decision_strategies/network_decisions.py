
from engine.decision_strategies.base_decisions import BaseDecision


class NetworkDecision(BaseDecision):

    def decide(self, incident, rule, policy):

        actions = [
            action["action_type"]
            for action in rule.get("actions", [])
        ]

        action_decisions = [
            (
                "alert",
                "NOTIFY",
                "Network metric violation detected",
            ),
            (
                "send-notification",
                "NOTIFY",
                "Network violation requires notification",
            ),
            (
                "create-incident",
                "CREATE_INCIDENT",
                "Network violation requires incident tracking",
            ),
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
            "reason": "No suitable network alert action configured",
        }
