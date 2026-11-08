from ansible_runner import run_playbook

PLAYBOOKS = {
    "restart-service": "ansible_playbooks/playbooks/restart_service.yml",
    "start-service": "ansible_playbooks/playbooks/start_service.yml",
    "stop-service": "ansible_playbooks/playbooks/stop_service.yml",
}

async def execute_service_action(action_plan: dict):
    action = action_plan["action"]
    service = action_plan["target"].split(".")[0]

    if not service:
        return {"success": False, "status": "FAILED", "reason": "Service is required"}

    playbook_data = {
        "target_host": f"system_{action_plan['system_id']}",
        "service_name": service,
    }

    script_content = action_plan.get("script") or action_plan.get("script_content")
    if script_content:
        playbook_data["script_content"] = script_content

    return run_playbook(
        PLAYBOOKS[action],
        playbook_data,
    )
