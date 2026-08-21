import uuid
import requests

DECISION_ENGINE_URL = "http://localhost:8002"


active_incidents = {}


def manage_incidents(incidents: list):
    results = []

    for incident in incidents:

        incident_key = (
            incident["target"],
            incident["type"]
        )

        if incident_key in active_incidents:

            active_incidents[incident_key]["occurrences"] += 1

            results.append(
                active_incidents[incident_key]
            )

            continue

        new_incident = {
            "id": str(uuid.uuid4()),
            "type": incident["type"],
            "severity": incident["severity"],
            "target": incident["target"],
            "message": incident.get("message", ""),
            "status": "OPEN",
            "occurrences": 1,
        }

        active_incidents[incident_key] = new_incident
        send_to_decision_engine(new_incident)
        results.append(new_incident)

    return results


def send_to_decision_engine(incident: dict):
    response = requests.post(
        f"{DECISION_ENGINE_URL}/incidents",
        json=incident,
        timeout=10,
    )

    response.raise_for_status()

    return response.json()