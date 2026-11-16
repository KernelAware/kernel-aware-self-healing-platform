
from unittest.mock import patch

from detection.strategies.memeory_detecter import MemoryDetector
from load_data.system_metrics.metrics_loader import get_memory_metrics

SYSTEM_ID = 3
THRESHOLD = 90.0
METRIC_NAME = "system_memory_usage_percent"

# Fetch real data from Prometheus.
results = get_memory_metrics(
    system_id=SYSTEM_ID,
    metric_name=METRIC_NAME,
)

if not results:
    raise RuntimeError(
        f"No memory metrics returned for system {SYSTEM_ID}"
    )

print("Real Prometheus results:", results)

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
        "monitor_type": "memory",
    },
    "targets": [],
    "metrics": [
        {
            "id": 99999,
            "metric": METRIC_NAME,
            "operator": "Greater Than (>)",
            "threshold": THRESHOLD,
            "duration_seconds": 300,
        }
    ],
    "actions": [],
    "notifications": [],
    "recovery": [],
}

# Real Prometheus data; mock duration, Redis cleanup and incident delivery.
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
        "detection.strategies.memeory_detecter.clear_duration",
        return_value=True,
    ) as mock_clear,
    patch(
        "detection.strategies.memeory_detecter.duration_snapshot",
        return_value=("COMPLETED", 300.0, 0.0),
    ),
    patch(
        "detection.strategies.memeory_detecter.manage_incidents",
    ) as mock_incidents,
):
    MemoryDetector().detect(test_rule)

    mock_metrics.assert_called_once_with(
        system_id=SYSTEM_ID,
        metric_name=METRIC_NAME,
    )

    if memory_value > THRESHOLD:
        mock_duration.assert_called_once()
        mock_clear.assert_not_called()
        mock_incidents.assert_called_once()

        incident = mock_incidents.call_args.args[0]

        assert incident["value"] == memory_value
        assert incident["rule_id"] == 99999
        assert incident["system_id"] == SYSTEM_ID

        assert mock_incidents.call_args.kwargs == {
            "condition_violated": True
        }

        print("PASS: Real memory value exceeded the threshold.")
        print("PASS: Detector constructed the expected incident.")
        print("PASS: Incident delivery was mocked.")

    else:
        mock_duration.assert_not_called()
        mock_clear.assert_called_once()
        mock_incidents.assert_called_once()

        assert mock_incidents.call_args.kwargs == {
            "condition_violated": False
        }

        print("PASS: Real memory value did not exceed the threshold.")
        print("PASS: Detector requested incident recovery.")
        print("PASS: Incident delivery was mocked.")

print("\nPrometheus integration test completed.")
