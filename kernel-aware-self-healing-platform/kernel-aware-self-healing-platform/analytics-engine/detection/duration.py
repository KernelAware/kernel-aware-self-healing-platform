import time
from load_data.redis_connection.redis_connection import redis_client


def check_duration(system_id, target=None, metric_name=None, duration_seconds=None, *, pid=None):

    if target is None:
        target = pid

    key = f"violation:{system_id}:{target}:{metric_name}"

    stored_time = redis_client.get(key)
    if stored_time is None:
        current_time = time.time()

        redis_client.set(
            key,
            current_time
        )

        return False

    started_at = float(stored_time)

    current_time = time.time()

    elapsed = current_time - started_at

    print("Started at:", started_at)
    print("Current time:", current_time)
    print("Elapsed:", elapsed)

    return elapsed >= duration_seconds