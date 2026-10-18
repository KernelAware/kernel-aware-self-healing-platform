import hashlib
import json
import logging
import time

from load_data.redis_connection.redis_connection import redis_client


logger = logging.getLogger(__name__)


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
