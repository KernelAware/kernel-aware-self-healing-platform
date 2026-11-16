import json
import uuid
from unittest.mock import Mock, patch

import requests

from incident_management.manager import (
    DECISION_ENGINE_URL,
    incident_fingerprint,
    manage_incidents,
)
from load_data.redis_connection.redis_connection import redis_client


# Unique target prevents collision with existing incidents.
unique_id = uuid.uuid4().hex
target = f"web-02-integration-{unique_id}"

incident = {
    "rule_id": 119,
    "system_id": 3,
    "monitor_type": "memory",
    "target_type": "Host",
    "target": target,
    "pid": None,
    "metric": "system_memory_usage_percent",
    "severity": "high",
    "priority": "Medium",
    "value": 95.0,
    "violated_metric": {
        "id": 106,
        "metric": "system_memory_usage_percent",
        "operator": "Greater Than (>)",
        "threshold": 50.0,
        "duration_seconds": 10,
    },
}

fingerprint = incident_fingerprint(incident)
redis_key = f"incident:active:{fingerprint}"

original_post = requests.post
backend_requests = []


def route_http_requests(url, *args, **kwargs):
    """Send Decision Engine requests for real; simulate final backend response."""

    if url.rstrip("/").endswith("/decisions"):
        return original_post(url, *args, **kwargs)

    if url.rstrip("/").endswith("/alert_incidents"):
        payload = kwargs.get("json", {})
        backend_requests.append(payload)

        response = Mock()
        response.raise_for_status.return_value = None
        response.json.return_value = {
            "status": "success",
            "incident": {
                "incident_id": payload["incident"]["incident_id"]
            },
        }
        return response

    raise AssertionError(f"Unexpected HTTP request: {url}")


try:
    redis_client.delete(redis_key)

    with patch(
        "incident_management.manager.requests.post",
        side_effect=route_http_requests,
    ):
        result = manage_incidents(incident)

    assert result is not None, "Incident Manager returned no incident."

    assert result.get("publication_outcome") == "PUBLISH", (
        "Decision Engine did not approve alert publication."
    )

    assert result.get("_decision_outcome") == "APPROVAL_REQUIRED", (
        "Unexpected Decision Engine outcome."
    )

    assert result["decision"]["decision"] == "NOTIFY"

    assert len(backend_requests) == 1, (
        "Alert Service did not send exactly one backend request."
    )

    backend_payload = backend_requests[0]

    assert backend_payload["event"] == "opened"
    assert backend_payload["incident_detail"]["incident_id"] == result["incident_id"]
    assert backend_payload["alert"]["incident_id"] == result["incident_id"]

    print("PASS: Incident Manager called the real Decision Engine.")
    print("PASS: Backend rule lookup and policy evaluation succeeded.")
    print("PASS: Decision Engine returned PUBLISH.")
    print("PASS: Alert Service generated the backend payload.")
    print("PASS: Backend publication request was successfully simulated.")

    stored_value = redis_client.get(redis_key)
    assert stored_value is not None, "Incident was not stored in Redis."

    stored_incident = json.loads(stored_value)

    assert stored_incident["incident_id"] == result["incident_id"]
    assert stored_incident["publication_outcome"] == "PUBLISH"

    print("PASS: Incident state persisted in Redis.")
    print("Incident ID:", result["incident_id"])
    print("Decision outcome:", result["_decision_outcome"])
    print("Publication outcome:", result["publication_outcome"])

finally:
    redis_client.delete(redis_key)

print("\nAll Decision Engine integration tests passed.")
print("No real dashboard alert or healing action was executed.")
