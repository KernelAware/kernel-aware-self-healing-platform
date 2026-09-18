from ansible.ansible_runner import run_playbook

async def execute_process_action(action_plan: dict):
    pid = action_plan.get("pid")
    if not pid:
        return {"success": False, "status": "FAILED", "reason": "PID is required"}

    return run_playbook(
        "ansible/playbooks/kill_process.yml",
        {
            "target_host": f"system_{action_plan['system_id']}",
            "process_pid": int(pid),
        },
    )
