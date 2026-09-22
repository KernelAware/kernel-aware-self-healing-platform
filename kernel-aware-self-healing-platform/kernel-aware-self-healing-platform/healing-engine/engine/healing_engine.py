from engine.action_executor import execute_action
from clients.backend_client import notify_backend

async def heal(action_plan: dict):
    result = await execute_action(action_plan)

    response = {
        "action_id": action_plan["action_id"],
        "system_id": action_plan["system_id"],
        "action": action_plan["type"],
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
