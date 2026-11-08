from engine.decision_strategies.base_decisions import BaseDecision


class ServiceDecision(BaseDecision):

    def decide(self, incident, rule, policy):
        metric = incident["violated_metric"]["metric"]
        incident_type = incident.get("incident_type")

        actions = [
            action["action_type"]
            for action in rule["actions"]
        ]

        if incident_type == "SERVICE_DOWN":

            if "start-service" in actions:
                return {
                    "decision": "START",
                    "Selected_action": "start-service",
                    "all_actions": actions,
                    "reason": "Required service is not running"
                }

            if "run-automation" in actions:
                return {
                    "decision": "AUTOMATION",
                    "Selected_action": "run-automation",
                    "all_actions": actions,
                    "reason": "Service recovery requires automation"
                }

            if "send-notification" in actions:
                return {
                    "decision": "NOTIFY",
                    "Selected_action": "send-notification",
                    "all_actions": actions,
                    "reason": "Service is down"
                }


        if metric == "CPU Usage (%)":

            if "restart-service" in actions:
                return {
                    "decision": "RESTART",
                    "Selected_action": "restart-service",
                    "all_actions": actions,
                    "reason": "High service CPU usage"
                }

            if "run-automation" in actions:
                return {
                    "decision": "AUTOMATION",
                    "Selected_action": "run-automation",
                    "all_actions": actions,
                    "reason": "High service CPU usage requires automation"
                }

            if "send-notification" in actions:
                return {
                    "decision": "NOTIFY",
                    "Selected_action": "send-notification",
                    "all_actions": actions,
                    "reason": "High service CPU usage detected"
                }

        if metric == "Memory Usage (%)":

            if "restart-service" in actions:
                return {
                    "decision": "RESTART",
                    "Selected_action": "restart-service",
                    "all_actions": actions,
                    "reason": "High service memory usage"
                }

            if "run-automation" in actions:
                return {
                    "decision": "AUTOMATION",
                    "Selected_action": "run-automation",
                    "all_actions": actions,
                    "reason": "High service memory usage requires automation"
                }

            if "send-notification" in actions:
                return {
                    "decision": "NOTIFY",
                    "Selected_action": "send-notification",
                    "all_actions": actions,
                    "reason": "High service memory usage detected"
                }

        if metric in [
            "Disk Usage (Bytes)",
            "Disk Usage (%)",
            "Disk Read",
            "Disk Write"
        ]:

            if "run-automation" in actions:
                return {
                    "decision": "AUTOMATION",
                    "Selected_action": "run-automation",
                    "all_actions": actions,
                    "reason": "Service disk violation requires automation"
                }

            if "send-notification" in actions:
                return {
                    "decision": "NOTIFY",
                    "Selected_action": "send-notification",
                    "all_actions": actions,
                    "reason": "Abnormal service disk usage detected"
                }

        if metric == "Service Uptime":

            if "restart-service" in actions:
                return {
                    "decision": "RESTART",
                    "Selected_action": "restart-service",
                    "all_actions": actions,
                    "reason": "Service uptime violation detected"
                }

            if "run-automation" in actions:
                return {
                    "decision": "AUTOMATION",
                    "Selected_action": "run-automation",
                    "all_actions": actions,
                    "reason": "Service uptime violation requires automation"
                }

            if "send-notification" in actions:
                return {
                    "decision": "NOTIFY",
                    "Selected_action": "send-notification",
                    "all_actions": actions,
                    "reason": "Service uptime violation detected"
                }

        return {
            "decision": "NO_ACTION",
            "Selected_action": None,
            "all_actions": actions,
            "reason": "No suitable service remediation"
        }