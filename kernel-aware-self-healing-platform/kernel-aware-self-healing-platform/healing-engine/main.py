from fastapi import FastAPI

app = FastAPI(title="Healing Engine", version="1.0.0")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "healing-engine"}
