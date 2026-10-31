from clients.backend_client import notify_backend
from engine.executors.service_executor import execute_service_action
from engine.executors.process_executor import execute_process_action
from engine.executors.command_executor import execute_command_action
from engine.executors.automation_executor import execute_automation_action
from engine.executors.notification_executor import execute_notification_action
from engine.executors.script_executor import execute_script_action

async def execute_action(action_plan: dict):
    action = action_plan["action"]
    incident_type = action_plan["category"]

    if action == "run-command":
        return await execute_command_action(action_plan)

    if action == "run-automation":
        return await execute_automation_action(action_plan)

    if action == "send-notification":
        return await execute_notification_action(action_plan)

    if action == "run-script":
        return await execute_script_action(action_plan)

    if incident_type == 'process':
        return await execute_process_action(action_plan)

    if incident_type == 'service':
        return await execute_service_action(action_plan)

    return {
        "success": False,
        "status": "FAILED",
        "reason": f"Unsupported action: {action}",
    }


async def heal(action_plan: dict):
    print(action_plan)
    result = await execute_action(action_plan)
    print(result)

    response = {
        "system_id": action_plan["system_id"],
        "action": action_plan["action"],
        "execution": result,
    }

    try:
        notify_backend(response)
    except Exception as exc:
        response["backend_notification"] = {
            "status": "FAILED",
            "reason": str(exc),
        }

    return response
