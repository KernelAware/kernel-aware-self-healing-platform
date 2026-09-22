from fastapi import FastAPI
from engine.healing_engine import heal

app = FastAPI(title="Healing Engine", version="1.0.0")

@app.get("/heal")
def heal_action(action_plan: dict):
    return heal(action_plan)
