import requests
from config import BACKEND_URL

def notify_backend(result: dict):
    response = requests.post(
        f"{BACKEND_URL}/healing_results",
        json=result,
        timeout=10,
    )
    response.raise_for_status()
    return response.json()
