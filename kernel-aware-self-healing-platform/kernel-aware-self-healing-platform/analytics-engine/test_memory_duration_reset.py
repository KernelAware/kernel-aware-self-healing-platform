
import time
import uuid

from detection.duration import (
    check_duration,
    clear_duration,
    duration_snapshot,
)

identity = {
    "category": "memory",
    "system_id": 99999,
    "rule_id": 99999,
    "target": f"test-host-{uuid.uuid4().hex}",
    "metric": "system_memory_usage_percent",
    "operator": "Greater Than (>)",
    "threshold": 90.0,
}

duration_seconds = 5

try:
    # Test 1: Start a new timer.
    result = check_duration(
        identity,
        duration_seconds=duration_seconds,
    )

    assert result is False
    print("PASS: Timer starts.")

    snapshot = duration_snapshot(identity, duration_seconds)
    assert snapshot[0] == "RUNNING"
    print("PASS: Timer status is RUNNING.")

    # Test 2: Wait, then clear the timer.
    time.sleep(2)

    cleared = clear_duration(identity)

    assert cleared is True
    print("PASS: Timer cleared.")

    snapshot = duration_snapshot(identity, duration_seconds)

    assert snapshot[0] == "UNCHANGED"
    print("PASS: Timer state is cleared from Redis.")

    # Test 3: Start a fresh timer.
    result = check_duration(
        identity,
        duration_seconds=duration_seconds,
    )

    assert result is False
    print("PASS: Fresh timer starts after reset.")

    snapshot = duration_snapshot(identity, duration_seconds)
    assert snapshot[0] == "RUNNING"
    print("PASS: Fresh timer status is RUNNING.")

    # Test 4: Verify the fresh timer eventually completes.
    time.sleep(duration_seconds + 1)

    result = check_duration(
        identity,
        duration_seconds=duration_seconds,
    )

    assert result is True
    print("PASS: Fresh timer reaches the required duration.")

    snapshot = duration_snapshot(identity, duration_seconds)
    assert snapshot[0] == "COMPLETED"
    print("PASS: Fresh timer status is COMPLETED.")

finally:
    clear_duration(identity)

print("All duration reset tests passed!")
