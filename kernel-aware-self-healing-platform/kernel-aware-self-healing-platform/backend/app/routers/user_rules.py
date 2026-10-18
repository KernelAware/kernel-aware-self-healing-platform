import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlalchemy.exc import SQLAlchemyError

from services.user_rule_service import get_user_rules, user_rules_service


router = APIRouter()
logger = logging.getLogger(__name__)


def _get_rules_or_503(*, system_id: int | None = None, rule_id: int | None = None):
    try:
        return get_user_rules(system_id=system_id, rule_id=rule_id)
    except SQLAlchemyError as error:
        endpoint = "/get_user_rule" if rule_id is not None else "/get_user_rules"
        logger.error(
            "Database error serving %s (system_id=%s, rule_id=%s): %s",
            endpoint,
            system_id,
            rule_id,
            error,
        )
        raise HTTPException(status_code=503, detail="database unavailable") from error

@router.get("/system_metrics")
def get_metrics():
    return {"incidents": "[]"}

@router.post("/user_rules")
def put_incidents(data: dict[str, Any]):
    return user_rules_service(data)

@router.get("/get_user_rules")
def get_user_rules_api(system_id: int):
    return _get_rules_or_503(system_id=system_id)

@router.get("/get_user_rule")
def get_rule_by_id_api(rule_id: int):
    return _get_rules_or_503(rule_id=rule_id)
