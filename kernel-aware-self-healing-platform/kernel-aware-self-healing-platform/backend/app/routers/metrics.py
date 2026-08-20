from fastapi import APIRouter

router = APIRouter()

@router.get("/get_metrics")
async def get_metrics():
    return {"incidents": []}

@router.post("/user_rules")
async def get_incidents():
    return {"incidents": []}