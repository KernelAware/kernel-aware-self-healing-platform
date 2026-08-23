from fastapi import APIRouter
from typing import Any
from services.user_rule_service import user_rules_service

router = APIRouter()

@router.get("/get_metrics")
async def get_metrics():
    return {"incidents": "[]"}

@router.post("/user_rules")
async def put_incidents(data: dict[str, Any]):
    data = user_rules_service(data)
    return {
        "message": "Rule received",
        "rule": data
    }