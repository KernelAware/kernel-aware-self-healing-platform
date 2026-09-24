from fastapi import APIRouter
from services.process_inventory import (store_process_inventory , get_process_inventory)

router = APIRouter()

@router.post("/process_inventory")
async def put_process_inventory(data: dict):

    store_process_inventory(
        data["system_id"],
        data["processes"]
    )

    return {"status": "success"}

@router.get("/process_inventory/{system_id}")
async def get_process_inventory_endpoint(system_id: int):

    processes = get_process_inventory(system_id)

    return {
        "system_id": system_id,
        "processes": processes
    }