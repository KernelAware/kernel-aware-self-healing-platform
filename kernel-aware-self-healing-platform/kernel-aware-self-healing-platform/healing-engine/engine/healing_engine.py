from engine.action_executor import execute_action
from clients.backend_client import notify_backend

async def heal(action_plan: dict):
    print(action_plan)
    result = await execute_action(action_plan)

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
