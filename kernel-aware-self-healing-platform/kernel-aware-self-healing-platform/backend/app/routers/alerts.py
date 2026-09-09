from fastapi import APIRouter
from routers.websocket import give_message

router = APIRouter()

@router.post("/alert_incidents")
async def alert_incidents(data: dict):

    incident_detail = data["incident_detail"]
    alert = data["alert"]

    await give_message(
        {
            "type": "incident_detail",
            "data": incident_detail
        },
        systemid=1
    )
    await give_message(
        {
            "type": "alerts",
            "data": alert
        },
        systemid=1
    )


    return {
        "status": "success",
        "message": "Incident and alert received"
    }
