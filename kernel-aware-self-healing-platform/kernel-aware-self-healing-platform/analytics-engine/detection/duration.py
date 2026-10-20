import hashlib
import json
import logging
import time

from detection.threshold import check_threshold
from load_data.system_metrics.metrics_loader import (
    PROMETHEUS_SCRAPE_INTERVAL_SECONDS,
    build_metric_selector,
    query_prometheus,
    query_prometheus_range,
)
from load_data.redis_connection.redis_connection import redis_client


logger = logging.getLogger(__name__)


def verify_prometheus_duration(
    metric_name: str,
    labels: dict,
    operator: str,
    threshold: float,
    duration_seconds: int | float,
    now: float | None = None,
) -> tuple[bool, str | None]:
    """Verify a condition from fresh Prometheus samples across its full duration.

    A missing range point, stale scrape, or incomplete retention window cannot
    prove continuity. Prometheus's ``timestamp`` is used in the selector so its
    normal lookback window does not make an old sample look current.
    """
    duration = max(0.0, float(duration_seconds or 0))
    step = max(0.1, float(PROMETHEUS_SCRAPE_INTERVAL_SECONDS))
    freshness = step * 1.25
    selector = build_metric_selector(metric_name, labels)
    fresh_selector = (
        f"({selector}) and ((time() - timestamp({selector})) <= {freshness:g})"
    )

    if duration == 0:
        rows = query_prometheus(fresh_selector)
        if not rows:
            return False, "no fresh Prometheus sample is available"
        for row in rows:
            try:
                value = float(row["value"][1])
            except (KeyError, TypeError, ValueError, IndexError):
                return False, "Prometheus returned an invalid sample"
            if not check_threshold(value, operator, threshold):
                return False, None
        return True, None

    end = time.time() if now is None else float(now)
    start = end - duration
    rows = query_prometheus_range(fresh_selector, start, end, step)
    matching_rows = [
        row for row in rows
        if all((row.get("metric") or {}).get(key) == str(value) for key, value in labels.items())
    ]
    if not matching_rows:
        return False, "no fresh Prometheus history is available for the requested interval"
    if len(matching_rows) != 1:
        return False, "Prometheus returned ambiguous series for the requested target"

    raw_values = matching_rows[0].get("values") or []
    try:
        samples = sorted((float(timestamp), float(value)) for timestamp, value in raw_values)
    except (TypeError, ValueError):
        return False, "Prometheus returned invalid range samples"
    if not samples:
        return False, "no fresh Prometheus history is available for the requested interval"

    sample_times = [timestamp for timestamp, _ in samples]
    if sample_times[0] - start > freshness or end - sample_times[-1] > freshness:
        return False, "Prometheus history does not cover the full configured duration"
    if any((later - earlier) > freshness for earlier, later in zip(sample_times, sample_times[1:])):
        return False, "Prometheus history contains a scrape gap in the configured duration"

    for _, value in samples:
        if not check_threshold(value, operator, threshold):
            return False, None
    return True, None


def _state_key(identity: dict, phase: str) -> str:
    encoded = json.dumps(identity, sort_keys=True, separators=(",", ":"))
    digest = hashlib.sha256(encoded.encode("utf-8")).hexdigest()
    return f"kaisp:{phase}:{digest}"


def check_duration(identity: dict, duration_seconds: int | float, now: float | None = None, phase: str = "trigger") -> bool:
    """Return whether a condition has stayed true for its configured duration."""
    duration = max(0, float(duration_seconds or 0))
    current_time = time.time() if now is None else float(now)
    key = _state_key(identity, phase)

    try:
        stored_time = redis_client.get(key)
        if stored_time is None:
            ttl = max(3600, int(duration) + 3600)
            redis_client.set(key, str(current_time), ex=ttl)
            return duration == 0

        return current_time - float(stored_time) >= duration
    except Exception:
        logger.exception("Unable to read or update Redis duration state")
        return False


def clear_duration(identity: dict, phase: str = "trigger") -> None:
    """Clear pending duration state after a valid observation disproves it."""
    try:
        redis_client.delete(_state_key(identity, phase))
    except Exception:
        logger.exception("Unable to clear Redis duration state")
