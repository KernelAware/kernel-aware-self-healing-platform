from fastapi import APIRouter
from services.process_inventory import (store_process_inventory , get_process_inventory , store_service_inventory , get_service_inventory)

router = APIRouter()

@router.post("/processes_inventory")
async def put_process_inventory(data: dict):

    store_process_inventory(
        data["system_id"],
        data["processes"]
    )

    return {"status": "success"}

@router.get("/processes_inventory/{system_id}")
async def get_process_inventory_endpoint(system_id: int):

    processes = get_process_inventory(system_id)

    return {
        "system_id": system_id,
        "processes": processes
    }

@router.post("/services_inventory")
async def put_service_inventory(data: dict):

    store_service_inventory(
        data["system_id"],
        data["services"]
    )

    return {"status": "success"}


@router.get("/services_inventory/{system_id}")
async def get_service_inventory_endpoint(system_id: int):

    services = get_service_inventory(system_id)

    return {
        "system_id": system_id,
        "services": services
    }