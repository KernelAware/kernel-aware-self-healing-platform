from executors.service_executor import execute_service_action
from executors.process_executor import execute_process_action
from executors.command_executor import execute_command_action
from executors.automation_executor import execute_automation_action
from executors.notification_executor import execute_notification_action

async def execute_action(action_plan: dict):
    action_type = action_plan["type"]

    if action_type in {"restart-service", "start-service", "stop-service"}:
        return await execute_service_action(action_plan)

    if action_type == "kill-process":
        return await execute_process_action(action_plan)

    if action_type == "run-command":
        return await execute_command_action(action_plan)

    if action_type == "run-automation":
        return await execute_automation_action(action_plan)

    if action_type == "send-notification":
        return await execute_notification_action(action_plan)

    return {
        "success": False,
        "status": "FAILED",
        "reason": f"Unsupported action: {action_type}",
    }
