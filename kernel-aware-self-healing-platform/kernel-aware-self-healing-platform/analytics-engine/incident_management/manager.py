import hashlib
import json
import logging
import os
import threading
import uuid
from datetime import datetime, timezone

import requests

from incident_management.alert_service import publish_incident
from load_data.redis_connection.redis_connection import redis_client
from lifecycle import ANALYTICS_GENERATION


logger = logging.getLogger(__name__)
DECISION_ENGINE_URL = os.environ.get("DECISION_ENGINE_URL", "http://localhost:8002").rstrip("/")
DECISION_ENGINE_TIMEOUT_SECONDS = 5
DECISION_RETRY_BASE_SECONDS = 15
DECISION_RETRY_MAX_SECONDS = 300
BACKEND_RETRY_BASE_SECONDS = 15
BACKEND_RETRY_MAX_SECONDS = 300
INCIDENT_RETRY_SCAN_COUNT = 100
_incident_state_lock = threading.RLock()


def _generation_timestamp(generation: str | None) -> int | None:
    value = str(generation or "")
    timestamp = value.split("-", 1)[0]
    return int(timestamp) if timestamp.isdigit() and len(timestamp) >= 16 else None


def _incoming_generation_is_stale(current: str | None, incoming: str | None) -> bool:
    current_timestamp = _generation_timestamp(current)
    incoming_timestamp = _generation_timestamp(incoming)
    return (
        current_timestamp is not None
        and incoming_timestamp is not None
        and incoming_timestamp < current_timestamp
    )


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
    encoded = json.dumps(identity, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def _active_key(fingerprint: str) -> str:
    return f"incident:active:{fingerprint}"


def _is_disk_incident(incident: dict) -> bool:
    return str(incident.get("monitor_type") or incident.get("incident_type") or "").strip().lower() == "disk"


def _is_retryable_disk_open(incident: dict) -> bool:
    """Limit the independent worker to pending Disk alert publication."""
    return (
        _is_disk_incident(incident)
        and incident.get("_backend_pending_event") == "opened"
        and str(incident.get("status") or "").upper() == "OPEN"
        and incident.get("_decision_status") not in {"invalid_rule", "rejected"}
    )


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
        if not key.startswith("_")
    }


def _retry_pending_event(key: str, incident: dict) -> bool:
    event = incident.get("_backend_pending_event")
    if not event:
        return True
    now = datetime.now(timezone.utc).timestamp()
    if now < float(incident.get("_backend_retry_at") or 0):
        return False
    if event != "resolved" and str(incident.get("status", "")).upper() != "OPEN":
        logger.warning("Skipping stale %s retry for non-open incident %s", event, incident.get("incident_id"))
        return False
    if event != "resolved" and not _evaluate_for_publication(key, incident):
        return False
    attempt = int(incident.get("_backend_attempts") or 0) + 1
    incident["_backend_attempts"] = attempt
    try:
        response = publish_incident(_publishable_incident(incident), event)
        persisted = (response or {}).get("incident") or {}
        persisted_id = persisted.get("incident_id") or persisted.get("id")
        if persisted_id:
            incident["incident_id"] = persisted_id
        if not _is_disk_incident(incident):
            # Preserve the established retry behavior for the other monitor types.
            incident.pop("_backend_pending_event", None)
            incident.pop("_backend_retry_at", None)
            incident.pop("_backend_attempts", None)
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
                retry_cleared.pop("_backend_retry_at", None)
                retry_cleared.pop("_backend_attempts", None)
                redis_client.set(key, json.dumps(retry_cleared))
            incident.pop("_backend_pending_event", None)
            incident.pop("_backend_retry_at", None)
            incident.pop("_backend_attempts", None)
    except Exception:
        logger.exception(
            "Unable to complete pending %s event for incident %s",
            event,
            incident.get("incident_id"),
        )
        incident["_backend_retry_at"] = now + min(
            BACKEND_RETRY_BASE_SECONDS * (2 ** min(max(0, attempt - 1), 8)),
            BACKEND_RETRY_MAX_SECONDS,
        )
        try:
            redis_client.set(key, json.dumps(incident))
        except Exception:
            logger.exception("Unable to retain pending backend retry state for incident %s", incident.get("incident_id"))
        return False
    return True


def _decision_retry_delay(attempt: int) -> int:
    exponent = min(max(0, attempt - 1), 8)
    return min(DECISION_RETRY_BASE_SECONDS * (2 ** exponent), DECISION_RETRY_MAX_SECONDS)


def _response_body(response, limit: int = 1200) -> str:
    try:
        body = response.text or "<empty response body>"
    except Exception:
        body = "<response body unavailable>"
    if not isinstance(body, str):
        return "<response body unavailable>"
    return body[:limit] + ("…" if len(body) > limit else "")


def _decision_error_outcome(response) -> str | None:
    body = _response_body(response)
    if not body.startswith("{"):
        return None
    try:
        payload = json.loads(body)
        detail = payload.get("detail") if isinstance(payload, dict) else None
        return detail.get("outcome") if isinstance(detail, dict) else None
    except (TypeError, json.JSONDecodeError):
        return None


def _evaluate_for_publication(key: str, incident: dict) -> bool:
    """Persist and retry Decision Engine evaluation before any opened event."""
    if incident.get("_decision_publication_outcome") == "PUBLISH":
        return True
    if incident.get("_decision_status") in {"invalid_rule", "rejected"}:
        return False
    now = datetime.now(timezone.utc).timestamp()
    if now < float(incident.get("_decision_retry_at") or 0):
        return False
    attempt = int(incident.get("_decision_attempts") or 0) + 1
    incident.update({"_decision_attempts": attempt, "_decision_status": "pending"})
    try:
        redis_client.set(key, json.dumps(incident))
        if _is_disk_incident(incident):
            logger.info(
                "DISK_DECISION_REQUEST_SENT endpoint=/decisions system_id=%s rule_id=%s incident_id=%s fingerprint=%s monitor_type=disk pending_event=%s attempt=%s",
                incident.get("system_id"), incident.get("rule_id"),
                incident.get("incident_id"), incident.get("fingerprint"),
                incident.get("_backend_pending_event"), attempt,
            )
        response = requests.post(
            f"{DECISION_ENGINE_URL}/decisions",
            json=_publishable_incident(incident),
            timeout=DECISION_ENGINE_TIMEOUT_SECONDS,
        )
        if _is_disk_incident(incident):
            logger.info(
                "DISK_DECISION_RESPONSE_RECEIVED endpoint=/decisions system_id=%s rule_id=%s incident_id=%s fingerprint=%s monitor_type=disk pending_event=%s status=%s body=%s",
                incident.get("system_id"), incident.get("rule_id"),
                incident.get("incident_id"), incident.get("fingerprint"),
                incident.get("_backend_pending_event"),
                response.status_code, _response_body(response),
            )
        response.raise_for_status()
        result = response.json()
        if not isinstance(result, dict):
            raise ValueError("Decision Engine response must be a JSON object")
        if result.get("incident_id") != incident.get("incident_id") or result.get("fingerprint") != incident.get("fingerprint"):
            raise ValueError("Decision Engine response identity does not match incident")
        if (
            not isinstance(result.get("decision"), dict)
            or not isinstance(result.get("policy"), dict)
            or not isinstance(result.get("publication"), dict)
        ):
            raise ValueError("Decision Engine response is missing publication or decision data")
        publication_outcome = result["publication"].get("outcome")
        if publication_outcome not in {"PUBLISH", "REJECT"}:
            raise ValueError("Decision Engine returned an unknown publication outcome")
        outcome = result.get("outcome")
        if outcome not in {"PERMITTED", "DENIED", "APPROVAL_REQUIRED"}:
            raise ValueError("Decision Engine returned an unknown outcome")
        if publication_outcome == "PUBLISH" and str(
            (result.get("publication") or {}).get("reason") or ""
        ).strip() == "":
            raise ValueError("Decision Engine published an incident without a reason")
        incident["_decision_outcome"] = outcome
        incident["_decision_publication_outcome"] = publication_outcome
        incident["_decision_result"] = result
        incident["_decision_status"] = "evaluated"
        incident.pop("_decision_last_error", None)
        incident.pop("_decision_http_status", None)
        incident["decision_outcome"] = outcome
        incident["policy_outcome"] = result.get("policy", {}).get("reason") or "ALLOWED"
        incident["decision"] = result.get("decision")
        incident["policy"] = result.get("policy")
        incident["publication"] = result.get("publication")
        incident["publication_outcome"] = publication_outcome
        if publication_outcome == "PUBLISH":
            incident.pop("_decision_retry_at", None)
            redis_client.set(key, json.dumps(incident))
            if _is_disk_incident(incident):
                logger.info(
                    "DISK_PUBLICATION_DECISION_PUBLISH system_id=%s rule_id=%s incident_id=%s fingerprint=%s healing_outcome=%s",
                    incident.get("system_id"), incident.get("rule_id"),
                    incident.get("incident_id"), incident.get("fingerprint"), outcome,
                )
            return True
        incident["_decision_status"] = "rejected"
        if _is_disk_incident(incident):
            logger.warning(
                "DISK_DECISION_REJECTED system_id=%s rule_id=%s incident_id=%s fingerprint=%s outcome=%s allowed=%s",
                incident.get("system_id"), incident.get("rule_id"),
                incident.get("incident_id"), incident.get("fingerprint"),
                outcome, result["policy"].get("allowed"),
            )
        incident["_decision_retry_at"] = now + _decision_retry_delay(attempt)
        redis_client.set(key, json.dumps(incident))
        return False
    except Exception as error:
        response = getattr(error, "response", None)
        status_code = getattr(response, "status_code", None) if response is not None else None
        if response is not None:
            incident["_decision_http_status"] = status_code
        error_outcome = _decision_error_outcome(response) if response is not None else None
        permanent_client_error = (
            isinstance(status_code, int)
            and 400 <= status_code < 500
            and status_code != 429
        )
        incident["_decision_status"] = (
            "invalid_rule" if error_outcome == "INVALID_RULE"
            else "rejected" if permanent_client_error
            else "pending"
        )
        incident["_decision_last_error"] = error_outcome or type(error).__name__
        if permanent_client_error:
            incident.pop("_decision_retry_at", None)
        else:
            incident["_decision_retry_at"] = now + _decision_retry_delay(attempt)
        try:
            redis_client.set(key, json.dumps(incident))
        except Exception:
            logger.exception("Unable to retain pending decision state for incident %s", incident.get("incident_id"))
        if _is_disk_incident(incident):
            logger.error(
                "DISK_DECISION_REJECTED endpoint=/decisions system_id=%s rule_id=%s incident_id=%s fingerprint=%s monitor_type=disk pending_event=%s status=%s response_body=%s error=%s",
                incident.get("system_id"), incident.get("rule_id"),
                incident.get("incident_id"), incident.get("fingerprint"),
                incident.get("_backend_pending_event"),
                incident.get("_decision_http_status"),
                _response_body(response) if response is not None else "<no HTTP response>",
                type(error).__name__,
            )
        else:
            logger.exception("Decision Engine evaluation failed for incident %s", incident.get("incident_id"))
        return False


def _manage_incidents(incident: dict, condition_violated: bool = True):
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
        reopened = False
        if stored:
            try:
                current = json.loads(stored)
            except (TypeError, json.JSONDecodeError):
                current = {}
                is_new = True
            if is_disk and not isinstance(current, dict):
                current = {}
                is_new = True
            if is_disk and current.get("incident_id") and (
                current.get("_backend_pending_event") == "resolved"
                or str(current.get("status", "")).upper() in {"RESOLVED", "CLOSED"}
            ):
                # A newly qualified violation supersedes a stale pending
                # resolution for the same fingerprint. Reopen the same row and
                # identity; never make resolution delivery a prerequisite.
                current["status"] = "OPEN"
                current["resolved_at"] = None
                current["_backend_pending_event"] = "opened"
                current.pop("_backend_retry_at", None)
                current.pop("_backend_attempts", None)
                current.pop("_recovery_pending", None)
                for field in (
                    "_decision_outcome", "_decision_publication_outcome", "_decision_result", "_decision_status",
                    "_decision_retry_at", "_decision_attempts", "_decision_last_error",
                    "_decision_http_status", "decision_outcome", "policy_outcome",
                    "decision", "policy", "publication", "publication_outcome",
                ):
                    current.pop(field, None)
                timeline = list(current.get("timeline") or [])
                timeline.append(_event({**current, **incident}, "OPEN", "Violation detected again", "warning"))
                current["timeline"] = timeline
                reopened = True
                try:
                    redis_client.set(key, json.dumps(current))
                except Exception:
                    logger.exception("Unable to retain re-opened Disk incident state")
                    return current
            elif current.get("_backend_pending_event") == "resolved":
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
            if current.get("analytics_generation") != incident.get("analytics_generation"):
                if is_disk:
                    if _incoming_generation_is_stale(
                        current.get("analytics_generation"),
                        incident.get("analytics_generation"),
                    ):
                        logger.warning(
                            "Ignoring stale Disk observation from Analytics generation %s; current generation is %s",
                            incident.get("analytics_generation"),
                            current.get("analytics_generation"),
                        )
                        return current
                    # A new generation starts a new active incident identity.
                    # The prior PostgreSQL row remains historical, while this
                    # shared Redis slot is safely replaced for the new run.
                    current = {}
                    is_new = True
                    pending_event = "opened"
                elif not is_new:
                    # Preserve the established Process identity across runs.
                    current["analytics_generation"] = incident.get("analytics_generation")
                    current["_backend_pending_event"] = "opened"
                    pending_event = "opened"
                    try:
                        redis_client.set(key, json.dumps(current))
                    except Exception:
                        logger.exception("Unable to retain incident across Analytics generation")
                        return current
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
                if (
                    current.get("_decision_publication_outcome") != "PUBLISH"
                ):
                    if not _evaluate_for_publication(key, current):
                        return current
                    stored = json.dumps(current)
                    redis_client.set(key, stored)
                else:
                    return current

        publish_event = current.get("_backend_pending_event") or ("opened" if is_new else "updated")
        if reopened:
            publish_event = "opened"

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
        incident.pop("_backend_retry_at", None)
        incident.pop("_backend_attempts", None)
        if is_new:
            incident["timeline"].append(_event(incident, "OPEN", "Incident opened", "warning"))
        try:
            if is_disk:
                logger.info(
                    "DISK_INCIDENT_STATE_CREATED system_id=%s rule_id=%s incident_id=%s fingerprint=%s monitor_type=disk event=%s reopened=%s",
                    incident.get("system_id"), incident.get("rule_id"),
                    incident.get("incident_id"), fingerprint, publish_event, reopened,
                )
            redis_client.set(key, json.dumps(incident))
        except Exception:
            logger.exception("Unable to persist active incident state in Redis")
            return None

        if (
            not _evaluate_for_publication(key, incident)
        ):
            return incident

        try:
            if is_disk:
                logger.info(
                    "DISK_BACKEND_PUBLICATION_STARTED system_id=%s rule_id=%s incident_id=%s fingerprint=%s monitor_type=disk event=%s",
                    incident.get("system_id"), incident.get("rule_id"),
                    incident.get("incident_id"), fingerprint, publish_event,
                )
            response = publish_incident(_publishable_incident(incident), publish_event)
        except Exception:
            if is_disk:
                logger.exception(
                    "DISK_BACKEND_PUBLICATION_FAILED system_id=%s rule_id=%s incident_id=%s fingerprint=%s monitor_type=disk event=%s; retaining retry state",
                    incident.get("system_id"), incident.get("rule_id"),
                    incident.get("incident_id"), fingerprint, publish_event,
                )
            else:
                logger.exception(
                    "Unable to publish %s event for incident %s to the backend; will retry that event",
                    publish_event, incident["incident_id"],
                )
            incident["_backend_attempts"] = int(incident.get("_backend_attempts") or 0) + 1
            incident["_backend_retry_at"] = datetime.now(timezone.utc).timestamp() + min(
                BACKEND_RETRY_BASE_SECONDS * (2 ** min(incident["_backend_attempts"] - 1, 8)),
                BACKEND_RETRY_MAX_SECONDS,
            )
            try:
                redis_client.set(key, json.dumps(incident))
            except Exception:
                logger.exception("Unable to retain backend retry deadline for incident %s", incident["incident_id"])
        else:
            persisted = (response or {}).get("incident") or {}
            persisted_id = persisted.get("incident_id") or persisted.get("id")
            if persisted_id and persisted_id != incident["incident_id"]:
                incident["incident_id"] = persisted_id
            incident.pop("_backend_pending_event", None)
            incident.pop("_backend_retry_at", None)
            incident.pop("_backend_attempts", None)
            if is_disk:
                logger.info(
                    "DISK_BACKEND_PUBLICATION_SUCCEEDED system_id=%s rule_id=%s incident_id=%s fingerprint=%s monitor_type=disk event=%s backend_incident_id=%s",
                    incident.get("system_id"), incident.get("rule_id"),
                    incident.get("incident_id"), fingerprint, publish_event,
                    persisted_id or incident.get("incident_id"),
                )
            try:
                redis_client.set(key, json.dumps(incident))
            except Exception:
                logger.exception(
                    "Backend accepted %s event for incident %s, but Redis did not clear the retry marker",
                    publish_event,
                    incident["incident_id"],
                )

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
        current["_recovery_pending"] = {
            key: value for key, value in incident.items()
            if not key.startswith("_")
        }
        try:
            redis_client.set(key, json.dumps(current))
        except Exception:
            logger.exception("Unable to retain recovery intent for incident %s", current.get("incident_id"))
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
    resolved.pop("_backend_retry_at", None)
    resolved.pop("_backend_attempts", None)
    try:
        redis_client.set(key, json.dumps(resolved))
    except Exception:
        logger.exception("Unable to queue resolution for incident %s in Redis", current["incident_id"])
        return resolved
    try:
        publish_incident(_publishable_incident(resolved), "resolved")
    except Exception:
        logger.exception("Unable to publish resolution for incident %s", current["incident_id"])
        resolved["_backend_attempts"] = 1
        resolved["_backend_retry_at"] = datetime.now(timezone.utc).timestamp() + BACKEND_RETRY_BASE_SECONDS
        try:
            redis_client.set(key, json.dumps(resolved))
        except Exception:
            logger.exception("Unable to retain resolution retry deadline for incident %s", current["incident_id"])
        return resolved

    try:
        redis_client.delete(key)
    except Exception:
        logger.exception("Unable to clear resolved incident state from Redis")
        return resolved
    if _is_disk_incident(incident):
        resolved.pop("_backend_pending_event", None)
    return resolved


def manage_incidents(incident: dict, condition_violated: bool = True):
    """Serialize detector mutations against the background retry worker."""
    with _incident_state_lock:
        return _manage_incidents(incident, condition_violated)


def retry_pending_incidents() -> dict:
    """Retry due incident work from Redis without requiring detector calls."""
    result = {"scanned": 0, "retried": 0, "failed": 0}
    with _incident_state_lock:
        try:
            keys = redis_client.scan_iter(match="incident:active:*", count=INCIDENT_RETRY_SCAN_COUNT)
            for key in keys:
                result["scanned"] += 1
                try:
                    stored = redis_client.get(key)
                    if stored is None:
                        continue
                    incident = json.loads(stored)
                    if not isinstance(incident, dict):
                        logger.error("Ignoring malformed pending incident state at %s", key)
                        continue
                    if not _is_retryable_disk_open(incident):
                        continue
                    retry_at = float(incident.get("_backend_retry_at") or 0)
                    if (
                        incident.get("_backend_pending_event") != "resolved"
                        and incident.get("_decision_publication_outcome") != "PUBLISH"
                    ):
                        retry_at = max(retry_at, float(incident.get("_decision_retry_at") or 0))
                    if datetime.now(timezone.utc).timestamp() < retry_at:
                        continue
                    # Selected open records still pass the Decision Engine
                    # gate in the shared publication helper.
                    before = incident.get("_backend_pending_event")
                    if _retry_pending_event(key, incident):
                        result["retried"] += 1
                    else:
                        result["failed"] += 1
                    logger.info(
                        "Pending incident retry processed: incident_id=%s event=%s result=%s",
                        incident.get("incident_id"), before,
                        "complete" if not incident.get("_backend_pending_event") else "pending",
                    )
                except (TypeError, ValueError, json.JSONDecodeError):
                    logger.exception("Ignoring malformed incident retry state at %s", key)
                except Exception:
                    result["failed"] += 1
                    logger.exception("Pending incident retry failed for Redis key %s", key)
        except Exception:
            result["failed"] += 1
            logger.exception("Unable to scan pending incidents in Redis")
    return result


def republish_active_disk_incidents(
    generation: str,
    active_incident_ids: set[str] | None = None,
) -> dict:
    """Restore missing current-run Disk state after a Backend restart."""
    result = {"scanned": 0, "republished": 0, "failed": 0}
    existing_ids = {str(value) for value in (active_incident_ids or set())}
    try:
        keys = redis_client.scan_iter(match="incident:active:*", count=INCIDENT_RETRY_SCAN_COUNT)
        for key in keys:
            result["scanned"] += 1
            try:
                stored = redis_client.get(key)
                if stored is None:
                    continue
                incident = json.loads(stored)
                if not isinstance(incident, dict) or not _is_disk_incident(incident):
                    continue
                if incident.get("analytics_generation") != generation:
                    continue
                if str(incident.get("status") or "").upper() != "OPEN":
                    continue
                incident_id = incident.get("incident_id") or incident.get("id")
                if not incident_id or str(incident_id) in existing_ids:
                    continue
                if incident.get("_decision_publication_outcome") != "PUBLISH":
                    continue
                incident["_backend_pending_event"] = "opened"
                incident["_backend_retry_at"] = 0
                redis_client.set(key, json.dumps(incident))
                if _retry_pending_event(key, incident):
                    result["republished"] += 1
                    existing_ids.add(str(incident_id))
                else:
                    result["failed"] += 1
            except (TypeError, ValueError, json.JSONDecodeError):
                result["failed"] += 1
                logger.exception("Unable to reconcile active Disk incident state at %s", key)
            except Exception:
                result["failed"] += 1
                logger.exception("Active Disk incident reconciliation failed for Redis key %s", key)
    except Exception:
        result["failed"] += 1
        logger.exception("Unable to scan active Disk incidents for Backend reconciliation")
    return result


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
