from fastapi import APIRouter, HTTPException, Query

from services.monitoring_lifecycle import (
    get_monitoring_lifecycle,
    update_monitoring_lifecycle,
)
from routers.websocket import give_message


router = APIRouter()


@router.get("/monitoring/readiness")
def monitoring_readiness(system_id: int = Query(...)):
    return get_monitoring_lifecycle(system_id)


@router.post("/monitoring/lifecycle")
async def update_monitoring_readiness(data: dict):
    try:
        system_id = int(data.get("system_id"))
        state, changed = update_monitoring_lifecycle(
            system_id,
            data.get("generation"),
            data.get("stage"),
        )
    except (TypeError, ValueError) as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    if changed:
        await give_message(
            {"type": "monitoring_readiness", "data": state},
            systemid=system_id,
        )
    return {"status": "success", **state}
