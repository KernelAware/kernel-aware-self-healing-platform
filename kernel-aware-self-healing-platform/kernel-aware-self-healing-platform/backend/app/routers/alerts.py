from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.connection import get_db
from repository.incidents import incident_to_dict, persist_incident
from routers.websocket import give_message


router = APIRouter()


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
        record, created = persist_incident(db, event, incident_detail, alert)
    except Exception as error:
        db.rollback()
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
