
import time
import uuid

from detection.duration import check_duration
from load_data.redis_connection.redis_connection import redis_client

# Unique key avoids interfering with your existing tests or rules.
system_id = 99999
pid = f"duration-test-{uuid.uuid4().hex}"
metric_name = "system_memory_usage_percent"
duration_seconds = 3

key = f"violation:{system_id}:{pid}:{metric_name}"

try:
    # Start with a clean key for this isolated test.
    redis_client.delete(key)

    # First check: record the start time.
    result1 = check_duration(
        system_id=system_id,
        pid=pid,
        metric_name=metric_name,
        duration_seconds=duration_seconds,
    )

    assert result1 is False, (
        f"Expected False on first check, got {result1}"
    )
    print("PASS: First check recorded the violation start time.")

    # Wait longer than the configured duration.
    time.sleep(duration_seconds + 1)

    # Second check: the duration should now have elapsed.
    result2 = check_duration(
        system_id=system_id,
        pid=pid,
        metric_name=metric_name,
        duration_seconds=duration_seconds,
    )

    assert result2 is True, (
        f"Expected True after waiting, got {result2}"
    )
    print("PASS: Duration elapsed; check_duration returned True.")

finally:
    # Remove only this test's unique Redis key.
    redis_client.delete(key)

print("All Redis duration tests passed.")
