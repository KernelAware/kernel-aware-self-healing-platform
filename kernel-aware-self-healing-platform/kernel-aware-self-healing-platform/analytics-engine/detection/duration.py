
import hashlib
import json
import logging
import math
import time

from detection.threshold import check_threshold
from load_data.system_metrics.metrics_loader import (
    PROMETHEUS_SCRAPE_INTERVAL_SECONDS,
    build_metric_selector,
    canonical_metric_name,
    query_prometheus,
    query_prometheus_range,
)
from load_data.redis_connection.redis_connection import redis_client
from lifecycle import ANALYTICS_GENERATION


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
    prove continuity. Prometheus's timestamp is used in the selector so its
    normal lookback window does not make an old sample look current.
    """
    duration = max(0.0, float(duration_seconds or 0))
    step = max(0.1, float(PROMETHEUS_SCRAPE_INTERVAL_SECONDS))
    freshness = step * 1.25

    selector = build_metric_selector(
        canonical_metric_name(metric_name),
        labels,
    )

    fresh_selector = (
        f"({selector}) and "
        f"((time() - timestamp({selector})) <= {freshness:g})"
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

    # Fetch one cadence before the requested window so that the window's
    # left boundary must be backed by an actual observation.
    rows = query_prometheus_range(
        fresh_selector,
        start - step,
        end,
        step,
    )

    expected_labels = {
        key: str(value)
        for key, value in labels.items()
        if key != "__name__"
    }

    matching_rows = []

    for row in rows:
        row_labels = {
            key: str(value)
            for key, value in (row.get("metric") or {}).items()
            if key != "__name__"
        }

        if all(
            row_labels.get(key) == value
            for key, value in expected_labels.items()
        ):
            matching_rows.append(row)

    if not matching_rows:
        return (
            False,
            "no fresh Prometheus history is available for the requested interval",
        )

    if len(matching_rows) != 1:
        return (
            False,
            "Prometheus returned ambiguous series for the requested target",
        )

    raw_values = matching_rows[0].get("values") or []

    try:
        samples = sorted(
            (float(timestamp), float(value))
            for timestamp, value in raw_values
        )
    except (TypeError, ValueError):
        return False, "Prometheus returned invalid range samples"

    if not samples:
        return (
            False,
            "no fresh Prometheus history is available for the requested interval",
        )

    sample_times = [timestamp for timestamp, _ in samples]

    if len(set(sample_times)) < 2:
        return (
            False,
            "Prometheus returned too few observations to verify the duration",
        )

    if sample_times[0] > start or start - sample_times[0] > freshness:
        return (
            False,
            "Prometheus history does not cover the full configured duration",
        )

    interval_samples = [
        (timestamp, value)
        for timestamp, value in samples
        if start <= timestamp <= end
    ]

    if not interval_samples:
        return (
            False,
            "Prometheus history does not cover the full configured duration",
        )

    if end - interval_samples[-1][0] > freshness:
        return (
            False,
            "Prometheus history does not cover the full configured duration",
        )

    coverage_times = [
        start,
        *(timestamp for timestamp, _ in interval_samples),
        end,
    ]

    if any(
        later - earlier > freshness
        for earlier, later in zip(
            coverage_times,
            coverage_times[1:],
        )
    ):
        return (
            False,
            "Prometheus history contains a scrape gap in the configured duration",
        )

    for _, value in interval_samples:
        if not math.isfinite(value):
            return False, "Prometheus returned a non-finite range sample"

        if not check_threshold(value, operator, threshold):
            return False, None

    return True, None


def _state_key(identity: dict, phase: str) -> str:
    """Generate a deterministic Redis key for a rule identity and phase."""
    identity = {
        **identity,
        "analytics_generation": ANALYTICS_GENERATION,
    }
    encoded = json.dumps(
        identity,
        sort_keys=True,
        separators=(",", ":"),
    )

    digest = hashlib.sha256(
        encoded.encode("utf-8")
    ).hexdigest()

    return f"kaisp:{phase}:{digest}"


def check_duration(
    identity: dict | None = None,
    duration_seconds: int | float | None = None,
    now: float | None = None,
    phase: str = "trigger",
    **identity_fields,
) -> bool:
    """Return whether a condition has stayed true for its configured duration."""
    if identity is None:
        identity = {}
    elif not isinstance(identity, dict):
        identity = {
            "identity": identity,
            **identity_fields,
        }
    elif identity_fields:
        identity = {
            **identity,
            **identity_fields,
        }

    if duration_seconds is None:
        duration_seconds = identity.pop("duration_seconds", 0)

    duration = max(0, float(duration_seconds or 0))
    current_time = time.time() if now is None else float(now)

    key = _state_key(identity, phase)

    try:
        stored_time = redis_client.get(key)

        if stored_time is None:
            ttl = max(3600, int(duration) + 3600)

            redis_client.set(
                key,
                str(current_time),
                ex=ttl,
            )

            return duration == 0

        return current_time - float(stored_time) >= duration

    except Exception:
        logger.exception(
            "Unable to read or update Redis duration state"
        )
        return False


def clear_duration(
    identity: dict,
    phase: str = "trigger",
) -> bool:
    """Clear timer state; report failure so callers cannot assume it reset."""
    try:
        redis_client.delete(
            _state_key(identity, phase)
        )
        return True

    except Exception:
        logger.exception(
            "Unable to clear Redis duration state"
        )
        return False


def duration_snapshot(
    identity: dict,
    duration_seconds: int | float,
    now: float | None = None,
) -> tuple[str, float, float | None]:
    """Return timer state, elapsed seconds, and remaining seconds."""
    current_time = time.time() if now is None else float(now)
    duration = max(0.0, float(duration_seconds or 0))

    try:
        stored_time = redis_client.get(_state_key(identity, "trigger"))
        if stored_time is None:
            return "UNCHANGED", 0.0, duration

        elapsed = max(0.0, current_time - float(stored_time))
        return "COMPLETED" if elapsed >= duration else "RUNNING", elapsed, max(
            0.0,
            duration - elapsed,
        )
    except Exception:
        logger.exception("Unable to read Redis duration snapshot")
        return "ERROR", 0.0, None
