import subprocess
from config import ANSIBLE_INVENTORY

def run_playbook(playbook: str, extra_vars: dict):
    command = [
        "ansible-playbook",
        "-i",
        ANSIBLE_INVENTORY,
        playbook,
    ]

    for key, value in extra_vars.items():
        command.extend(["-e", f"{key}={value}"])

    try:
        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )

        return {
            "success": completed.returncode == 0,
            "status": "SUCCESS" if completed.returncode == 0 else "FAILED",
            "return_code": completed.returncode,
            "stdout": completed.stdout,
            "stderr": completed.stderr,
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "status": "FAILED",
            "reason": "Ansible execution timed out",
        }
