
from unittest.mock import patch

from detection.strategies.memeory_detecter import MemoryDetector

detector = MemoryDetector()

MEMORY_TEST_CASES = [
    ("system_memory_usage_percent", 95.0, 90.0),
    ("system_memory_used_bytes", 12_000_000_000, 10_000_000_000),
    ("system_memory_available_bytes", 1_000_000_000, 2_000_000_000),
    ("system_swap_usage_percent", 90.0, 80.0),
    ("system_swap_used_bytes", 3_000_000_000, 2_000_000_000),
]


def run_test_case(metric_name, value, threshold):
    rule = {
        "rule": {
            "id": 73,
            "system_id": 3,
            "status": "ENABLED",
            "severity": "high",
            "priority": "Medium",
        },
        "metrics": [
            {
                "id": 62,
                "metric": metric_name,
                "operator": (
                    "Less Than (<)"
                    if metric_name == "system_memory_available_bytes"
                    else "Greater Than (>)"
                ),
                "threshold": threshold,
                "duration_seconds": 0,
            }
        ],
    }

    fake_metrics = [
        {
            "metric": {
                "__name__": metric_name,
                "system_id": "3",
                "instance": "host.docker.internal:8001",
            },
            "value": [0, str(value)],
        }
    ]

    with (
        patch(
            "detection.strategies.memeory_detecter.get_memory_metrics",
            return_value=fake_metrics,
        ) as mock_metrics,
        patch(
            "detection.strategies.memeory_detecter.check_duration",
            return_value=True,
        ) as mock_duration,
        patch(
            "detection.strategies.memeory_detecter.manage_incidents"
        ) as mock_incidents,
    ):
        detector.detect(rule)

        mock_metrics.assert_called_once_with(
            system_id=3,
            metric_name=metric_name,
        )

        mock_duration.assert_called_once()

        mock_incidents.assert_called_once()

        incident = mock_incidents.call_args.args[0]

        assert incident["incident_type"] == "memory"
        assert incident["value"] == float(value)
        assert incident["violated_metric"]["metric"] == metric_name

        print(f"PASS: {metric_name}")
        print(f"      Detected value: {incident['value']}")


if __name__ == "__main__":
    for metric_name, value, threshold in MEMORY_TEST_CASES:
        run_test_case(metric_name, value, threshold)

    print("\nAll five memory metric detector tests passed.")
