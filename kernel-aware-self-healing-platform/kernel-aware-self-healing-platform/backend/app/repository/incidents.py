import hashlib
import json
import re
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from models.alert_incident import AlertIncident


def _as_datetime(value):
    if isinstance(value, datetime):
        return value
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def _system_id(detail: dict, alert: dict):
    value = detail.get("system_id", alert.get("system_id"))
    if value is None:
        match = re.search(r"(\d+)$", str(detail.get("system") or alert.get("system") or ""))
        value = match.group(1) if match else None
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def _fingerprint(detail: dict, alert: dict) -> str:
    supplied = detail.get("fingerprint") or alert.get("fingerprint")
    if supplied:
        return str(supplied)
    trigger = detail.get("trigger") or {}
    metric = trigger.get("metric") or detail.get("metric") or alert.get("metric")
    category = detail.get("monitor_type") or detail.get("category") or alert.get("category")
    if not category:
        category = "process" if detail.get("process") or detail.get("pid") or alert.get("pid") else "unknown"
    identity = {
        "category": str(category).lower(),
        "system_id": _system_id(detail, alert),
        "rule_id": detail.get("rule_id") or alert.get("rule_id"),
        "target_type": detail.get("target_type") or ("process" if category == "process" else None),
        "target": detail.get("target") or detail.get("process") or alert.get("target"),
        "pid": detail.get("pid") or alert.get("pid"),
        "metric": metric,
    }
    encoded = json.dumps(identity, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def persist_incident(db: Session, event: str, incident_detail: dict, alert: dict | None = None):
    alert = alert or {}
    incident_id = str(
        incident_detail.get("incident_id")
        or incident_detail.get("id")
        or alert.get("incident_id")
        or alert.get("id")
        or ""
    )
    if not incident_id:
        raise ValueError("Incident update is missing an incident ID")

    fingerprint = _fingerprint(incident_detail, alert)
    record = db.get(AlertIncident, incident_id)
    if record is None:
        record = (
            db.query(AlertIncident)
            .filter(
                AlertIncident.fingerprint == fingerprint,
                AlertIncident.status != "RESOLVED",
            )
            .order_by(AlertIncident.created_at.desc())
            .first()
        )
    created = record is None

    trigger = incident_detail.get("trigger") or {}
    status = "RESOLVED" if event == "resolved" else str(
        incident_detail.get("status") or alert.get("status") or "OPEN"
    ).upper()
    monitor_type = str(
        incident_detail.get("monitor_type")
        or incident_detail.get("category")
        or alert.get("category")
        or "unknown"
    ).lower()
    now = datetime.now(timezone.utc)

    if record is None:
        record = AlertIncident(
            incident_id=incident_id,
            fingerprint=fingerprint,
            created_at=_as_datetime(incident_detail.get("created_at")) or now,
            incident_detail={},
        )
        db.add(record)

    incident_detail = {
        **incident_detail,
        "id": record.incident_id,
        "incident_id": record.incident_id,
        "fingerprint": fingerprint,
    }
    if alert:
        alert = {
            **alert,
            "id": record.incident_id,
            "incident_id": record.incident_id,
        }

    record.fingerprint = fingerprint
    record.system_id = _system_id(incident_detail, alert)
    try:
        record.rule_id = int(incident_detail.get("rule_id") or alert.get("rule_id"))
    except (TypeError, ValueError):
        record.rule_id = None
    record.monitor_type = monitor_type
    record.target_type = incident_detail.get("target_type") or alert.get("target_type")
    record.target = (
        incident_detail.get("target")
        or incident_detail.get("process")
        or alert.get("target")
    )
    record.metric = trigger.get("metric") or incident_detail.get("metric") or alert.get("metric")
    try:
        value = trigger.get("currentValue", alert.get("current_value"))
        record.current_value = float(value) if value is not None else None
    except (TypeError, ValueError):
        record.current_value = None
    try:
        threshold = trigger.get("threshold", alert.get("threshold"))
        record.threshold = float(threshold) if threshold is not None else None
    except (TypeError, ValueError):
        record.threshold = None
    record.operator = trigger.get("operator") or alert.get("operator")
    record.severity = incident_detail.get("severity") or alert.get("severity")
    record.priority = incident_detail.get("priority") or alert.get("priority")
    record.status = status
    record.updated_at = _as_datetime(incident_detail.get("updated_at")) or now
    record.resolved_at = (
        _as_datetime(incident_detail.get("resolved_at")) or now
        if status == "RESOLVED"
        else None
    )
    record.incident_detail = incident_detail
    record.alert_payload = alert or record.alert_payload
    db.commit()
    db.refresh(record)
    return record, created


def list_incidents(db: Session, system_id: int | None = None):
    query = db.query(AlertIncident)
    if system_id is not None:
        query = query.filter(AlertIncident.system_id == system_id)
    return query.order_by(AlertIncident.created_at.desc()).all()


def incident_to_dict(record: AlertIncident) -> dict:
    detail = dict(record.incident_detail or {})
    detail.update(
        {
            "id": record.incident_id,
            "incident_id": record.incident_id,
            "fingerprint": record.fingerprint,
            "system_id": record.system_id,
            "rule_id": record.rule_id,
            "monitor_type": record.monitor_type,
            "category": record.monitor_type,
            "target_type": record.target_type,
            "target": record.target,
            "metric": record.metric,
            "current_value": record.current_value,
            "threshold": record.threshold,
            "operator": record.operator,
            "severity": record.severity,
            "priority": record.priority,
            "status": record.status,
            "created_at": _as_datetime(record.created_at).isoformat() if record.created_at else None,
            "updated_at": _as_datetime(record.updated_at).isoformat() if record.updated_at else None,
            "resolved_at": _as_datetime(record.resolved_at).isoformat() if record.resolved_at else None,
            "alert": record.alert_payload,
        }
    )
    return detail
