import json
from database.redis_connection import redis_client


def save_processes(system_id, processes):
    redis_client.setex(
        f"process_inventory:{system_id}",
        60,
        json.dumps(processes)
    )


def get_processes(system_id):
    data = redis_client.get(f"process_inventory:{system_id}")

    if not data:
        return []

    return json.loads(data)