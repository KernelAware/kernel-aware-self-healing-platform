from action_planner.send_decisions.backend import notify_backend , save_incident
from action_planner.send_decisions.healing_engine import send_to_healing_engine
import uuid

operator_map = {
    "Greater Than (>)": ">",
    "Less Than (<)": "<",
    "Greater Than or Equal (>=)": ">=",
    "Less Than or Equal (<=)": "<=",
    "Equal (=)": "=",
    "Not Equal (!=)": "!="
}

def create_action_plan(decision, incident, rules, policy):


    if not policy["allowed"]:
        incident_detail, alert = create_alert(
            decision,
            incident,
            rules,
            policy
        )

        if policy["reason"] != "Rule is disabled":
            dash_board_alert = {}

            notify_backend(incident_detail,alert)
            save_incident(dash_board_alert)

        return {
            "status": "BLOCKED",
            "reason": policy["reason"]
        }

    else:
        action_plan = {
            "action_id": f'action-{incident["rule_id"]}',
            "type": decision["actions"],
            "system_id": incident["system_id"],
            "target": incident.get("target"),
            "service": incident.get("target"),
            "pid": incident.get("pid"),
        }

        send_to_healing_engine(action_plan)

        return {
            "status": "SENT",
            "action_plan": action_plan
        }


def create_alert(decision, incident, rules, policy):
    print("incident")
    print(incident)
    print("")
    print("")
    print("decision")
    print(decision)
    print("")
    print("")
    print("rules")
    print(rules)
    print("")
    print("")
    print("incident")
    print(incident)
    print("")
    print("")
    print("policy")
    print(policy)
    print("")
    print("")

    incident_id = f"INC-{uuid.uuid4().hex[:8].upper()}"
    system = incident.get("system_id", "Unknown")
    process = incident.get("target", "Unknown")
    pid = incident.get("pid")

    metric = incident["violated_metric"]["metric"]
    current_value = incident.get("value", 0)
    threshold = incident.get("violated_metric", 0).get("threshold")
    operator = incident.get("violated_metric", 0).get("operator")
    duration = incident.get("violated_metric", 0).get("duration_seconds")

    severity = incident.get("severity", "Medium")
    priority = incident.get("priority", "P2")

    recommended_action = decision.get("Selected_action", "No Decision")
    decision_type = decision.get("decision", "NO_ACTION")
    decision_reason = decision.get("reason", "No reason provided")

    automatic_execution = rules["actions"][0]["automatic_execution"]
    approval_required = policy.get("reason", False) == "Approval required"

    if automatic_execution and not approval_required:
        status = "HEALING"
        operator_required = False

    elif approval_required:
        status = "WAITING_APPROVAL"
        operator_required = True

    else:
        status = "OPEN"
        operator_required = False

    allowed_actions = []

    for action in rules.get("actions", []):
        action_type = action.get("action_type")

        if action_type:
            allowed_actions.append(action_type)

    incident_detail = {

        "id": incident_id,

        "title": f"{metric} - {process}",

        "priority": priority,
        "severity": severity,

        "system": f"server-{int(system):02d}",
        "process": process,
        "pid": pid,

        "detectedAgo": "now",

        "trigger": {
            "metric": metric,
            "currentValue": round(float(current_value), 1),
            "operator": operator_map.get(operator, operator),
            "threshold": threshold,
            "duration": format_duration(duration)
        },

        "decision": {
            "recommendedAction": recommended_action,
            "decision": decision_type,
            "reason": decision_reason
        },

        "policy": {
            "ruleEnabled": rules.get("rule", True).get("status", True),
            "automaticExecution": automatic_execution,
            "approvalRequired": approval_required,
            "cooldownPassed": policy.get("cooldown_passed", False)
        },

        "rootCause": {
            "verified": incident.get("root_cause_verified", False),
            "source": incident.get("root_cause_source", "System Telemetry"),
            "traceId": incident.get("trace_id"),
            "traceName": incident.get("trace_name", "Unknown"),
            "timeline": incident.get("timeline", [])
        },

        "operatorAction": {
            "required": operator_required,

            "message": (
                "Review the recommendation and select an approved remediation action."
                if operator_required
                else "Automatic remediation is allowed by policy."
            ),

            "recommendedAction": recommended_action,

            "allowedActions": allowed_actions,

            "selectedAction": recommended_action,

            "reason": decision_reason
        },

        "status": status
    }

    tone_map = {
        "Critical": "danger",
        "High": "warning",
        "Medium": "muted",
        "Low": "muted"
    }

    alert = {

        "id": incident_id,

        "level": f"{priority} - {severity}",

        "tone": tone_map.get(severity, "muted"),

        "age": "now",

        "title": f"{metric} - {process}",

        "body": (
            f"{metric} reached {current_value}, "
            f"{operator} threshold {threshold} "
            f"for {duration}."
        ),

        "acked": False,

        "status": status,

        "system": system,

        "process": process,

        "pid": pid
    }

    return incident_detail, alert

def format_duration(seconds):
    seconds = int(seconds)

    if seconds < 60:
        return f"{seconds} seconds"

    if seconds < 3600:
        minutes = seconds / 60
        return f"{minutes:.1f} minutes"

    hours = seconds / 3600
    return f"{hours:.1f} hours"