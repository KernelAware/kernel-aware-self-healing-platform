
import time
import uuid
from unittest.mock import patch

from detection.strategies.memeory_detecter import MemoryDetector
from detection.duration import clear_duration


SYSTEM_ID = 3
RULE_ID = 999992
DURATION_SECONDS = 2
THRESHOLD = 50.0

TARGET = f"memory-lifecycle-test-{uuid.uuid4().hex}"

rule = {
    "rule": {
        "id": RULE_ID,
        "system_id": SYSTEM_ID,
        "status": "ENABLED",
        "severity": "high",
        "priority": "Medium",
        "monitor_type": "memory",
    },
    "metrics": [
        {
            "id": 999992,
            "metric": "system_memory_usage_percent",
            "operator": "Greater Than (>)",
            "threshold": THRESHOLD,
            "duration_seconds": DURATION_SECONDS,
        }
    ],
    "actions": [],
}

violating_metrics = [
    {
        "metric": {
            "__name__": "system_memory_usage_percent",
            "system_id": str(SYSTEM_ID),
            "instance": TARGET,
        },
        "value": [time.time(), "80.0"],
    }
]

recovered_metrics = [
    {
        "metric": {
            "__name__": "system_memory_usage_percent",
            "system_id": str(SYSTEM_ID),
            "instance": TARGET,
        },
        "value": [time.time(), "30.0"],
    }
]

identity = {
    "category": "memory",
    "system_id": SYSTEM_ID,
    "rule_id": RULE_ID,
    "target": TARGET,
    "metric": "system_memory_usage_percent",
    "operator": "Greater Than (>)",
    "threshold": THRESHOLD,
    "duration_seconds": DURATION_SECONDS,
}

detector = MemoryDetector()

try:
    with (
        patch(
            "detection.strategies.memeory_detecter.get_memory_metrics",
            return_value=violating_metrics,
        ) as mock_metrics,
        patch(
            "detection.strategies.memeory_detecter.manage_incidents",
        ) as mock_incidents,
    ):

        # STEP 1: First violation evaluation.
        print("\nSTEP 1: Evaluating memory violation")

        detector.detect(rule)

        assert mock_incidents.call_count == 0

        print("PASS: Violation detected.")
        print("PASS: Redis timer started.")
        print("PASS: No incident created before duration elapsed.")

        # STEP 2: Wait for the duration to complete.
        print("\nSTEP 2: Waiting for duration")

        time.sleep(DURATION_SECONDS + 1)

        # STEP 3: Evaluate the persistent violation.
        print("\nSTEP 3: Evaluating persistent violation")

        detector.detect(rule)

        assert mock_incidents.call_count == 1

        creation_call = mock_incidents.call_args_list[0]

        assert creation_call.kwargs == {
            "condition_violated": True
        }

        incident = creation_call.args[0]

        assert incident["rule_id"] == RULE_ID
        assert incident["system_id"] == SYSTEM_ID
        assert incident["value"] == 80.0

        print("PASS: Incident creation requested.")
        print("Incident value:", incident["value"])

        # STEP 4: Simulate memory recovery.
        print("\nSTEP 4: Simulating memory recovery")

        mock_metrics.return_value = recovered_metrics

        detector.detect(rule)

        assert mock_incidents.call_count == 2

        recovery_call = mock_incidents.call_args_list[1]

        assert recovery_call.kwargs == {
            "condition_violated": False
        }

        recovery_incident = recovery_call.args[0]

        assert recovery_incident["rule_id"] == RULE_ID
        assert recovery_incident["system_id"] == SYSTEM_ID

        print("PASS: Memory recovery detected.")
        print("PASS: Redis timer cleared.")
        print("PASS: Incident resolution requested.")

        print("\nAll Memory Incident Lifecycle Tests Passed.")

finally:
    clear_duration(identity)
    print("Test timer cleanup completed.")
