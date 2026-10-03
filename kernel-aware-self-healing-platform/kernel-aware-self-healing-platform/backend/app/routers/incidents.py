from fastapi import APIRouter

router = APIRouter()

incidents_db = []

@router.post("/incidents")
async def save_incident(incident: dict):
    incidents_db.append(incident)
    return {"status": "success"}

@router.get("/incidents")
async def get_incidents():
    return incidents_db