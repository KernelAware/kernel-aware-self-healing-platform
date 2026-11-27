
from engine.decision_strategies.base_decisions import BaseDecision


class MemoryDecision(BaseDecision):

    def decide(self, incident, rule, policy):
        actions = [
            action["action_type"]
            for action in rule.get("actions", [])
        ]

        if "alert" in actions or "send-notification" in actions:
            return {
                "decision": "NOTIFY",
                "Selected_action": "send-notification",
                "all_actions": actions,
                "reason": "High system memory usage detected"
            }

        return {
            "decision": "NO_ACTION",
            "Selected_action": None,
            "all_actions": actions,
            "reason": "No alert or notification action configured"
        }
