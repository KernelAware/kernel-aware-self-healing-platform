from fastapi import FastAPI
from engine.healing_engine import heal

app = FastAPI(title="Healing Engine", version="1.0.0")

@app.get("/heal")
async def heal_action(action_plan: dict):

    result = await heal(action_plan)
    return result

