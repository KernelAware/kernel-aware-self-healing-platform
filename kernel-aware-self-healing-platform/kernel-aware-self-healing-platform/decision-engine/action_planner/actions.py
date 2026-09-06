from action_planner.send_decisions.backend import notify_backend , save_incident
from action_planner.send_decisions.healing_engine import send_to_healing_engine


def create_action_plan(decision, incident, rules, policy):

    if not policy["allowed"]:

        if policy["reason"] != "Rule is disabled":
            dash_board_alert = {}

            notify_backend(dash_board_alert)
            save_incident(dash_board_alert)

        return {
            "status": "BLOCKED",
            "reason": policy["reason"]
        }

    else:
        dash_board_alert = {}

        notify_backend(dash_board_alert)
        save_incident(dash_board_alert)

        action_plan = {
            "action_id": f'action-{incident["rule_id"]}',
            "type": decision["action"],
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