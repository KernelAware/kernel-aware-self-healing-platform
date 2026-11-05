import os
import logging
from datetime import datetime, timezone

import requests


BACKEND_URL = os.environ.get("KAISP_BACKEND_URL", "http://localhost:8000").rstrip("/")
logger = logging.getLogger(__name__)


def _response_body(response, limit: int = 1200) -> str:
    try:
        body = response.text or "<empty response body>"
    except Exception:
        body = "<response body unavailable>"
    if not isinstance(body, str):
        return "<response body unavailable>"
    return body[:limit] + ("…" if len(body) > limit else "")


def _timestamp(value=None):
    if value:
        return value
    return datetime.now(timezone.utc).isoformat()


def build_payload(incident: dict, event: str) -> dict:
    violated_metric = incident.get("violated_metric") or {}
    metric = incident.get("metric") or violated_metric.get("metric") or "unknown metric"
    system_id = incident.get("system_id")
    target = incident.get("target") or "Whole System"
    category = str(incident.get("monitor_type") or incident.get("incident_type") or "unknown").lower()
    priority = incident.get("incident_priority") or incident.get("priority") or "Medium"
    severity = incident.get("incident_severity") or incident.get("severity") or "Warning"
    status = str(incident.get("status") or "OPEN").upper()
    timestamp = _timestamp(incident.get("updated_at"))

    if isinstance(system_id, int) or str(system_id or "").isdigit():
        system_label = f"server-{int(system_id):02d}"
    else:
        system_label = str(system_id or "Unknown system")

    duration_seconds = int(violated_metric.get("duration_seconds") or 0)
    if duration_seconds < 60:
        duration_label = f"{duration_seconds} seconds"
    elif duration_seconds < 3600:
        duration_label = f"{duration_seconds // 60} minutes"
    else:
        duration_label = f"{duration_seconds // 3600} hours"

    value = incident.get("value")
    threshold = violated_metric.get("threshold")
    operator = violated_metric.get("operator")
    title = incident.get("title") or f"{metric} - {target}"
    body = (
        f"{metric} measured {value}; condition {operator} {threshold} "
        f"for {duration_label}."
    )

    timeline = incident.get("timeline") or []
    detail = {
        "id": incident.get("incident_id"),
        "incident_id": incident.get("incident_id"),
        "fingerprint": incident.get("fingerprint"),
        "analytics_generation": incident.get("analytics_generation"),
        "rule_id": incident.get("rule_id"),
        "monitor_type": category,
        "category": category,
        "system_id": system_id,
        "system": system_label,
        "target_type": incident.get("target_type"),
        "target": target,
        "process": target if category == "process" else None,
        "pid": incident.get("pid"),
        "title": title,
        "priority": priority,
        "severity": severity,
        "created_at": incident.get("created_at") or timestamp,
        "updated_at": timestamp,
        "resolved_at": incident.get("resolved_at"),
        "trigger": {
            "metric": metric,
            "currentValue": value,
            "operator": operator,
            "threshold": threshold,
            "durationSeconds": duration_seconds,
            "duration": duration_label,
        },
        "decision": {
            "recommendedAction": "Alert only" if category == "disk" else (incident.get("decision") or {}).get("Selected_action"),
            "decision": incident.get("decision_outcome") if category != "disk" else None,
            "reason": (
                "Monitoring alert; healing authorization was not evaluated."
                if category == "disk"
                else (incident.get("decision") or {}).get("reason") or "Decision Engine permitted alert publication."
            ),
        },
        "policy": {
            "ruleEnabled": True,
            "outcome": incident.get("policy_outcome") if category != "disk" else "NOT_APPLICABLE",
            "allowed": incident.get("policy", {}).get("allowed") if category != "disk" else None,
            "automaticExecution": None,
            "approvalRequired": None,
            "cooldownPassed": None,
        },
        "rootCause": {
            "verified": False,
            "source": "Monitoring metrics",
            "traceId": None,
            "traceName": None,
            "timeline": timeline,
        },
        "operatorAction": {
            "required": False,
            "message": "This Disk alert is informational; recovery is tracked from the saved rule." if category == "disk" else "See the configured Process rule actions.",
            "recommendedAction": "Alert only" if category == "disk" else None,
            "allowedActions": [],
            "selectedAction": None,
            "reason": "No healing or remediation is configured for Disk alerts." if category == "disk" else None,
        },
        "status": status,
        "decision_outcome": incident.get("decision_outcome") if category != "disk" else None,
        "policy_outcome": incident.get("policy_outcome") if category != "disk" else "NOT_APPLICABLE",
        "event": event,
    }

    tone = {
        "critical": "danger",
        "high": "warning",
        "medium": "muted",
        "warning": "muted",
        "low": "muted",
    }.get(str(severity).lower(), "muted")
    alert = {
        "id": detail["id"],
        "incident_id": detail["id"],
        "rule_id": detail["rule_id"],
        "system_id": system_id,
        "category": category,
        "monitor_type": category,
        "target_type": detail["target_type"],
        "target": target,
        "metric": metric,
        "current_value": value,
        "threshold": threshold,
        "operator": operator,
        "duration_seconds": duration_seconds,
        "severity": severity,
        "priority": priority,
        "level": f"{priority} - {severity}",
        "tone": tone,
        "timestamp": timestamp,
        "title": title,
        "body": body,
        "status": status,
        "decision_outcome": incident.get("decision_outcome") if category != "disk" else None,
        "policy_outcome": incident.get("policy_outcome") if category != "disk" else "NOT_APPLICABLE",
        "acked": False,
        "analytics_generation": incident.get("analytics_generation"),
        "system": system_label,
        "process": detail["process"],
        "pid": detail["pid"],
        "age": "now",
        "event": event,
    }
    return {"incident_detail": detail, "alert": alert}


def _post_alert_event(endpoint: str, incident: dict, event: str, persistence_required: bool) -> dict:
    payload = build_payload(incident, event)
    is_disk = str(incident.get("monitor_type") or incident.get("incident_type") or "").lower() == "disk"
    identity = {
        "system_id": incident.get("system_id"),
        "rule_id": incident.get("rule_id"),
        "incident_id": incident.get("incident_id"),
        "fingerprint": incident.get("fingerprint"),
        "monitor_type": "disk" if is_disk else incident.get("monitor_type"),
        "event": event,
    }
    try:
        if is_disk:
            logger.info("DISK_BACKEND_PUBLICATION_STARTED %s endpoint=/%s", identity, endpoint)
        response = requests.post(
            f"{BACKEND_URL}/{endpoint}",
            json={"event": event, "incident": incident, **payload},
            timeout=10,
        )
        response.raise_for_status()
        result = response.json()
        if not isinstance(result, dict) or result.get("status") != "success":
            raise RuntimeError("Backend did not confirm alert event delivery")
        if persistence_required and not result.get("incident"):
            raise RuntimeError("Backend did not confirm incident persistence")
        if is_disk:
            logger.info(
                "DISK_BACKEND_PUBLICATION_SUCCEEDED %s backend_incident_id=%s",
                identity,
                (result.get("incident") or {}).get("incident_id") or (result.get("incident") or {}).get("id"),
            )
        return result
    except Exception as error:
        if is_disk:
            failed_response = getattr(locals().get("response"), "response", None) or locals().get("response")
            status_code = getattr(failed_response, "status_code", None)
            logger.error(
                "DISK_BACKEND_PUBLICATION_FAILED %s status=%s response_body=%s error=%s",
                identity,
                status_code,
                _response_body(failed_response) if failed_response is not None else "<no HTTP response>",
                type(error).__name__,
            )
        raise


def publish_rule_alert(incident: dict, event: str) -> dict:
    """Persist a Disk rule incident before delivering its WebSocket event."""
    return _post_alert_event("rule-alerts", incident, event, persistence_required=True)


def publish_incident(incident: dict, event: str) -> dict:
    """Keep the persistent incident route for non-Disk incident workflows."""
    if str(incident.get("monitor_type") or incident.get("incident_type") or "").lower() == "disk":
        return publish_rule_alert(incident, event)
    return _post_alert_event("alert_incidents", incident, event, persistence_required=True)
