"""Redis-backed continuous-violation state for Disk rules."""

import hashlib
import json
import logging
import time

from load_data.redis_connection.redis_connection import redis_client
from lifecycle import ANALYTICS_GENERATION


logger = logging.getLogger(__name__)
STATE_PREFIX = "kaisp:disk:violation:"


class DiskDurationStateError(RuntimeError):
    """Redis state could not safely be read or updated."""


def disk_condition_key(identity: dict) -> str:
    encoded = json.dumps(identity, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def _state_key(identity: dict) -> str:
    return f"{STATE_PREFIX}{ANALYTICS_GENERATION}:{disk_condition_key(identity)}"


def _read_state(key: str) -> dict | None:
    try:
        stored = redis_client.get(key)
    except Exception as error:
        logger.exception("Unable to read Disk violation state from Redis")
        raise DiskDurationStateError("Redis read failed") from error
    if stored is None:
        return None
    if isinstance(stored, bytes):
        stored = stored.decode("utf-8")
    try:
        state = json.loads(stored)
    except (TypeError, UnicodeDecodeError, json.JSONDecodeError) as error:
        logger.error("Disk violation state is unreadable; preserving it for investigation")
        raise DiskDurationStateError("Redis state is malformed") from error
    if not isinstance(state, dict):
        logger.error("Disk violation state is not an object; preserving it for investigation")
        raise DiskDurationStateError("Redis state is malformed")
    return state


def _write_state(key: str, state: dict, ttl: int | None = None) -> None:
    try:
        if ttl is None:
            redis_client.set(key, json.dumps(state, sort_keys=True))
        else:
            redis_client.set(key, json.dumps(state, sort_keys=True), ex=ttl)
    except Exception as error:
        logger.exception("Unable to write Disk violation state to Redis")
        raise DiskDurationStateError("Redis write failed") from error


def get_disk_violation_state(identity: dict) -> dict | None:
    return _read_state(_state_key(identity))


def observe_disk_violation(
    identity: dict,
    duration_seconds: int | float,
    now: float | None = None,
) -> tuple[bool, dict]:
    """Start or continue a violation timer and report whether it has elapsed."""
    current_time = time.time() if now is None else float(now)
    duration = max(0.0, float(duration_seconds or 0))
    key = _state_key(identity)
    state = _read_state(key)

    if state is None or state.get("status") == "recovered":
        state = {
            "identity": identity,
            "status": "pending",
            "started_at": current_time,
            "last_observed_at": current_time,
        }
        ttl = max(3600, int(duration) + 3600)
        _write_state(key, state, ttl=ttl)
        return duration == 0, state

    if state.get("status") == "resolution_pending":
        return False, state
    try:
        started_at = float(state["started_at"])
    except (KeyError, TypeError, ValueError) as error:
        logger.error("Disk violation state has no valid start timestamp; preserving it")
        raise DiskDurationStateError("Redis state has an invalid start timestamp") from error

    state["last_observed_at"] = current_time
    ttl = None if state.get("status") == "active" else max(3600, int(duration) + 3600)
    _write_state(key, state, ttl=ttl)
    elapsed = max(0.0, current_time - started_at)
    return state.get("status") == "active" or elapsed >= duration, state


def mark_disk_incident_active(
    identity: dict,
    prior_state: dict | None,
    incident: dict,
) -> dict:
    """Retain the incident ID and resolution payload beside the timer."""
    state = {
        **(prior_state or {}),
        "identity": identity,
        "status": "active",
        "incident_id": incident.get("incident_id"),
        "incident": {
            key: value for key, value in incident.items()
            if key != "_backend_pending_event"
        },
    }
    _write_state(_state_key(identity), state)
    return state


def mark_disk_resolution_pending(identity: dict, prior_state: dict | None) -> dict:
    state = {**(prior_state or {}), "identity": identity, "status": "resolution_pending"}
    _write_state(_state_key(identity), state)
    return state


def clear_disk_violation(identity: dict, prior_state: dict | None = None) -> bool:
    """Clear a recovered condition, leaving a tombstone if deletion fails."""
    key = _state_key(identity)
    try:
        redis_client.delete(key)
        return True
    except Exception:
        logger.exception("Unable to delete recovered Disk violation state; writing a recovery marker")
        marker = {
            "identity": identity,
            "status": "recovered",
            "recovered_at": time.time(),
        }
        if prior_state and prior_state.get("incident_id"):
            marker["last_incident_id"] = prior_state["incident_id"]
        try:
            _write_state(key, marker, ttl=86400)
        except DiskDurationStateError:
            return False
        return True
