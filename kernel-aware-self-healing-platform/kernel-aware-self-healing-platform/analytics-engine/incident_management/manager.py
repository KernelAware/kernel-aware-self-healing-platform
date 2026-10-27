import hashlib
import json
import logging
import os
import uuid
from datetime import datetime, timezone

import requests

from incident_management.alert_service import publish_incident
from load_data.redis_connection.redis_connection import redis_client
from lifecycle import ANALYTICS_GENERATION


logger = logging.getLogger(__name__)
DECISION_ENGINE_URL = os.environ.get("DECISION_ENGINE_URL", "http://localhost:8002").rstrip("/")
DECISION_ENGINE_TIMEOUT_SECONDS = 5

REMEDIATION_ACTIONS = {
    "restart-service", "start-service", "stop-service", "kill-process",
    "clear-cache", "free-disk", "scale-resources", "isolate-node",
    "run-automation", "run-command", "trigger-webhook",
}


def _now():
    return datetime.now(timezone.utc).isoformat()


def incident_fingerprint(incident: dict) -> str:
    violated_metric = incident.get("violated_metric") or {}
    identity = {
        "category": str(incident.get("monitor_type") or incident.get("incident_type") or "unknown").lower(),
        "system_id": incident.get("system_id"),
        "rule_id": incident.get("rule_id"),
        "target_type": incident.get("target_type"),
        "target": incident.get("target"),
        "pid": incident.get("pid"),
        "metric": incident.get("metric") or violated_metric.get("metric") or violated_metric.get("id"),
    }
    if _is_disk_incident(incident) and incident.get("disk_condition_key"):
        identity["disk_condition_key"] = incident["disk_condition_key"]
    if _is_disk_incident(incident):
        # Keep the identity stable during this run while isolating old Redis
        # incidents and their decision submission markers.
        identity["analytics_generation"] = ANALYTICS_GENERATION
    encoded = json.dumps(identity, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def _active_key(fingerprint: str) -> str:
    return f"incident:active:{fingerprint}"


def _is_disk_incident(incident: dict) -> bool:
    return str(incident.get("monitor_type") or incident.get("incident_type") or "").strip().lower() == "disk"


def _event(incident: dict, status: str, label: str, tone: str) -> dict:
    return {
        "time": _now(),
        "label": label,
        "title": incident.get("title") or f"{incident.get('metric', 'Metric')} {status.lower()}",
        "note": f"Observed value: {incident.get('value')}",
        "tone": tone,
    }


def _publishable_incident(incident: dict) -> dict:
    """Keep retry bookkeeping in Redis without exposing it in API payloads."""
    return {
        key: value for key, value in incident.items()
        if key != "_backend_pending_event" and not key.startswith("_decision_")
    }


def _retry_pending_event(key: str, incident: dict) -> bool:
    event = incident.get("_backend_pending_event")
    if not event:
        return True
    try:
        publish_incident(_publishable_incident(incident), event)
        if not _is_disk_incident(incident):
            # Preserve the established retry behavior for the other monitor types.
            incident.pop("_backend_pending_event", None)
            if event == "resolved":
                redis_client.delete(key)
            else:
                redis_client.set(key, json.dumps(incident))
        else:
            if event == "resolved":
                redis_client.delete(key)
            else:
                retry_cleared = dict(incident)
                retry_cleared.pop("_backend_pending_event", None)
                redis_client.set(key, json.dumps(retry_cleared))
            incident.pop("_backend_pending_event", None)
    except Exception:
        logger.exception(
            "Unable to complete pending %s event for incident %s",
            event,
            incident.get("incident_id"),
        )
        return False
    return True


def _has_remediation(rule: dict | None) -> bool:
    for action in (rule or {}).get("actions") or []:
        action_type = action.get("action_type") if isinstance(action, dict) else action
        if str(action_type).lower() in REMEDIATION_ACTIONS:
            return True
    return False


def _send_process_to_decision_engine(incident: dict) -> None:
    try:
        response = requests.post(
            f"{DECISION_ENGINE_URL}/incidents",
            json=incident,
            timeout=10,
        )
        response.raise_for_status()
    except Exception:
        # Alert persistence is independent of optional Process remediation.
        logger.exception("Decision Engine request failed for Process incident %s", incident.get("incident_id"))


def _send_disk_to_decision_engine(key: str, incident: dict) -> None:
    """Submit one persisted Disk incident at most once for a decision only."""
    if incident.get("_decision_submission_status"):
        return

    # Persist the at-most-once marker before the request. If the request times
    # out after the remote service processed it, this incident will not be
    # submitted repeatedly during later evaluation rounds.
    decision_state = {**incident, "_decision_submission_status": "submitting"}
    try:
        redis_client.set(key, json.dumps(decision_state))
    except Exception:
        logger.exception(
            "Unable to reserve Decision Engine submission for Disk incident %s",
            incident.get("incident_id"),
        )
        return

    try:
        response = requests.post(
            f"{DECISION_ENGINE_URL}/decisions",
            json=_publishable_incident(decision_state),
            timeout=DECISION_ENGINE_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        decision_response = response.json()
        if not isinstance(decision_response, dict):
            raise ValueError("Decision Engine returned an invalid response")
    except Exception:
        decision_state["_decision_submission_status"] = "failed"
        try:
            redis_client.set(key, json.dumps(decision_state))
        except Exception:
            logger.exception(
                "Unable to retain failed Decision Engine state for Disk incident %s",
                incident.get("incident_id"),
            )
        logger.exception(
            "Decision Engine request failed for Disk incident %s",
            incident.get("incident_id"),
        )
        return

    decision_state["_decision_submission_status"] = "submitted"
    decision_state["_decision_response"] = decision_response
    try:
        redis_client.set(key, json.dumps(decision_state))
    except Exception:
        # The pre-request marker remains in Redis, so a later evaluation will
        # still not duplicate a decision request.
        logger.exception(
            "Decision Engine evaluated Disk incident %s, but its result could not be retained",
            incident.get("incident_id"),
        )
    decision = decision_response.get("decision")
    decision_name = decision.get("decision", "unknown") if isinstance(decision, dict) else "unknown"
    logger.info(
        "Decision Engine evaluated Disk incident %s: %s",
        incident.get("incident_id"),
        decision_name,
    )


def manage_incidents(incident: dict, condition_violated: bool = True):
    """Create, update, or resolve one incident for a rule/target/metric identity."""
    fingerprint = incident_fingerprint(incident)
    key = _active_key(fingerprint)
    try:
        stored = redis_client.get(key)
    except Exception:
        logger.exception("Redis is unavailable; incident state was not changed")
        return None

    if condition_violated:
        now = _now()
        is_disk = _is_disk_incident(incident)
        if is_disk:
            incident = {**incident, "analytics_generation": ANALYTICS_GENERATION}
        is_new = stored is None
        if stored:
            try:
                current = json.loads(stored)
            except (TypeError, json.JSONDecodeError):
                current = {}
                is_new = True
            if is_disk and not isinstance(current, dict):
                current = {}
                is_new = True
            if current.get("_backend_pending_event") == "resolved":
                if not _retry_pending_event(key, current):
                    return current
                current = {}
                is_new = True
            elif str(current.get("status", "")).upper() == "RESOLVED":
                current = {}
                is_new = True
            elif is_disk and not current.get("incident_id"):
                current = {}
                is_new = True
        else:
            current = {}

        if is_disk and not is_new and current.get("incident_id"):
            pending_event = current.get("_backend_pending_event")
            if pending_event == "updated":
                # Older versions queued an update each cycle; it is not a
                # lifecycle transition and does not need to be retried.
                current.pop("_backend_pending_event", None)
                try:
                    redis_client.set(key, json.dumps(current))
                except Exception:
                    logger.exception(
                        "Unable to clear stale Disk update retry state for incident %s",
                        current["incident_id"],
                    )
                    return current
                pending_event = None
            if not pending_event:
                if is_disk and not current.get("_decision_submission_status"):
                    _send_disk_to_decision_engine(key, current)
                logger.debug(
                    "Disk incident remains active; skipping unchanged update: system_id=%s rule_id=%s incident_id=%s",
                    current.get("system_id"),
                    current.get("rule_id"),
                    current["incident_id"],
                )
                return current

        publish_event = current.get("_backend_pending_event") or ("opened" if is_new else "updated")

        incident = {
            **current,
            **incident,
            "fingerprint": fingerprint,
            "incident_id": current.get("incident_id") or f"INC-{uuid.uuid4().hex[:12].upper()}",
            "status": "OPEN",
            "created_at": current.get("created_at") or now,
            "updated_at": now,
            "resolved_at": None,
            "timeline": list(current.get("timeline") or []),
            "_backend_pending_event": publish_event,
        }
        if is_new:
            incident["timeline"].append(_event(incident, "OPEN", "Incident opened", "warning"))
        try:
            redis_client.set(key, json.dumps(incident))
        except Exception:
            logger.exception("Unable to persist active incident state in Redis")
            return None

        try:
            response = publish_incident(_publishable_incident(incident), publish_event)
        except Exception:
            logger.exception(
                "Unable to publish %s event for incident %s to the backend; will retry that event",
                publish_event,
                incident["incident_id"],
            )
        else:
            persisted = (response or {}).get("incident") or {}
            persisted_id = persisted.get("incident_id") or persisted.get("id")
            if persisted_id and persisted_id != incident["incident_id"]:
                incident["incident_id"] = persisted_id
            incident.pop("_backend_pending_event", None)
            try:
                redis_client.set(key, json.dumps(incident))
            except Exception:
                logger.exception(
                    "Backend accepted %s event for incident %s, but Redis did not clear the retry marker",
                    publish_event,
                    incident["incident_id"],
                )

            if is_disk and publish_event == "opened":
                _send_disk_to_decision_engine(key, incident)

        if (
            is_new
            and str(incident.get("monitor_type") or "").lower() == "process"
            and _has_remediation({"actions": incident.get("actions")})
        ):
            _send_process_to_decision_engine(incident)
        return incident

    if stored is None:
        return None

    try:
        current = json.loads(stored)
    except (TypeError, json.JSONDecodeError):
        current = {}
    if _is_disk_incident(incident) and not isinstance(current, dict):
        current = {}
    if not current.get("incident_id"):
        return None

    if current.get("_backend_pending_event") == "resolved":
        if not _retry_pending_event(key, current):
            return current
        return current

    if current.get("_backend_pending_event") and not _retry_pending_event(key, current):
        return current

    resolved = {
        **current,
        "value": incident.get("value", current.get("value")),
        "status": "RESOLVED",
        "updated_at": _now(),
        "resolved_at": _now(),
    }
    resolved["timeline"] = list(current.get("timeline") or []) + [
        _event(resolved, "RESOLVED", "Condition recovered", "success")
    ]
    resolved["_backend_pending_event"] = "resolved"
    try:
        redis_client.set(key, json.dumps(resolved))
    except Exception:
        logger.exception("Unable to queue resolution for incident %s in Redis", current["incident_id"])
        return resolved
    try:
        publish_incident(_publishable_incident(resolved), "resolved")
    except Exception:
        logger.exception("Unable to publish resolution for incident %s", current["incident_id"])
        return resolved

    try:
        redis_client.delete(key)
    except Exception:
        logger.exception("Unable to clear resolved incident state from Redis")
        return resolved
    if _is_disk_incident(incident):
        resolved.pop("_backend_pending_event", None)
    return resolved


def _disk_active_record(incident: dict):
    """Read Disk incident state without changing it; report Redis errors explicitly."""
    key = _active_key(incident_fingerprint(incident))
    try:
        stored = redis_client.get(key)
    except Exception as error:
        logger.exception("Redis is unavailable while reading Disk incident state")
        return key, None, error
    if stored is None:
        return key, None, None
    try:
        current = json.loads(stored)
    except (TypeError, json.JSONDecodeError) as error:
        logger.exception("Disk incident state is unreadable")
        return key, None, error
    if not isinstance(current, dict):
        return key, None, ValueError("Disk incident state is not an object")
    return key, current, None


def _direct_disk_resolution(incident: dict, fallback_state: dict):
    """Resolve a retained Disk incident ID if its manager key was lost."""
    saved_incident = fallback_state.get("incident") or fallback_state
    incident_id = fallback_state.get("incident_id") or saved_incident.get("incident_id")
    if not incident_id:
        return {"outcome": "resolved", "incident": None}
    resolved = {
        **saved_incident,
        **incident,
        "incident_id": incident_id,
        "status": "RESOLVED",
        "updated_at": _now(),
        "resolved_at": _now(),
    }
    resolved["timeline"] = list(saved_incident.get("timeline") or []) + [
        _event(resolved, "RESOLVED", "Condition recovered", "success")
    ]
    try:
        response = publish_incident(_publishable_incident(resolved), "resolved")
    except Exception:
        logger.exception("Unable to persist fallback Disk resolution for incident %s", incident_id)
        resolved["_backend_pending_event"] = "resolved"
        return {"outcome": "retry", "phase": "resolution", "incident": resolved}
    persisted = (response or {}).get("incident") or {}
    persisted_id = persisted.get("incident_id") or persisted.get("id")
    if persisted_id and str(persisted_id) != str(incident_id):
        logger.error("Backend returned a different ID for Disk resolution: %s != %s", persisted_id, incident_id)
        resolved["_backend_pending_event"] = "resolved"
        return {"outcome": "retry", "phase": "resolution", "incident": resolved}
    return {"outcome": "resolved", "incident": {**resolved, **persisted}}


def manage_disk_incident(
    incident: dict,
    condition_violated: bool,
    *,
    fallback_state: dict | None = None,
) -> dict:
    """Disk-only lifecycle wrapper with explicit retry and recurrence outcomes."""
    key, current, read_error = _disk_active_record(incident)
    if read_error is not None:
        return {"outcome": "retry", "phase": "redis", "reason": "Disk incident state is unavailable"}

    if condition_violated:
        if fallback_state and fallback_state.get("status") == "resolution_pending" and current:
            resolved = manage_incidents(incident, condition_violated=False)
            if (
                resolved
                and resolved.get("status") == "RESOLVED"
                and not resolved.get("_backend_pending_event")
            ):
                return {"outcome": "recovered", "incident": resolved}
            return {
                "outcome": "retry",
                "phase": "resolution",
                "reason": "previous Disk resolution is pending",
                "incident": resolved or current,
            }
        if current is None and fallback_state and (
            fallback_state.get("incident_id")
            or (fallback_state.get("incident") or {}).get("incident_id")
        ):
            recovered = _direct_disk_resolution(incident, fallback_state)
            if recovered.get("outcome") == "resolved":
                recovered["outcome"] = "recovered"
            return recovered
        if current and current.get("_backend_pending_event") == "resolved":
            resolved = manage_incidents(incident, condition_violated=False)
            if (
                resolved
                and resolved.get("status") == "RESOLVED"
                and not resolved.get("_backend_pending_event")
            ):
                return {"outcome": "recovered", "incident": resolved}
            return {
                "outcome": "retry",
                "phase": "resolution",
                "reason": "previous Disk resolution is pending",
                "incident": resolved or current,
            }
        if current and str(current.get("status", "")).upper() in {"RESOLVED", "CLOSED"}:
            try:
                redis_client.delete(key)
            except Exception:
                logger.exception("Unable to clear resolved Disk state before recurrence")
                return {"outcome": "retry", "phase": "resolution", "incident": current}
            return {"outcome": "recovered", "incident": current}

        active = manage_incidents(incident, condition_violated=True)
        if active and active.get("incident_id"):
            return {"outcome": "active", "incident": active}
        return {"outcome": "retry", "phase": "open", "reason": "Disk incident creation is pending"}

    if current is None:
        if fallback_state and (fallback_state.get("incident_id") or (fallback_state.get("incident") or {}).get("incident_id")):
            resolved = _direct_disk_resolution(incident, fallback_state)
            resolved["recovered_state"] = fallback_state
            return resolved
        return {"outcome": "resolved", "incident": None}

    if current.get("_backend_pending_event"):
        resolved = manage_incidents(incident, condition_violated=False)
        if resolved and resolved.get("status") == "RESOLVED" and not resolved.get("_backend_pending_event"):
            return {"outcome": "resolved", "incident": resolved}
        return {
            "outcome": "retry",
            "phase": "resolution",
            "reason": "Disk incident event is pending",
            "incident": resolved or current,
        }

    if str(current.get("status", "")).upper() in {"RESOLVED", "CLOSED"}:
        try:
            redis_client.delete(key)
        except Exception:
            logger.exception("Unable to clear already-resolved Disk state")
            return {"outcome": "retry", "phase": "resolution", "incident": current}
        return {"outcome": "resolved", "incident": current}

    resolved = manage_incidents(incident, condition_violated=False)
    if resolved and resolved.get("status") == "RESOLVED" and not resolved.get("_backend_pending_event"):
        return {"outcome": "resolved", "incident": resolved}
    return {
        "outcome": "retry",
        "phase": "resolution",
        "reason": "Disk incident resolution is pending",
        "incident": resolved or current,
    }
