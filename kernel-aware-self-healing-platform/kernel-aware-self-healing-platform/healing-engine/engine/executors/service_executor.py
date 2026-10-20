from ansible_runner import run_playbook

PLAYBOOKS = {
    "restart_service": "ansible_playbooks/playbooks/restart_service.yml",
    "start_service": "ansible_playbooks/playbooks/start_service.yml",
    "stop_service": "ansible_playbooks/playbooks/stop_service.yml",
}

async def execute_service_action(action_plan: dict):
    action = action_plan["action"]
    service = action_plan.get("target")

    if not service:
        return {"success": False, "status": "FAILED", "reason": "Service is required"}

    return run_playbook(
        PLAYBOOKS[action],
        {
            "target_host": f"system_{action_plan['system_id']}",
            "service_name": service,
        },
    )
