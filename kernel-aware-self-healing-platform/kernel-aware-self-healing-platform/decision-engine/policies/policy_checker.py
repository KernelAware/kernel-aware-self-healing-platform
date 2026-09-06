def check_policy(rule):

    if rule["rule"]["status"] != "ENABLED":
        return {
            "allowed": False,
            "decision": "NO_ACTION",
            "reason": "Rule is disabled"
        }

    allowed_actions = []

    for action in rule["actions"]:
        allowed_actions.append(action["action_type"])

    for action in rule["actions"]:

        if not action["automatic_execution"]:
            continue

        if action["approval_required"] == "ALWAYS":
            return {
                "allowed": False,
                "decision": "WAIT_FOR_APPROVAL",
                "reason": "Approval required",
                "action": allowed_actions
            }

        if action["allowed_during"] == "maintenance-only":
            return {
                "allowed": False,
                "decision": "WAIT_FOR_MAINTENANCE",
                "reason": "Action allowed only during maintenance",
                "action": allowed_actions
            }

    if not allowed_actions:
        return {
            "allowed": False,
            "decision": "NO_ACTION",
            "reason": "No action allowed"
        }

    return {
        "allowed": True,
        "decision": "EXECUTE",
        "actions": allowed_actions
    }