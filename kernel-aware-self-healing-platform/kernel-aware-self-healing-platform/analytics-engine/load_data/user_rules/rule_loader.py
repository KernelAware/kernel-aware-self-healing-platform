import httpx

BACKEND_URL = "http://localhost:8000"

def load_rules(system_id):
    response = httpx.get(
        f"{BACKEND_URL}/get_user_rules",
        params={"system_id": system_id}
    )

    response.raise_for_status()

    return response.json()