"""In-memory readiness for the current Analytics Engine process."""

import re

_monitoring_lifecycle: dict[int, dict] = {}
_active_alerts: dict[int, dict[str, dict]] = {}


def _generation_timestamp(generation: str | None) -> int | None:
    match = re.match(r"^(\d{16,})-", str(generation or ""))
    return int(match.group(1)) if match else None


def _public_state(system_id: int, state: dict | None) -> dict:
    if state is None:
        return {
            "system_id": int(system_id),
            "generation": None,
            "ready": False,
            "active_alerts": [],
        }
    return {
        **state,
        "active_alerts": list(_active_alerts.get(int(system_id), {}).values()),
    }


def get_monitoring_lifecycle(system_id: int) -> dict:
    state = _monitoring_lifecycle.get(int(system_id))
    return _public_state(system_id, state)


def update_monitoring_lifecycle(system_id: int, generation: str, stage: str) -> tuple[dict, bool]:
    system_id = int(system_id)
    if generation is None or not str(generation).strip():
        raise ValueError("generation is required")
    generation = str(generation).strip()
    stage = str(stage).strip().lower()
    if stage not in {"started", "completed"}:
        raise ValueError("stage must be started or completed")

    current = _monitoring_lifecycle.get(system_id)
    if stage == "started":
        if current and current["generation"] == generation:
            # A retried start notification for this run must not clear alerts
            # that were already opened after warm-up.
            return _public_state(system_id, current), False
        current_timestamp = _generation_timestamp(current["generation"]) if current else None
        incoming_timestamp = _generation_timestamp(generation)
        if (
            current_timestamp is not None
            and incoming_timestamp is not None
            and incoming_timestamp < current_timestamp
        ):
            return _public_state(system_id, current), False
        next_state = {"system_id": system_id, "generation": generation, "ready": False}
        _active_alerts[system_id] = {}
    else:
        # Ignore a delayed completion from an older Analytics process.
        if current and current["generation"] != generation:
            return _public_state(system_id, current), False
        next_state = {"system_id": system_id, "generation": generation, "ready": True}

    changed = current != next_state
    _monitoring_lifecycle[system_id] = next_state
    return _public_state(system_id, next_state), changed


def store_active_alert(system_id: int, generation: str, event: str, incident: dict) -> bool:
    """Keep current-run Disk alerts separate from persisted incident history."""
    system_id = int(system_id)
    state = _monitoring_lifecycle.get(system_id)
    if not state or not state["ready"] or state["generation"] != generation:
        return False

    incident_id = incident.get("incident_id") or incident.get("id")
    if not incident_id:
        return False

    active = _active_alerts.setdefault(system_id, {})
    if event == "resolved":
        active.pop(str(incident_id), None)
    elif event in {"opened", "updated"}:
        active[str(incident_id)] = {**incident, "analytics_generation": generation}
    else:
        return False
    return True


def is_current_generation(system_id: int, generation: str, *, require_ready: bool = True) -> bool:
    state = _monitoring_lifecycle.get(int(system_id))
    return bool(
        state
        and state["generation"] == generation
        and (state["ready"] or not require_ready)
    )
