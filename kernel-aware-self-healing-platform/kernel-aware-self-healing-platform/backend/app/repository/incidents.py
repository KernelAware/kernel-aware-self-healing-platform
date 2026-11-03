from datetime import datetime, timezone

from sqlalchemy.orm import Session

from models.incidents import Incident


def _as_status(raw_status: str | None) -> str:
    if raw_status is None:
        return "OPEN"
    normalized = str(raw_status).upper().strip()
    if normalized in {"RESOLVED", "CLOSED", "CLEARED"}:
        return "RESOLVED"
    return "OPEN"


def get_incident_by_id(db: Session, incident_id: str) -> Incident | None:
    return db.query(Incident).filter(Incident.id == incident_id).first()


def get_all_incidents(db: Session, system_id: int | None = None):
    query = db.query(Incident)
    if system_id is not None:
        query = query.filter(Incident.system_id == system_id)
    return query.order_by(Incident.created_at.desc()).all()


def get_active_incidents(db: Session, system_id: int | None = None):
    query = db.query(Incident).filter(Incident.status != "RESOLVED")
    if system_id is not None:
        query = query.filter(Incident.system_id == system_id)
    return query.order_by(Incident.created_at.desc()).all()


def create_or_update_incident(db: Session, incident_data: dict) -> Incident:
    incident_id = str(incident_data.get("id") or incident_data.get("incident_id") or "").strip()
    if not incident_id:
        raise ValueError("Incident id is required")

    existing = get_incident_by_id(db, incident_id)
    now = datetime.now(timezone.utc)

    if existing is not None:
        existing.rule_id = incident_data.get("rule_id", existing.rule_id)
        existing.system_id = int(incident_data.get("system_id") or existing.system_id)
        existing.category = incident_data.get("category") or existing.category
        existing.target = incident_data.get("target") or existing.target
        existing.metric = incident_data.get("metric") or existing.metric
        existing.severity = incident_data.get("severity") or existing.severity
        existing.priority = incident_data.get("priority") or existing.priority
        existing.status = _as_status(incident_data.get("status") or existing.status)
        existing.opened_at = incident_data.get("opened_at") or existing.opened_at or now
        existing.updated_at = now
        existing.resolved_at = incident_data.get("resolved_at") if incident_data.get("resolved_at") is not None else None if existing.status != "RESOLVED" else existing.resolved_at or now
        existing.detail = incident_data.get("detail") or existing.detail or {}
        existing.alert = incident_data.get("alert") or existing.alert or {}
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing

    new_incident = Incident(
        id=incident_id,
        rule_id=incident_data.get("rule_id"),
        system_id=int(incident_data.get("system_id") or 1),
        category=str(incident_data.get("category") or "system"),
        target=str(incident_data.get("target") or "unknown"),
        metric=str(incident_data.get("metric") or "unknown"),
        severity=str(incident_data.get("severity") or "Medium"),
        priority=str(incident_data.get("priority") or "P2"),
        status=_as_status(incident_data.get("status")),
        opened_at=incident_data.get("opened_at") or now,
        updated_at=now,
        resolved_at=incident_data.get("resolved_at"),
        detail=incident_data.get("detail") or {},
        alert=incident_data.get("alert") or {},
        created_at=incident_data.get("created_at") or now,
    )
    if new_incident.status == "RESOLVED" and new_incident.resolved_at is None:
        new_incident.resolved_at = now
    db.add(new_incident)
    db.commit()
    db.refresh(new_incident)
    return new_incident


def resolve_incident(db: Session, incident_id: str) -> Incident | None:
    incident = get_incident_by_id(db, incident_id)
    if incident is None:
        return None
    incident.status = "RESOLVED"
    incident.updated_at = datetime.now(timezone.utc)
    incident.resolved_at = incident.resolved_at or datetime.now(timezone.utc)
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident


def serialize_incident(incident: Incident) -> dict:
    return {
        "id": incident.id,
        "rule_id": incident.rule_id,
        "system_id": incident.system_id,
        "category": incident.category,
        "target": incident.target,
        "metric": incident.metric,
        "severity": incident.severity,
        "priority": incident.priority,
        "status": incident.status,
        "opened_at": incident.opened_at.isoformat() if incident.opened_at else None,
        "updated_at": incident.updated_at.isoformat() if incident.updated_at else None,
        "resolved_at": incident.resolved_at.isoformat() if incident.resolved_at else None,
        "detail": incident.detail or {},
        "alert": incident.alert or {},
        "created_at": incident.created_at.isoformat() if incident.created_at else None,
    }
