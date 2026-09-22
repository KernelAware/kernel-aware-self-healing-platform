from ansible.ansible_runner import run_playbook

PLAYBOOKS = {
    "restart-service": "ansible/playbooks/restart_service.yml",
    "start-service": "ansible/playbooks/start_service.yml",
    "stop-service": "ansible/playbooks/stop_service.yml",
}

async def execute_service_action(action_plan: dict):
    action_type = action_plan["type"]
    service = action_plan.get("target")

    if not service:
        return {"success": False, "status": "FAILED", "reason": "Service is required"}

    return run_playbook(
        PLAYBOOKS[action_type],
        {
            "target_host": f"system_{action_plan['system_id']}",
            "service_name": service,
        },
    )
