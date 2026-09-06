import httpx

BACKEND_URL = "http://localhost:8000"

def load_rules(incident: dict) -> dict:
    rule_id = incident["rule_id"]

    response = httpx.get(
        f"{BACKEND_URL}/get_user_rule",
        params={"rule_id": rule_id}
    )

    response.raise_for_status()

    return response.json()