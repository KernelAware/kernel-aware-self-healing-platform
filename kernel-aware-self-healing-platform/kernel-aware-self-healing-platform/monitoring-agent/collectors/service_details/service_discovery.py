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


def recommendation_score(service):
    score = 0

    if service.get("protected", False):
        return 0

    if service.get("active_state") == "active":
        score += 3

    if service.get("sub_state") == "running":
        score += 1

    if service.get("load_state") == "loaded":
        score += 1

    return score