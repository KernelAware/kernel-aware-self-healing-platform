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
    status_value = "RESOLVED" if event_name == "resolved" else _first_value(
        incident_detail.get("status"),
        alert.get("status"),
        record.status if record is not None else None,
        "OPEN",
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
        ) or (record.resolved_at if record is not None else None) or now
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
    alert_payload = dict(alert or (record.alert if record is not None else {}))
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
):
    query = db.query(Incident)
    if system_id is not None:
        query = query.filter(Incident.system_id == int(system_id))
    if exclude_monitor_type:
        query = query.filter(Incident.category != exclude_monitor_type.lower())
    return query.order_by(Incident.created_at.desc(), Incident.id.desc()).all()


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
