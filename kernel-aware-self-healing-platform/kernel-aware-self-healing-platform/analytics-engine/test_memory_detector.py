
from unittest.mock import patch

from detection.strategies.memeory_detecter import MemoryDetector

detector = MemoryDetector()

BASE_RULE = {
    "rule": {
        "id": 73,
        "system_id": 1,
        "status": "ENABLED",
        "severity": "high",
        "priority": "Medium",
    },
    "targets": [
        {
            "target_type": "Host",
            "target": "web-02.prod.local",
            "host": None,
        }
    ],
    "metrics": [
        {
            "id": 62,
            "metric": "system_memory_usage_percent",
            "operator": "Greater Than (>)",
            "threshold": 90.0,
            "duration_seconds": 300,
        }
    ],
    "actions": [],
    "notifications": [],
    "recovery": [],
}

FAKE_METRICS = [
    {
        "metric": {
            "__name__": "system_memory_usage_percent",
            "system_id": "1",
            "instance": "host.docker.internal:8001",
        },
        "value": [0, "95.0"],
    }
]


def run_test_case(
    name,
    status="ENABLED",
    memory_value=95.0,
    duration_passes=True,
    expect_incident=False,
):
    # Give each test its own rule data.
    rule = {
        **BASE_RULE,
        "rule": {**BASE_RULE["rule"], "status": status},
        "metrics": [dict(BASE_RULE["metrics"][0])],
    }

    fake_metrics = [
        {
            **FAKE_METRICS[0],
            "metric": dict(FAKE_METRICS[0]["metric"]),
            "value": [0, str(memory_value)],
        }
    ]

    with (
        patch(
            "detection.strategies.memeory_detecter.get_memory_metrics",
            return_value=fake_metrics,
        ) as mock_metrics,
        patch(
            "detection.strategies.memeory_detecter.check_duration",
            return_value=duration_passes,
        ) as mock_duration,
        patch(
            "detection.strategies.memeory_detecter.manage_incidents"
        ) as mock_incidents,
    ):
        detector.detect(rule)

        if status.upper() == "ENABLED":
            mock_metrics.assert_called_once_with(1)
        else:
            mock_metrics.assert_not_called()

        if status.upper() == "ENABLED" and memory_value > 90.0:
            mock_duration.assert_called_once()
        else:
            mock_duration.assert_not_called()

        if expect_incident:
            mock_incidents.assert_called_once()
            incident = mock_incidents.call_args.args[0]
            assert incident["rule_id"] == 73
            assert incident["system_id"] == 1
            assert incident["incident_type"] == "memory"
            assert incident["value"] == memory_value
            print("Incident payload:", incident)
        else:
            mock_incidents.assert_not_called()

    print(f"PASS: {name}")


if __name__ == "__main__":
    run_test_case(
        name="Enabled rule, threshold exceeded, duration passed",
        status="ENABLED",
        memory_value=95.0,
        duration_passes=True,
        expect_incident=True,
    )

    run_test_case(
        name="Enabled rule, threshold not exceeded",
        status="ENABLED",
        memory_value=80.0,
        duration_passes=True,
        expect_incident=False,
    )

    run_test_case(
        name="Disabled rule, threshold exceeded",
        status="DISABLED",
        memory_value=95.0,
        duration_passes=True,
        expect_incident=False,
    )

    run_test_case(
        name="Enabled rule, duration not reached",
        status="ENABLED",
        memory_value=95.0,
        duration_passes=False,
        expect_incident=False,
    )

    print("\nAll 4 memory detector tests passed.")
