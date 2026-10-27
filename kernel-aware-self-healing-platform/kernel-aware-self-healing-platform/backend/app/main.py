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

app = FastAPI()


@app.on_event("startup")
def ensure_incidents_table():
    # The backend has no migration runner. Create only the table described by
    # this model; Base.metadata.create_all() would also create unrelated tables.
    Incident.__table__.create(bind=engine, checkfirst=True)

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
app.include_router(monitoring_router)
