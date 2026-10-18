from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database.connection import get_db
from repository.incidents import incident_to_dict, list_incidents


router = APIRouter()


@router.get("/incidents")
def get_incidents(system_id: int | None = Query(default=None), db: Session = Depends(get_db)):
    return [incident_to_dict(record) for record in list_incidents(db, system_id)]
