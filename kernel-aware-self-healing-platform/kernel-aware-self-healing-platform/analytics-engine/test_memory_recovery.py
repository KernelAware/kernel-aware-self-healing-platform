
from unittest.mock import patch

from detection.strategies.memeory_detecter import MemoryDetector


rule = {
    "rule": {
        "id": 73,
        "system_id": 3,
        "status": "ENABLED",
        "severity": "high",
        "priority": "Medium",
        "monitor_type": "memory",
    },
    "metrics": [
        {
            "id": 62,
            "metric": "system_memory_usage_percent",
            "operator": "Greater Than (>)",
            "threshold": 90.0,
            "duration_seconds": 10,
        }
    ],
}

fake_metrics = [
    {
        "metric": {
            "__name__": "system_memory_usage_percent",
            "system_id": "3",
            "instance": "host.docker.internal:8001",
        },
        "value": [0, "40.0"],
    }
]


with (
    patch(
        "detection.strategies.memeory_detecter.get_memory_metrics",
        return_value=fake_metrics,
    ),
    patch(
        "detection.strategies.memeory_detecter.clear_duration",
        return_value=True,
    ) as mock_clear,
    patch(
        "detection.strategies.memeory_detecter.check_duration",
    ) as mock_duration,
    patch(
        "detection.strategies.memeory_detecter.manage_incidents",
    ) as mock_incidents,
):
    MemoryDetector().detect(rule)

    mock_clear.assert_called_once()
    mock_duration.assert_not_called()
    mock_incidents.assert_called_once()

    incident = mock_incidents.call_args.args[0]

    assert incident["rule_id"] == 73
    assert incident["system_id"] == 3
    assert incident["incident_type"] == "memory"

    assert mock_incidents.call_args.kwargs == {
        "condition_violated": False
    }

    print("PASS: Memory recovery test")
    print("Timer clearing was requested.")
    print("No duration check was performed.")
    print("Incident resolution was requested.")
