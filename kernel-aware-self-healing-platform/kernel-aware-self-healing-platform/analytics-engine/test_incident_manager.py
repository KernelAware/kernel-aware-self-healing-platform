
import json
import uuid
from unittest.mock import Mock, patch

from incident_management.manager import (
    DECISION_ENGINE_URL,
    manage_incidents,
)
from load_data.redis_connection.redis_connection import redis_client

# Unique test values prevent collisions with existing incidents.
unique_id = uuid.uuid4().hex
system_id = 99999
metric_id = 99999
target = f"manager-test-{unique_id}"
pid = "host"

redis_key = f"incident:{system_id}:{metric_id}:{target}:{pid}"

incident = {
    "rule_id": 99999,
    "system_id": system_id,
    "incident_type": "memory",
    "severity": "high",
    "priority": "Medium",
    "target": target,
    "pid": None,
    "violated_metric": {
        "id": metric_id,
        "metric": "system_memory_usage_percent",
        "operator": "Greater Than (>)",
        "threshold": 90.0,
        "duration_seconds": 300,
    },
    "value": 95.0,
}

try:
    # Ensure this test starts without an existing incident key.
    redis_client.delete(redis_key)

    fake_response = Mock()
    fake_response.json.return_value = {"status": "received"}

    with patch(
        "incident_management.manager.requests.post",
        return_value=fake_response,
    ) as mock_post:

        manage_incidents(incident)

        # Verify the HTTP request was prepared correctly.
        mock_post.assert_called_once_with(
            f"{DECISION_ENGINE_URL}/incidents",
            json=incident,
            timeout=10,
        )

        fake_response.raise_for_status.assert_called_once()

        print("PASS: POST endpoint and JSON payload verified.")

    # Verify the incident was stored in Redis as JSON.
    stored_value = redis_client.get(redis_key)

    assert stored_value is not None, "Incident was not stored in Redis."

    stored_incident = json.loads(stored_value)

    assert stored_incident == incident

    print("PASS: Incident was stored in Redis as valid JSON.")
    print("Verified incident JSON:")
    print(json.dumps(stored_incident, indent=2))
    print("No real HTTP request was sent.")

finally:
    # Delete only the Redis key created by this test.
    redis_client.delete(redis_key)

print("All incident manager tests passed.")
