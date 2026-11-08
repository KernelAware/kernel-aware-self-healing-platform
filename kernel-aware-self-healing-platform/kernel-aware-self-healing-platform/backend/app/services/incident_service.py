from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from database.connection import SessionLocal
from models.incidents import Incident
from repository.incidents import (
    create_or_update_incident,
    get_active_incidents,
    get_all_incidents,
    resolve_incident,
    serialize_incident,
)


def _parse_status(value: Any) -> str:
    if value is None:
        return "OPEN"
    status = str(value).upper().strip()
    if status in {"RESOLVED", "CLOSED", "CLEARED"}:
        return "RESOLVED"
    return "OPEN"


def _coerce_int(value: Any, default: int = 1) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def normalize_incident_payload(payload: dict) -> dict:
    alert = payload.get("alert") or {}
    incident_detail = payload.get("incident_detail") or {}
    operator_action = (
        payload.get("operatorAction")
        or payload.get("operator_action")
        or incident_detail.get("operatorAction")
        or incident_detail.get("operator_action")
        or {}
    )

    raw_id = (
        incident_detail.get("id")
        or incident_detail.get("incident_id")
        or alert.get("id")
        or alert.get("incident_id")
        or "INC-UNKNOWN"
    )
    system_id_value = (
        incident_detail.get("system_id")
        or alert.get("system_id")
        or incident_detail.get("system")
        or alert.get("system")
        or 1
    )
    system_id = _coerce_int(system_id_value)
    category = incident_detail.get("monitor-type") or alert.get("monitor-type") or "system"
    target = (
        incident_detail.get("target")
        or alert.get("target")
        or incident_detail.get("process")
        or alert.get("process")
        or alert.get("service")
        or incident_detail.get("service")
        or "unknown"
    )
    metric = (
        incident_detail.get("metric")
        or alert.get("metric")
        or (incident_detail.get("trigger") or {}).get("metric")
        or (alert.get("trigger") or {}).get("metric")
        or "unknown"
    )
    severity = incident_detail.get("severity") or alert.get("severity") or "Medium"
    priority = incident_detail.get("priority") or alert.get("priority") or "P2"
    status = _parse_status(incident_detail.get("status") or alert.get("status"))
    now = datetime.now(timezone.utc)
    detail = {
        "title": incident_detail.get("title") or alert.get("title") or "Incident Detected",
        "description": incident_detail.get("description") or alert.get("body") or "Incident detected",
        "trigger": incident_detail.get("trigger") or {},
        "decision": incident_detail.get("decision") or {},
        "policy": incident_detail.get("policy") or {},
        "rootCause": incident_detail.get("rootCause") or {},
        "operatorAction": operator_action,
        "system": incident_detail.get("system") or alert.get("system"),
        "process": incident_detail.get("process") or alert.get("process"),
        "pid": incident_detail.get("pid") if incident_detail.get("pid") is not None else alert.get("pid"),
        "status": status,
    }

    normalized = {
        "id": str(raw_id)[:40],
        "rule_id": incident_detail.get("rule_id") or alert.get("rule_id"),
        "system_id": system_id,
        "category": str(category),
        "target": str(target),
        "metric": str(metric),
        "severity": str(severity),
        "priority": str(priority),
        "status": status,
        "opened_at": now,
        "updated_at": now,
        "resolved_at": now if status == "RESOLVED" else None,
        "detail": detail,
        "alert": alert if isinstance(alert, dict) else {},
        "created_at": now,
    }
    return normalized


def persist_incident(payload: dict):
    normalized = normalize_incident_payload(payload)
    db = SessionLocal()
    try:
        incident = create_or_update_incident(db, normalized)
        return serialize_incident(incident)
    finally:
        db.close()


def list_incidents(system_id: int | None = None):
    db = SessionLocal()
    try:
        incidents = get_all_incidents(db, system_id=system_id)
        return [serialize_incident(incident) for incident in incidents]
    finally:
        db.close()


def list_open_incidents(system_id: int | None = None):
    db = SessionLocal()
    try:
        incidents = get_active_incidents(db, system_id=system_id)
        return [serialize_incident(incident) for incident in incidents]
    finally:
        db.close()


def get_incident(incident_id: str):
    db = SessionLocal()
    try:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if incident is None:
            return None
        return serialize_incident(incident)
    finally:
        db.close()


def resolve_incident_by_id(incident_id: str):
    db = SessionLocal()
    try:
        incident = resolve_incident(db, incident_id)
        if incident is None:
            return None
        return serialize_incident(incident)
    finally:
        db.close()
