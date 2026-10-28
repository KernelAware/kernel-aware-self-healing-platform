from ansible_runner import run_playbook


async def execute_script_action(action_plan: dict):
    script_content = action_plan.get("script_content")

    if not script_content:
        return {
            "success": False,
            "status": "FAILED",
            "reason": "Script content is required",
        }

    return run_playbook(
        "ansible_playbooks/playbooks/run_script.yml",
        {
            "target_host": f"system_{action_plan['system_id']}",
            "script_content": script_content,
        },
    )