import re


def find_service_by_pid(pid):
    try:
        with open(f"/proc/{pid}/cgroup", "r") as file:
            content = file.read()

        match = re.search(r"([^/]+\.service)", content)

        if match:
            return match.group(1)

    except (
        FileNotFoundError,
        PermissionError,
        ProcessLookupError
    ):
        pass

    return None


def recommendation_score(process):
    score = 0

    if process["protected"]:
        return 0

    if process.get("service"):
        score += 3

    if process.get("uptime", 0) > 300:
        score += 1

    if process.get("memory_percent", 0) > 1:
        score += 1

    if process.get("cpu_percent", 0) > 1:
        score += 1

    return score