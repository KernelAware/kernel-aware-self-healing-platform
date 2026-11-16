import psutil
import time

from collectors.process_details.process_discovery import (
    find_service_by_pid,
    recommendation_score
)


def get_processes():
    processes = []

    for proc in psutil.process_iter([
        "pid",
        "name",
        "cpu_percent",
        "memory_percent",
        "create_time",
        "status"
    ]):
        try:
            info = proc.info

            process = {
                "pid": info["pid"],
                "name": info["name"],
                "cpu_percent": info["cpu_percent"] or 0,
                "memory_percent": info["memory_percent"] or 0,
                "uptime": time.time() - info["create_time"],
                "status": info["status"],
                "service": find_service_by_pid(info["pid"]),
                "protected": False
            }

            score = recommendation_score(process)

            process["recommendation_score"] = score
            process["recommended"] = score >= 3

            processes.append(process)

        except (
            psutil.NoSuchProcess,
            psutil.AccessDenied
        ):
            continue

    return processes