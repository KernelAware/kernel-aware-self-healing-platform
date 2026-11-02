import os

import httpx

BACKEND_URL = os.environ.get("KAISP_BACKEND_URL", "http://localhost:8000").rstrip("/")

def load_rules(incident: dict) -> dict:
    rule_id = incident["rule_id"]

    response = httpx.get(
        f"{BACKEND_URL}/get_user_rule",
        params={"rule_id": rule_id},
        timeout=5.0,
    )

    response.raise_for_status()
    rule = response.json()

    if not isinstance(rule, list) or not rule:
        raise ValueError("Rule does not exist")
    return rule[0]
