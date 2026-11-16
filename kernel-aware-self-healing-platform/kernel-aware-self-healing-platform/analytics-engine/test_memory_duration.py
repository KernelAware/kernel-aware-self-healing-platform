
import time
import uuid

from detection.duration import check_duration, clear_duration, duration_snapshot


identity = {
    "category": "memory",
    "system_id": 99999,
    "rule_id": 99999,
    "target": f"duration-test-{uuid.uuid4().hex}",
    "metric": "system_memory_usage_percent",
    "operator": "Greater Than (>)",
    "threshold": 90.0,
}

duration_seconds = 3

try:
    # First check: start a new timer.
    result1 = check_duration(
        identity,
        duration_seconds=duration_seconds,
    )

    assert result1 is False, (
        f"Expected False on first check, got {result1}"
    )

    print("PASS: First check recorded the violation start time.")

    snapshot1 = duration_snapshot(identity, duration_seconds)

    assert snapshot1[0] == "RUNNING", (
        f"Expected RUNNING, got {snapshot1}"
    )

    print("PASS: Timer status is RUNNING.")

    # Wait longer than the configured duration.
    time.sleep(duration_seconds + 1)

    # Second check: duration should now have elapsed.
    result2 = check_duration(
        identity,
        duration_seconds=duration_seconds,
    )

    assert result2 is True, (
        f"Expected True after waiting, got {result2}"
    )

    print("PASS: Duration elapsed; check_duration returned True.")

    snapshot2 = duration_snapshot(identity, duration_seconds)

    assert snapshot2[0] == "COMPLETED", (
        f"Expected COMPLETED, got {snapshot2}"
    )

    print("PASS: Timer status is COMPLETED.")

finally:
    # Remove only this test's timer.
    clear_duration(identity)

print("All Redis duration tests passed.")
