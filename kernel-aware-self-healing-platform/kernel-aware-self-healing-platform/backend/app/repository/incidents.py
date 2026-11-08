
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from models.incidents import Incident


def _first_value(*values):
    for value in values:
        if value is not None and (not isinstance(value, str) or value.strip()):
            return value
    return None


def _as_int(value, field: str, *, required: bool = False) -> int | None:
    if value is None:
        if required:
            raise ValueError(f"Incident is missing {field}")
        return None

    if isinstance(value, bool):
        raise ValueError(f"Incident has an invalid {field}")

    try:
        return int(value)
    except (TypeError, ValueError) as error:
        raise ValueError(f"Incident has an invalid {field}") from error


def _as_datetime(value, field: str) -> datetime | None:
    if value is None or value == "":
        return None

    if isinstance(value, datetime):
        parsed = value
    else:
        try:
            parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except ValueError as error:
            raise ValueError(f"Incident has an invalid {field}") from error

    return parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed


def _required_string(value, field: str, max_length: int) -> str:
    if value is None or not str(value).strip():
        raise ValueError(f"Incident is missing {field}")

    result = str(value)

    if len(result) > max_length:
        raise ValueError(f"Incident {field} exceeds {max_length} characters")

    return result


def _incident_id(incident_detail: dict, alert: dict) -> str:
    value = _first_value(
        incident_detail.get("incident_id"),
        incident_detail.get("id"),
        alert.get("incident_id"),
        alert.get("id"),
    )

    return _required_string(value, "id", 40)


def persist_incident(
    db: Session,
    event: str,
    incident_detail: dict,
    alert: dict | None = None,
):
    """Insert or update the existing incidents row using its existing identity."""

    alert = alert or {}
    record_id = _incident_id(incident_detail, alert)
    record = db.get(Incident, record_id)
    created = record is None

    trigger = incident_detail.get("trigger") or {}
    now = datetime.now(timezone.utc)

    rule_id = _as_int(
        _first_value(incident_detail.get("rule_id"), alert.get("rule_id")),
        "rule_id",
    )

    if rule_id is None and record is not None:
        rule_id = record.rule_id

    system_id = _as_int(
        _first_value(incident_detail.get("system_id"), alert.get("system_id")),
        "system_id",
        required=record is None,
    )

    if system_id is None and record is not None:
        system_id = record.system_id

    category_value = _first_value(
        incident_detail.get("monitor_type"),
        incident_detail.get("category"),
        incident_detail.get("incident_type"),
        alert.get("monitor_type"),
        alert.get("category"),
        record.category if record is not None else None,
    )

    category = _required_string(category_value, "category", 30).lower()

    target_value = _first_value(
        incident_detail.get("target"),
        incident_detail.get("process"),
        alert.get("target"),
        alert.get("process"),
        record.target if record is not None else None,
    )

    target = _required_string(target_value, "target", 255)

    metric_value = _first_value(
        trigger.get("metric"),
        incident_detail.get("metric"),
        alert.get("metric"),
        record.metric if record is not None else None,
    )

    metric = _required_string(metric_value, "metric", 150)

    severity_value = _first_value(
        incident_detail.get("severity"),
        incident_detail.get("incident_severity"),
        alert.get("severity"),
        record.severity if record is not None else None,
    )

    severity = _required_string(severity_value, "severity", 30)

    priority_value = _first_value(
        incident_detail.get("priority"),
        incident_detail.get("incident_priority"),
        alert.get("priority"),
        record.priority if record is not None else None,
    )

    priority = _required_string(priority_value, "priority", 30)

    event_name = str(event or "opened").lower()

    status_value = (
        "RESOLVED"
        if event_name == "resolved"
        else _first_value(
            incident_detail.get("status"),
            alert.get("status"),
            record.status if record is not None else None,
            "OPEN",
        )
    )

    status = _required_string(status_value, "status", 20).upper()

    opened_at = _as_datetime(
        _first_value(
            incident_detail.get("opened_at"),
            incident_detail.get("openedAt"),
            incident_detail.get("created_at"),
            incident_detail.get("createdAt"),
            alert.get("opened_at"),
            alert.get("openedAt"),
        ),
        "opened_at",
    ) or (record.opened_at if record is not None else now)

    updated_at = _as_datetime(
        _first_value(
            incident_detail.get("updated_at"),
            incident_detail.get("updatedAt"),
            alert.get("updated_at"),
            alert.get("updatedAt"),
        ),
        "updated_at",
    ) or now

    if status in {"RESOLVED", "CLOSED"}:
        resolved_at = _as_datetime(
            _first_value(
                incident_detail.get("resolved_at"),
                incident_detail.get("resolvedAt"),
                alert.get("resolved_at"),
                alert.get("resolvedAt"),
            ),
            "resolved_at",
        ) or (
            record.resolved_at if record is not None else None
        ) or now
    else:
        resolved_at = None

    detail_payload = dict(incident_detail)

    detail_payload.update(
        {
            "id": record_id,
            "incident_id": record_id,
            "rule_id": rule_id,
            "system_id": system_id,
            "category": category,
            "monitor_type": category,
            "target": target,
            "metric": metric,
            "severity": severity,
            "priority": priority,
            "status": status,
            "opened_at": opened_at.isoformat(),
            "updated_at": updated_at.isoformat(),
            "resolved_at": resolved_at.isoformat() if resolved_at else None,
        }
    )

    alert_payload = dict(
        alert or (record.alert if record is not None else {})
    )

    alert_payload.update(
        {
            "id": record_id,
            "incident_id": record_id,
            "rule_id": rule_id,
            "system_id": system_id,
            "category": category,
            "monitor_type": category,
            "target": target,
            "metric": metric,
            "severity": severity,
            "priority": priority,
            "status": status,
        }
    )

    if record is None:
        record = Incident(
            id=record_id,
            rule_id=rule_id,
            system_id=system_id,
            category=category,
            target=target,
            metric=metric,
            severity=severity,
            priority=priority,
            status=status,
            opened_at=opened_at,
            updated_at=updated_at,
            resolved_at=resolved_at,
            detail=detail_payload,
            alert=alert_payload,
        )

        db.add(record)

    else:
        record.rule_id = rule_id
        record.system_id = system_id
        record.category = category
        record.target = target
        record.metric = metric
        record.severity = severity
        record.priority = priority
        record.status = status
        record.opened_at = opened_at
        record.updated_at = updated_at
        record.resolved_at = resolved_at
        record.detail = detail_payload
        record.alert = alert_payload

    db.commit()
    db.refresh(record)

    return record, created


def list_incidents(
    db: Session,
    system_id: int | None = None,
    exclude_monitor_type: str | None = None,
    monitor_type: str | None = None,
    status: str | None = None,
):
    query = db.query(Incident)

    if system_id is not None:
        query = query.filter(Incident.system_id == int(system_id))

    if exclude_monitor_type:
        query = query.filter(
            Incident.category != exclude_monitor_type.lower()
        )

    if monitor_type:
        query = query.filter(
            Incident.category == monitor_type.lower()
        )

    if status:
        query = query.filter(
            Incident.status == status.upper()
        )

    return query.order_by(
        Incident.created_at.desc(),
        Incident.id.desc(),
    ).all()


def incident_to_dict(record: Incident) -> dict:
    detail = dict(record.detail or {})

    result = {
        **detail,
        "id": record.id,
        "incident_id": record.id,
        "rule_id": record.rule_id,
        "system_id": record.system_id,
        "category": record.category,
        "monitor_type": record.category,
        "target": record.target,
        "metric": record.metric,
        "severity": record.severity,
        "priority": record.priority,
        "status": record.status,
        "opened_at": record.opened_at,
        "created_at": record.created_at,
        "updated_at": record.updated_at,
        "resolved_at": record.resolved_at,
        "detail": detail,
        "alert": dict(record.alert or {}),
    }

    return result


# Additional repository functions from origin/develop


def _as_status(raw_status: str | None) -> str:
    if raw_status is None:
        return "OPEN"

    normalized = str(raw_status).upper().strip()

    if normalized in {"RESOLVED", "CLOSED", "CLEARED"}:
        return "RESOLVED"

    return "OPEN"


def get_incident_by_id(
    db: Session,
    incident_id: str,
) -> Incident | None:
    return (
        db.query(Incident)
        .filter(Incident.id == incident_id)
        .first()
    )


def get_all_incidents(
    db: Session,
    system_id: int | None = None,
):
    query = db.query(Incident)

    if system_id is not None:
        query = query.filter(Incident.system_id == system_id)

    return query.order_by(Incident.created_at.desc()).all()


def get_active_incidents(
    db: Session,
    system_id: int | None = None,
):
    query = db.query(Incident).filter(
        Incident.status != "RESOLVED"
    )

    if system_id is not None:
        query = query.filter(Incident.system_id == system_id)

    return query.order_by(Incident.created_at.desc()).all()


def create_or_update_incident(
    db: Session,
    incident_data: dict,
) -> Incident:
    incident_id = str(
        incident_data.get("id")
        or incident_data.get("incident_id")
        or ""
    ).strip()

    if not incident_id:
        raise ValueError("Incident id is required")

    existing = get_incident_by_id(db, incident_id)
    now = datetime.now(timezone.utc)

    if existing is not None:
        existing.rule_id = incident_data.get(
            "rule_id",
            existing.rule_id,
        )

        existing.system_id = int(
            incident_data.get("system_id") or existing.system_id
        )

        existing.category = (
            incident_data.get("category") or existing.category
        )

        existing.target = (
            incident_data.get("target") or existing.target
        )

        existing.metric = (
            incident_data.get("metric") or existing.metric
        )

        existing.severity = (
            incident_data.get("severity") or existing.severity
        )

        existing.priority = (
            incident_data.get("priority") or existing.priority
        )

        existing.status = _as_status(
            incident_data.get("status") or existing.status
        )

        existing.opened_at = (
            incident_data.get("opened_at")
            or existing.opened_at
            or now
        )

        existing.updated_at = now

        existing.resolved_at = (
            incident_data.get("resolved_at")
            if incident_data.get("resolved_at") is not None
            else (
                None
                if existing.status != "RESOLVED"
                else existing.resolved_at or now
            )
        )

        existing.detail = (
            incident_data.get("detail") or existing.detail or {}
        )

        existing.alert = (
            incident_data.get("alert") or existing.alert or {}
        )

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

    if (
        new_incident.status == "RESOLVED"
        and new_incident.resolved_at is None
    ):
        new_incident.resolved_at = now

    db.add(new_incident)
    db.commit()
    db.refresh(new_incident)

    return new_incident


def resolve_incident(
    db: Session,
    incident_id: str,
) -> Incident | None:
    incident = get_incident_by_id(db, incident_id)

    if incident is None:
        return None

    incident.status = "RESOLVED"
    incident.updated_at = datetime.now(timezone.utc)
    incident.resolved_at = (
        incident.resolved_at or datetime.now(timezone.utc)
    )

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
        "opened_at": (
            incident.opened_at.isoformat()
            if incident.opened_at
            else None
        ),
        "updated_at": (
            incident.updated_at.isoformat()
            if incident.updated_at
            else None
        ),
        "resolved_at": (
            incident.resolved_at.isoformat()
            if incident.resolved_at
            else None
        ),
        "detail": incident.detail or {},
        "alert": incident.alert or {},
        "created_at": (
            incident.created_at.isoformat()
            if incident.created_at
            else None
        ),
    }
