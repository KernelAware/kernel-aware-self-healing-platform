from engine.executors.service_executor import execute_service_action
from engine.executors.process_executor import execute_process_action
from engine.executors.command_executor import execute_command_action
from engine.executors.automation_executor import execute_automation_action
from engine.executors.notification_executor import execute_notification_action

async def execute_action(action_plan: dict):
    action = action_plan["action"]
    print(action)

    if action in {"restart_service", "start_service", "stop_service"}:
        return await execute_service_action(action_plan)

    if action == "kill-process":
        return await execute_process_action(action_plan)

    if action == "run-command":
        return await execute_command_action(action_plan)

    if action == "run-automation":
        return await execute_automation_action(action_plan)

    if action == "send-notification":
        return await execute_notification_action(action_plan)

    return {
        "success": False,
        "status": "FAILED",
        "reason": f"Unsupported action: {action}",
    }
