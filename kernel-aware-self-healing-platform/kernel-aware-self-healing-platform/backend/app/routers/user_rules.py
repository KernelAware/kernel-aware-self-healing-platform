from fastapi import APIRouter
from typing import Any
from services.user_rule_service import user_rules_service
from services.user_rule_service import get_user_rules

router = APIRouter()

@router.get("/system_metrics")
async def get_metrics():
    return {"incidents": "[]"}

@router.post("/user_rules")
async def put_incidents(data: dict[str, Any]):
    return user_rules_service(data)

@router.get("/get_user_rules")
async def get_user_rules_api(system_id: int):
    print(system_id)
    return get_user_rules(system_id)
