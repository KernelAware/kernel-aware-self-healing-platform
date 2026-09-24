from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database.connection import engine, Base

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


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users_router)
app.include_router(incidents_router)
app.include_router(metrics_router)
app.include_router(websocket_router)
app.include_router(alert_router)