from fastapi import APIRouter
from typing import Any

router = APIRouter()

@router.get("/get_metrics")
async def get_metrics():
    return {"incidents": "[]"}

@router.post("/user_rules")
async def get_incidents(data: dict[str, Any]):
    return {
        "message": "Rule received",
        "rule": data
    }