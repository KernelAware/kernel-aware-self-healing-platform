
import requests

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database.connection import get_db
from repository.incidents import incident_to_dict, list_incidents
from schemas.incidents import IncidentResponse
from services.incident_service import (
    get_incident,
    list_open_incidents,
    resolve_incident_by_id,
)
from system_config import SYSTEM_ID


router = APIRouter()


def build_healing_action_payload(
    incident_id: str,
    payload: dict,
    incident: dict | None = None,
) -> dict:
    incident = incident or {}

    action = (
        payload.get("action")
        or payload.get("recommendedAction")
        or payload.get("recommended_action")
        or "restart_service"
    )

    target = (
        payload.get("target")
        or incident.get("target")
        or "nginx"
    )

    system_id = payload.get("system_id")

    if system_id is None:
        system_id = incident.get("system_id")

    if system_id is None:
        system_id = SYSTEM_ID

    try:
        system_id = int(system_id)
    except (TypeError, ValueError) as error:
        raise HTTPException(status_code=422, detail="system_id must be a positive integer") from error
    if system_id <= 0:
        raise HTTPException(status_code=422, detail="system_id must be a positive integer")

    category = incident.get("category")

    if category is None:
        category = incident.get("category")

    if category is None:
        category = (incident.get("detail") or {}).get("monitor-type")

    category = str(category or "system").strip().lower()

    pid = payload.get("pid")

    if pid is None and incident:
        pid = incident.get("pid")

    if pid is None and incident:
        pid = (incident.get("detail") or {}).get("pid")

    if category != "process":
        pid = None

    try:
        pid = int(pid) if pid is not None else None
    except (TypeError, ValueError):
        pid = None

    action_payload = {
        "action": action,
        "target": target,
        "system_id": system_id,
        "category": category,
        "pid": pid,
    }

    normalized_action = str(action).strip().lower().replace("_", "-")

    if normalized_action == "run-command":
        script_value = (
            payload.get("script")
            or payload.get("script_content")
            or payload.get("command")
            or ""
        )

        action_payload["script"] = script_value

    return action_payload


# Keep the HEAD endpoint and its existing filters.
@router.get("/incidents")
def get_incidents(
    system_id: int | None = Query(default=None),
    exclude_monitor_type: str | None = None,
    monitor_type: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    return [
        incident_to_dict(record)
        for record in list_incidents(
            db,
            system_id,
            exclude_monitor_type,
            monitor_type,
            status,
        )
    ]


@router.get("/incidents/open", response_model=list[IncidentResponse])
def get_open_incidents(
    system_id: int | None = Query(default=None, alias="system_id"),
    db: Session = Depends(get_db),
):
    return list_open_incidents(system_id=system_id)


@router.get(
    "/incidents/{incident_id}",
    response_model=IncidentResponse,
)
def get_incident_detail(
    incident_id: str,
    db: Session = Depends(get_db),
):
    incident = get_incident(incident_id)

    if incident is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found",
        )

    return incident


@router.post(
    "/incidents/{incident_id}/resolve",
    response_model=IncidentResponse,
)
def resolve_incident_route(
    incident_id: str,
    db: Session = Depends(get_db),
):
    resolved = resolve_incident_by_id(incident_id)

    if resolved is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found",
        )

    return resolved


@router.post(
    "/incidents/resolve/{incident_id}",
    response_model=IncidentResponse,
)
def resolve_incident_by_route(
    incident_id: str,
    db: Session = Depends(get_db),
):
    return resolve_incident_route(incident_id, db)


@router.post("/incidents/{incident_id}/approve-execute")
def approve_execute_incident(
    incident_id: str,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
):
    incident = get_incident(incident_id)

    action_payload = build_healing_action_payload(
        incident_id,
        payload,
        incident,
    )

    try:
        response = requests.post(
            "http://localhost:8004/heal",
            json=action_payload,
            timeout=20,
        )

        response.raise_for_status()

    except requests.RequestException as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Healing engine request failed: {exc}",
        ) from exc

    try:
        healing_result = response.json()
    except ValueError:
        healing_result = {
            "status": "ok",
            "raw": response.text,
        }

    return {
        "incident_id": incident_id,
        "payload": action_payload,
        "healing_result": healing_result,
    }
