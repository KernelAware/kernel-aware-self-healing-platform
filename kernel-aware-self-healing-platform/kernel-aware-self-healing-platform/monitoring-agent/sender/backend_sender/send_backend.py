import requests

BACKEND_URL = "http://localhost:8000"


def send_process_inventory(system_id, processes):
    response = requests.post(
        f"{BACKEND_URL}/process_inventory",
        json={
            "system_id": system_id,
            "processes": processes
        },
        timeout=10
    )

    response.raise_for_status()

    return response.json()