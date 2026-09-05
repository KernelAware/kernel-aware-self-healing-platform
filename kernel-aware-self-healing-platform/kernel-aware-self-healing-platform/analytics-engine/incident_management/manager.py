import json
from load_data.redis_connection.redis_connection import redis_client
import requests

DECISION_ENGINE_URL = "http://localhost:8002"


active_incidents = {}

def manage_incidents(incident):

    system_id = incident["system_id"]
    metric_id = incident["violated_metric"]["id"]
    pid = incident["pid"]
    target_name = incident["target"]

    key = f"incident:{system_id}:{metric_id}:{target_name}:{pid}"

    existing_incident = redis_client.get(key)

    if existing_incident is None:
        redis_client.set(
            key,
            json.dumps(incident)
        )

    print(incident)



def send_to_decision_engine(incident: dict):
    response = requests.post(
        f"{DECISION_ENGINE_URL}/incidents",
        json=incident,
        timeout=10,
    )

    response.raise_for_status()

    return response.json()