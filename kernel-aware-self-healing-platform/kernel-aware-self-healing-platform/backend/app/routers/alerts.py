from fastapi import APIRouter
from routers.websocket import give_message

router = APIRouter()

@router.post("/alert_incidents")
async def alert_incidents(data: dict):

    incident_detail = data["incident_detail"]
    alert = data["alert"]
    system_id = incident_detail.get("system_id", alert.get("system", 1))

    await give_message(
        {
            "type": "incident_detail",
            "data": incident_detail
        },
        systemid=int(system_id)
    )
    await give_message(
        {
            "type": "alerts",
            "data": alert
        },
        systemid=int(system_id)
    )


    return {
        "status": "success",
        "message": "Incident and alert received"
    }
