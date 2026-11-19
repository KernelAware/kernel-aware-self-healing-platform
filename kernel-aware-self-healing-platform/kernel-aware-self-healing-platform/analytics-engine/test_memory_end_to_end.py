
import time
import uuid
from unittest.mock import patch

from detection.strategies.memeory_detecter import MemoryDetector
from load_data.system_metrics.metrics_loader import get_memory_metrics
from load_data.redis_connection.redis_connection import redis_client

SYSTEM_ID = 1
THRESHOLD = 0.0
DURATION_SECONDS = 2

# Unique identifier so this test does not reuse another rule's timer.
test_pid = f"e2e-test-{uuid.uuid4().hex}"
metric_name = "system_memory_usage_percent"
redis_key = f"violation:{SYSTEM_ID}:{test_pid}:{metric_name}"

results = get_memory_metrics(SYSTEM_ID)

if not results:
    raise RuntimeError(
        f"No Prometheus memory metrics found for system {SYSTEM_ID}"
    )

memory_value = float(results[0]["value"][1])
print(f"Real memory usage: {memory_value}%")

if memory_value <= THRESHOLD:
    raise RuntimeError("Memory value did not exceed the test threshold.")

test_rule = {
    "rule": {
        "id": 99999,
        "system_id": SYSTEM_ID,
        "status": "ENABLED",
        "severity": "high",
        "priority": "Medium",
    },
    "targets": [],
    "metrics": [
        {
            "id": 99999,
            "metric": metric_name,
            "operator": "Greater Than (>)",
            "threshold": THRESHOLD,
            "duration_seconds": DURATION_SECONDS,
        }
    ],
    "actions": [],
    "notifications": [],
    "recovery": [],
}

try:
    # Start with a fresh timer for this unique test key.
    redis_client.delete(redis_key)

    with (
        patch(
            "detection.strategies.memeory_detecter.get_memory_metrics",
            return_value=results,
        ) as mock_metrics,
        patch(
            "detection.strategies.memeory_detecter.manage_incidents",
        ) as mock_incidents,
    ):
        detector = MemoryDetector()

        # First detection: Redis starts the timer.
        detector.detect(test_rule)
        mock_metrics.assert_called_once_with(SYSTEM_ID)
        mock_incidents.assert_not_called()
        print("PASS: First detection started the Redis timer.")

        # Wait until the real duration has elapsed.
        time.sleep(DURATION_SECONDS + 1)

        # Second detection: same key, so the timer has elapsed.
        detector.detect(test_rule)

        mock_incidents.assert_called_once()
        incident = mock_incidents.call_args.args[0]

        assert incident["rule_id"] == 99999
        assert incident["system_id"] == SYSTEM_ID
        assert incident["value"] == memory_value

        print("PASS: Real Redis duration elapsed.")
        print("PASS: Detector created the expected incident payload.")
        print("Incident delivery was mocked; nothing was sent.")

finally:
    # Clean up only this test's Redis timer key.
    redis_client.delete(redis_key)

print("End-to-end memory detection test passed.")
