
from unittest.mock import patch

from detection.strategies.memeory_detecter import MemoryDetector
from load_data.system_metrics.metrics_loader import get_memory_metrics

SYSTEM_ID = 1
THRESHOLD = 90.0

# Fetch real data from Prometheus.
results = get_memory_metrics(SYSTEM_ID)

if not results:
    raise RuntimeError(
        f"No memory metrics returned for system {SYSTEM_ID}"
    )

print("Real Prometheus results:", results)

# Use the actual metric value returned by Prometheus.
memory_value = float(results[0]["value"][1])

print(f"Real memory usage: {memory_value}%")
print(f"Test threshold: {THRESHOLD}%")

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
            "metric": "system_memory_usage_percent",
            "operator": "Greater Than (>)",
            "threshold": THRESHOLD,
            "duration_seconds": 300,
        }
    ],
    "actions": [],
    "notifications": [],
    "recovery": [],
}

# Use real Prometheus data, but prevent real incidents from being sent.
with (
    patch(
        "detection.strategies.memeory_detecter.get_memory_metrics",
        return_value=results,
    ) as mock_metrics,
    patch(
        "detection.strategies.memeory_detecter.check_duration",
        return_value=True,
    ) as mock_duration,
    patch(
        "detection.strategies.memeory_detecter.manage_incidents",
    ) as mock_incidents,
):
    MemoryDetector().detect(test_rule)

    mock_metrics.assert_called_once_with(SYSTEM_ID)

    if memory_value > THRESHOLD:
        mock_duration.assert_called_once()
        mock_incidents.assert_called_once()

        incident = mock_incidents.call_args.args[0]
        assert incident["value"] == memory_value
        assert incident["rule_id"] == 99999

        print("PASS: Real memory value exceeded the threshold.")
        print("PASS: Detector constructed the expected incident.")
        print("Incident delivery was mocked; nothing was sent.")
    else:
        mock_duration.assert_not_called()
        mock_incidents.assert_not_called()

        print("PASS: Real memory value did not exceed the threshold.")
        print("PASS: No incident was created.")
