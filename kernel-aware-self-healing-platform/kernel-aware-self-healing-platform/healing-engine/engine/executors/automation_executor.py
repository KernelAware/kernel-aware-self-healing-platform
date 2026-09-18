from ansible.ansible_runner import run_playbook

async def execute_automation_action(action_plan: dict):
    return run_playbook(
        "ansible/playbooks/run_automation.yml",
        {
            "target_host": f"system_{action_plan['system_id']}",
            "automation_name": action_plan.get("target", "health_check"),
        },
    )
