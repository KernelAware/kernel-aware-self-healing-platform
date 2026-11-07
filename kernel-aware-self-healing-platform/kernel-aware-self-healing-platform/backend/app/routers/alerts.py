from fastapi import APIRouter, BackgroundTasks

from routers.websocket import give_message
from services.incident_service import persist_incident
from integrations.email.email_service import send_incident_detected_emails
from integrations.slack.slack_service import send_incident_detected_slack
from integrations.teams.teams_service import send_incident_detected_teams
from integrations.jira.jira_service import send_incident_detected_jira
from integrations.servicenow.servicenow_service import send_incident_detected_servicenow

router = APIRouter()


def _resolve_system_id(system_value):
    if system_value is None:
        return 1
    if isinstance(system_value, int):
        return system_value
    digits = "".join(ch for ch in str(system_value) if ch.isdigit())
    return int(digits) if digits else 1


@router.post("/alert_incidents")
async def alert_incidents(data: dict, background_tasks: BackgroundTasks):

    incident_detail = data.get("incident_detail") or {}
    alert = data.get("alert") or {}
    persisted_incident = persist_incident(data)
    background_tasks.add_task(send_incident_detected_emails, persisted_incident)
    background_tasks.add_task(send_incident_detected_slack, persisted_incident)
    background_tasks.add_task(send_incident_detected_teams, persisted_incident)
    background_tasks.add_task(send_incident_detected_jira, persisted_incident)
    background_tasks.add_task(send_incident_detected_servicenow, persisted_incident)

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
