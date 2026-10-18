import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.connection import SessionLocal, engine, get_db
from repository.incidents import incident_to_dict, persist_incident
from routers.websocket import give_message


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


@router.post("/alert_incidents")
async def alert_incidents(data: dict, db: Session = Depends(get_db)):
    incident_detail = data.get("incident_detail") or {}
    alert = data.get("alert") or {}
    event = str(data.get("event") or incident_detail.get("event") or "opened").lower()
    if event not in {"opened", "updated", "resolved"}:
        raise HTTPException(status_code=400, detail="Unsupported incident event")

    if not incident_detail:
        raise HTTPException(status_code=422, detail="incident_detail is required")

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
    system_id = saved.get("system_id")
    if system_id is not None:
        await give_message(
            {"type": "incident_detail", "data": saved},
            systemid=system_id,
        )
        await give_message(
            {"type": "incident_update", "event": event, "data": saved},
            systemid=system_id,
        )
        if created and saved.get("status") != "RESOLVED" and saved.get("alert"):
            delivered_alert = {**saved["alert"], "status": saved.get("status"), "event": event}
            await give_message(
                {"type": "alerts", "data": delivered_alert},
                systemid=system_id,
            )

    return {"status": "success", "event": event, "incident": saved}
