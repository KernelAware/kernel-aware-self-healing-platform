import time


def check_duration(started_at, duration_seconds):

    if started_at is None:
        return False

    elapsed = time.time() - started_at

    return elapsed >= duration_seconds