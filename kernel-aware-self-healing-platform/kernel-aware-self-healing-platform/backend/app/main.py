from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import traceback

from database.connection import engine, Base, SessionLocal

from models.user_rules.systems import System
from models.user_rules.rule import Rule
from models.user_rules.rule_action import RuleAction
from models.user_rules.rule_metric import RuleMetric
from models.user_rules.rule_notification import RuleNotification
from models.user_rules.rule_recovery import RuleRecovery
from models.user_rules.rule_targets import RuleTarget

from routers.users import router as users_router
from routers.incidents import router as incidents_router
from routers.user_rules import router as metrics_router
from routers.websocket import router as websocket_router
from routers.alerts import router as alert_router


app = FastAPI()

# Create database tables
Base.metadata.create_all(bind=engine)

# Seed default system if missing
try:
    with SessionLocal() as db:
        if not db.query(System).first():
            default_system = System(
                id=1,
                hostname="localhost",
                ip_address="127.0.0.1",
                os_name="Linux",
                os_version="Ubuntu",
                architecture="x86_64",
                environment="Production",
                status="active"
            )
            db.add(default_system)
            db.commit()
except Exception as e:
    print(f"Warning: Could not seed default system: {e}")

origins = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
    )


app.include_router(users_router)
app.include_router(incidents_router)
app.include_router(metrics_router)
app.include_router(websocket_router)
app.include_router(alert_router)