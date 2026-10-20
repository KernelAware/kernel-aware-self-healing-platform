import logging

from fastapi.encoders import jsonable_encoder
from fastapi import APIRouter, WebSocket, WebSocketDisconnect


router = APIRouter()
connected_clients: dict[int, list[WebSocket]] = {}
logger = logging.getLogger(__name__)


@router.websocket("/ws/{systemid}")
async def websocket_endpoint(websocket: WebSocket, systemid: int):
    await websocket.accept()
    clients = connected_clients.setdefault(systemid, [])
    clients.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        clients = connected_clients.get(systemid)
        if clients is not None:
            clients[:] = [client for client in clients if client is not websocket]
            if not clients:
                connected_clients.pop(systemid, None)


async def give_message(message: dict, systemid: int):
    clients = connected_clients.get(systemid, [])
    disconnected = []
    for websocket in tuple(clients):
        try:
            # Incident history serialization includes Python datetime values;
            # Starlette's WebSocket.send_json uses json.dumps directly.
            await websocket.send_json(jsonable_encoder(message))
        except Exception as error:
            logger.warning(
                "WebSocket delivery failed for system %s (%s); removing client",
                systemid,
                type(error).__name__,
            )
            disconnected.append(websocket)
    clients[:] = [client for client in clients if all(client is not closed for closed in disconnected)]
    if not clients:
        connected_clients.pop(systemid, None)
