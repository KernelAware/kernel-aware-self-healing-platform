import requests

BACKEND_URL = "http://localhost:8000"


def send_inventory(system_id, items, inventory_type:str):
    response = requests.post(
        f"{BACKEND_URL}/{inventory_type}_inventory",
        json={
            "system_id": system_id,
            inventory_type: items
        },
        timeout=10
    )

    response.raise_for_status()

    return response.json()