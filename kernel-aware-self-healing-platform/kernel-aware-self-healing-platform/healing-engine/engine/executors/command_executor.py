# Keep command execution allow-listed. Never execute arbitrary user input.
ALLOWED_COMMANDS = {
    "disk-usage": ["df", "-h"],
    "memory-usage": ["free", "-m"],
}

async def execute_command_action(action_plan: dict):
    command_name = action_plan.get("target")

    if command_name not in ALLOWED_COMMANDS:
        return {
            "success": False,
            "status": "BLOCKED",
            "reason": "Command is not in the allow-list",
        }

    # This starter intentionally does not run arbitrary shell commands.
    return {
        "success": True,
        "status": "SIMULATED",
        "command": ALLOWED_COMMANDS[command_name],
    }
