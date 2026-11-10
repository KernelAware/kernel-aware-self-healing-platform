import time
import uuid

from detection.duration import check_duration, reset_duration
from load_data.redis_connection.redis_connection import redis_client

system_id = 99999
target = f"test-host-{uuid.uuid4().hex}"
metric_name = "system_memory_usage_percent"
duration_seconds = 5

key = f"violation:{system_id}:{target}:{metric_name}"

try:
    # Test 1: Start a new timer.
    reset_duration(system_id, target, metric_name)

    result = check_duration(
        system_id, target, metric_name, duration_seconds
    )
    assert result is False
    print("PASS: Timer starts.")

    # Test 2: Wait, then reset the timer.
    time.sleep(2)
    reset_duration(system_id, target, metric_name)

    assert redis_client.get(key) is None
    print("PASS: Timer is deleted after reset.")

    # Test 3: Start a fresh timer.
    result = check_duration(
        system_id, target, metric_name, duration_seconds
    )
    assert result is False
    print("PASS: Fresh timer starts after reset.")

    # Test 4: Verify the fresh timer eventually expires.
    time.sleep(duration_seconds + 1)

    result = check_duration(
        system_id, target, metric_name, duration_seconds
    )
    assert result is True
    print("PASS: Fresh timer reaches the required duration.")

finally:
    redis_client.delete(key)

print("All duration reset tests passed!")