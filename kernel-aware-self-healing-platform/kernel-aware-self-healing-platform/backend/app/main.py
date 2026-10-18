import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError

from database.connection import engine
from models.alert_incident import AlertIncident
from routers.users import router as users_router
from routers.health import router as health_router
from routers.incidents import router as incidents_router
from routers.user_rules import router as metrics_router
from routers.websocket import router as websocket_router
from routers.alerts import router as alert_router

app = FastAPI()
logger = logging.getLogger(__name__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:5173"],
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


@app.on_event("startup")
def ensure_alert_incident_table():
    # This creates only the new alert_incidents table when it is absent. It does
    # not create, alter, or drop any of the existing user-rule tables.
    try:
        AlertIncident.__table__.create(bind=engine, checkfirst=True)
    except SQLAlchemyError as error:
        # Keep HTTP liveness available while the external database is down.
        # The health check and database-backed routes report the dependency failure.
        logger.error("Unable to verify alert_incidents table during startup: %s", error)
