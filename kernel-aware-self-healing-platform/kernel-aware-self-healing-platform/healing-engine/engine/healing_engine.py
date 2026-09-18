from engine.action_executor import execute_action
from verification.verifier import verify_result
from clients.backend_client import notify_backend

async def heal(action_plan: dict):
    result = await execute_action(action_plan)
    verification = verify_result(action_plan, result)

    response = {
        "action_id": action_plan["action_id"],
        "system_id": action_plan["system_id"],
        "action": action_plan["type"],
        "execution": result,
        "verification": verification,
        "status": "RESOLVED" if verification["success"] else "FAILED",
    }

    # Backend notification failure should not hide the execution result.
    try:
        notify_backend(response)
    except Exception as exc:
        response["backend_notification"] = {
            "status": "FAILED",
            "reason": str(exc),
        }

    return response
