import hashlib
import json
import logging
import os
import uuid
from datetime import datetime, timezone

import requests

from incident_management.alert_service import publish_incident
from load_data.redis_connection.redis_connection import redis_client


logger = logging.getLogger(__name__)
DECISION_ENGINE_URL = os.environ.get("DECISION_ENGINE_URL", "http://localhost:8002").rstrip("/")

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
    encoded = json.dumps(identity, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def _active_key(fingerprint: str) -> str:
    return f"incident:active:{fingerprint}"


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
    return {key: value for key, value in incident.items() if key != "_backend_pending_event"}


def _retry_pending_event(key: str, incident: dict) -> bool:
    event = incident.get("_backend_pending_event")
    if not event:
        return True
    try:
        publish_incident(_publishable_incident(incident), event)
        incident.pop("_backend_pending_event", None)
        if event == "resolved":
            redis_client.delete(key)
        else:
            redis_client.set(key, json.dumps(incident))
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
        is_new = stored is None
        if stored:
            try:
                current = json.loads(stored)
            except (TypeError, json.JSONDecodeError):
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
        else:
            current = {}

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
