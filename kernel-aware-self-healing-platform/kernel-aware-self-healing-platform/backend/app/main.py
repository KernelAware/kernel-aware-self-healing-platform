from fastapi import FastAPI

from routers.users import router as users_router
from routers.incidents import router as incidents_router
from routers.metrics import router as metrics_router
from routers.websocket import router as websocket_router

app = FastAPI()

app.include_router(users_router)
app.include_router(incidents_router)
app.include_router(metrics_router)
app.include_router(websocket_router)