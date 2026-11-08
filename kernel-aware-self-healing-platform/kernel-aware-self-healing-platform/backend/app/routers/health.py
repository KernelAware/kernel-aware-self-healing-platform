from fastapi import APIRouter


router = APIRouter()


@router.get("/health")
def health():
    # Liveness must stay responsive when the external database is slow or down.
    return {"status": "healthy"}
