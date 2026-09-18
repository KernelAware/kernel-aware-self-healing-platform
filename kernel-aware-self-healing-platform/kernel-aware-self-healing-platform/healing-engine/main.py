from fastapi import FastAPI
from api.healing_routes import router as healing_router

app = FastAPI(title="Healing Engine", version="1.0.0")
app.include_router(healing_router)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "healing-engine"}
