import httpx

BACKEND_URL = "http://localhost:8000"


async def load_rules(system_id):

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            f"{BACKEND_URL}/get_user_rules",
            params={"system_id": system_id}
        )


    response.raise_for_status()

    return response.json()