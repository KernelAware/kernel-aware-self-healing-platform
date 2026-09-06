from fastapi import APIRouter , HTTPException
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
    return get_user_rules(system_id = system_id)

@router.get("/get_user_rule")
async def get_rule_by_id_api(rule_id: int):
    rule = get_user_rules(rule_id =rule_id)
    return rule