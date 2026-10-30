from fastapi import APIRouter

from routers.websocket import give_message
from services.incident_service import persist_incident

router = APIRouter()


def _resolve_system_id(system_value):
    if system_value is None:
        return 1
    if isinstance(system_value, int):
        return system_value
    digits = "".join(ch for ch in str(system_value) if ch.isdigit())
    return int(digits) if digits else 1


@router.post("/alert_incidents")
async def alert_incidents(data: dict):
    incident_detail = data.get("incident_detail") or {}
    alert = data.get("alert") or {}
    persisted_incident = persist_incident(data)

    system_id = (
        incident_detail.get("system_id")
        or alert.get("system_id")
        or incident_detail.get("system")
        or alert.get("system")
        or 1
    )
    system_id = _resolve_system_id(system_id)

    alert_payload = {
        **alert,
        "id": persisted_incident["id"],
        "status": persisted_incident["status"],
        "system_id": persisted_incident["system_id"],
    }

    incident_payload = {
        **incident_detail,
        "id": persisted_incident["id"],
        "system_id": persisted_incident["system_id"],
        "category": persisted_incident["category"],
        "target": persisted_incident["target"],
        "metric": persisted_incident["metric"],
        "severity": persisted_incident["severity"],
        "priority": persisted_incident["priority"],
        "status": persisted_incident["status"],
        "detail": persisted_incident["detail"],
        "alert": persisted_incident["alert"],
        "created_at": persisted_incident["created_at"],
    }

    await give_message({"type": "incident_detail", "data": incident_payload}, systemid=system_id)
    await give_message({"type": "alerts", "data": alert_payload}, systemid=system_id)

    return {
        "status": "success",
        "message": "Incident and alert received",
        "incident": persisted_incident,
    }
