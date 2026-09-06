from engine.decision_strategies.base_decisions import BaseDecision


class ProcessDecision(BaseDecision):

    def decide(self, incident, rule, policy):

        metric = incident["violated_metric"]["metric"]
        incident_type = incident.get("incident_type")

        actions = [
            action["action_type"]
            for action in rule["actions"]
        ]

        if incident_type in ["PROCESS_DOWN", "SERVICE_DOWN"]:

            if "start-service" in actions:
                return {
                    "decision": "START",
                    "Selected_action": "start-service",
                    "all_actions": actions,
                    "reason": "Required process or service is not running"
                }

            if "send-notification" in actions:
                return {
                    "decision": "NOTIFY",
                    "Selected_action": "send-notification",
                    "all_actions": actions,
                    "reason": "Process or service is down"
                }
        print(metric)
        if metric == "CPU Usage (%)":

            if "restart-service" in actions:
                return {
                    "decision": "RESTART",
                    "Selected_action": "restart-service",
                    "all_actions": actions,
                    "reason": "High process CPU usage"
                }

            if "run-automation" in actions:
                return {
                    "decision": "AUTOMATION",
                    "Selected_action": "run-automation",
                    "all_actions": actions,
                    "reason": "CPU violation requires remediation automation"
                }

            if "send-notification" in actions:
                return {
                    "decision": "NOTIFY",
                    "Selected_action": "send-notification",
                    "all_actions": actions,
                    "reason": "High CPU usage detected"
                }

        if metric == "Memory Usage (%)":

            if "restart-service" in actions:
                return {
                    "decision": "RESTART",
                    "Selected_action": "restart-service",
                    "all_actions": actions,
                    "reason": "High process memory usage"
                }

            if "run-automation" in actions:
                return {
                    "decision": "AUTOMATION",
                    "Selected_action": "run-automation",
                    "all_actions": actions,
                    "reason": "Memory violation requires remediation automation"
                }

            if "send-notification" in actions:
                return {
                    "decision": "NOTIFY",
                    "Selected_action": "send-notification",
                    "all_actions": actions,
                    "reason": "High memory usage detected"
                }

        if metric in [
            "Disk Read",
            "Disk Write",
            "Disk Usage (%)"
        ]:

            if "run-automation" in actions:
                return {
                    "decision": "AUTOMATION",
                    "Selected_action": "run-automation",
                    "all_actions": actions,
                    "reason": "Disk violation requires remediation automation"
                }

            if "send-notification" in actions:
                return {
                    "decision": "NOTIFY",
                    "Selected_action": "send-notification",
                    "all_actions": actions,
                    "reason": "High disk activity detected"
                }

        if metric == "Thread Count":

            if "restart-service" in actions:
                return {
                    "decision": "RESTART",
                    "Selected_action": "restart-service",
                    "all_actions": actions,
                    "reason": "Process thread count is too high"
                }

            if "send-notification" in actions:
                return {
                    "decision": "NOTIFY",
                    "Selected_action": "send-notification",
                    "all_actions": actions,
                    "reason": "High thread count detected"
                }

        if metric == "Open Files":

            if "restart-service" in actions:
                return {
                    "decision": "RESTART",
                    "Selected_action": "restart-service",
                    "all_actions": actions,
                    "reason": "Process open file count is too high"
                }

            if "send-notification" in actions:
                return {
                    "decision": "NOTIFY",
                    "Selected_action": "send-notification",
                    "all_actions": actions,
                    "reason": "High open file count detected"
                }

        return {
            "decision": "NO_ACTION",
            "Selected_action": None,
            "all_actions": actions,
            "reason": "No suitable process remediation"
        }