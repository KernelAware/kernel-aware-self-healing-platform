import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.connection import SessionLocal, engine, get_db
from models.incidents import Incident
from repository.incidents import incident_to_dict, persist_incident
from routers.websocket import give_message
from services.monitoring_lifecycle import is_current_generation, store_active_alert


router = APIRouter()
logger = logging.getLogger(__name__)


def _persist_incident_or_raise(db, event: str, incident_detail: dict, alert: dict):
    try:
        return persist_incident(db, event, incident_detail, alert)
    except Exception:
        db.rollback()
        raise


def _persist_incident_in_worker(event: str, incident_detail: dict, alert: dict):
    db = SessionLocal()
    try:
        return _persist_incident_or_raise(db, event, incident_detail, alert)
    finally:
        db.close()


async def _persist_and_broadcast(data: dict, db: Session, *, disk_lifecycle: bool = False):
    incident_detail = data.get("incident_detail") or {}
    alert = data.get("alert") or {}
    event = str(data.get("event") or incident_detail.get("event") or "opened").lower()
    if event not in {"opened", "updated", "resolved"}:
        raise HTTPException(status_code=400, detail="Unsupported incident event")

    if not incident_detail:
        raise HTTPException(status_code=422, detail="incident_detail is required")

    generation = incident_detail.get("analytics_generation") or data.get("analytics_generation")
    if disk_lifecycle:
        try:
            system_id = int(incident_detail.get("system_id") or alert.get("system_id"))
        except (TypeError, ValueError) as error:
            raise HTTPException(status_code=422, detail="A numeric system_id is required") from error
        if not generation or not is_current_generation(system_id, generation):
            raise HTTPException(status_code=409, detail="Disk alert belongs to a stale Analytics run")
        incident_detail = {**incident_detail, "analytics_generation": generation}
        alert = {**alert, "analytics_generation": generation}

    repeated_resolution = False
    if disk_lifecycle and event == "resolved":
        incident_id = incident_detail.get("incident_id") or incident_detail.get("id")
        if incident_id:
            existing = db.get(Incident, str(incident_id))
            repeated_resolution = bool(
                existing and str(existing.status).upper() in {"RESOLVED", "CLOSED"}
            )

    try:
        if db.get_bind() is engine:
            record, created = await asyncio.to_thread(
                _persist_incident_in_worker,
                event,
                incident_detail,
                alert,
            )
        else:
            # Keep directly injected test/development sessions on their owning thread.
            record, created = _persist_incident_or_raise(db, event, incident_detail, alert)
    except Exception as error:
        logger.exception(
            "Incident persistence failed for event %s (incident_id=%s)",
            event,
            incident_detail.get("incident_id") or incident_detail.get("id"),
        )
        raise HTTPException(status_code=500, detail="Incident persistence failed") from error

    saved = incident_to_dict(record)
    saved_incident = {
        **incident_detail,
        **saved,
        "id": saved["id"],
        "incident_id": saved["id"],
        "status": saved["status"],
    }
    if alert:
        saved_alert = {
            **alert,
            "id": saved["id"],
            "incident_id": saved["id"],
            "status": saved["status"],
        }
        saved_incident["alert"] = saved_alert
    else:
        saved_alert = {}

    if disk_lifecycle and not store_active_alert(system_id, generation, event, saved_incident):
        # The Analytics Engine may have restarted while persistence was running.
        # Keep the database row for history, but never publish it as current.
        return {"status": "ignored", "event": event, "reason": "stale Analytics run"}

    if repeated_resolution:
        return {"status": "success", "event": event, "incident": saved_incident}

    system_id = incident_detail.get("system_id") or alert.get("system_id")
    try:
        system_id = int(system_id) if system_id is not None else None
    except (TypeError, ValueError):
        system_id = None
    if system_id is not None:
        await give_message(
            {"type": "incident_detail", "data": saved_incident},
            systemid=int(system_id),
        )
        await give_message(
            {"type": "incident_update", "event": event, "data": saved_incident},
            systemid=int(system_id),
        )
        if created and saved["status"] != "RESOLVED" and saved_alert:
            delivered_alert = {**saved_alert, "event": event}
            await give_message(
                {"type": "alerts", "data": delivered_alert},
                systemid=int(system_id),
            )

    return {"status": "success", "event": event, "incident": saved_incident}


@router.post("/alert_incidents")
async def alert_incidents(data: dict, db: Session = Depends(get_db)):
    """Compatibility endpoint; incident history is stored in incidents."""
    return await _persist_and_broadcast(data, db)


@router.post("/rule-alerts")
async def publish_rule_alert(data: dict, db: Session = Depends(get_db)):
    """Persist a Disk rule incident before broadcasting it."""
    incident_detail = data.get("incident_detail") or {}
    alert = data.get("alert") or {}
    if not incident_detail or not alert:
        raise HTTPException(status_code=422, detail="incident_detail and alert are required")
    category = str(
        incident_detail.get("monitor_type")
        or incident_detail.get("category")
        or ""
    ).lower()
    if category != "disk":
        raise HTTPException(status_code=400, detail="This route accepts Disk rule alerts only")
    try:
        int(incident_detail.get("system_id"))
    except (TypeError, ValueError) as error:
        raise HTTPException(status_code=422, detail="A numeric system_id is required") from error
    return await _persist_and_broadcast(data, db, disk_lifecycle=True)
