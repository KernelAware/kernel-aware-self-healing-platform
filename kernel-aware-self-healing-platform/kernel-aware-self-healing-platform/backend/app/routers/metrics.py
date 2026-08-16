from fastapi import APIRouter

router = APIRouter()

@router.get("/get_metrics")
async def get_metrics():
    return {"incidents": []}