import os
import requests


def send_to_healing_engine(action_plan):
    base_url = os.getenv("HEALING_ENGINE_URL")
    if not base_url:
        return {"status": "NOT_SENT", "reason": "HEALING_ENGINE_URL is not configured"}

    response = requests.get(
        f"{base_url.rstrip('/')}/heal",
        params=action_plan,
        timeout=10,
    )
    response.raise_for_status()
    return response.json()