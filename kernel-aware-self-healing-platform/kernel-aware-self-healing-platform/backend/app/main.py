import sys
import logging
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database.connection import engine
from models.incidents import Incident

from routers.users import router as users_router
from routers.health import router as health_router
from routers.incidents import router as incidents_router
from routers.user_rules import router as metrics_router
from routers.websocket import router as websocket_router
from routers.alerts import router as alert_router
from routers.monitoring import router as monitoring_router
from routers.process_inventory import router as process_inventory

app = FastAPI()


class _RoutineSuccessAccessLogFilter(logging.Filter):
    """Hide successful high-frequency polling while retaining failures."""

    _quiet_paths = (
        "GET /monitoring/readiness",
        "GET /get_user_rules",
        "POST /monitoring/lifecycle",
        "POST /processes_inventory",
        "POST /services_inventory",
    )

    def filter(self, record):
        message = record.getMessage()
        if not any(path in message for path in self._quiet_paths):
            return True

        return not any(
            status in message
            for status in (" 200 OK", " 201 Created", " 204 No Content")
        )


logging.getLogger("uvicorn.access").addFilter(
    _RoutineSuccessAccessLogFilter()
)


@app.on_event("startup")
def ensure_incidents_table():
    # Create only the Incident table.
    # Avoid creating unrelated tables through Base.metadata.create_all().
    Incident.__table__.create(bind=engine, checkfirst=True)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(users_router)
app.include_router(health_router)
app.include_router(incidents_router)
app.include_router(metrics_router)
app.include_router(websocket_router)
app.include_router(alert_router)
app.include_router(monitoring_router)
app.include_router(process_inventory)
