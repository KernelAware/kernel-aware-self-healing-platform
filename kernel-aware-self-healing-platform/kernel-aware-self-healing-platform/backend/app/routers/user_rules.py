from fastapi import APIRouter, HTTPException
from typing import Any
from services.user_rule_service import user_rules_service, get_user_rules


router = APIRouter()

@router.get("/system_metrics")
async def get_metrics():
    return {"incidents": "[]"}

@router.post("/user_rules")
async def put_incidents(data: dict[str, Any]):
    try:
        return user_rules_service(data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/get_user_rules")
async def get_user_rules_api(system_id: int | None = None):
    return get_user_rules(system_id=system_id)

@router.get("/get_user_rule")
async def get_rule_by_id_api(rule_id: int):
    rule = get_user_rules(rule_id=rule_id)
    return rule