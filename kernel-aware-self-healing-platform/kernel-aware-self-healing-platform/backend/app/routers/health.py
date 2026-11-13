from fastapi import APIRouter
from system_config import SYSTEM_ID


router = APIRouter()


@router.get("/health")
def health():
    # Liveness must stay responsive when the external database is slow or down.
    return {"status": "healthy"}


@router.get("/system-config")
def system_config():
    """Expose the backend's runtime system identity to the static Dashboard."""
    return {"system_id": SYSTEM_ID}
