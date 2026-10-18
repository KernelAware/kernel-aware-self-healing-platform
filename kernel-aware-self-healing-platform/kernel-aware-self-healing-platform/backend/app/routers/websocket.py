from fastapi import APIRouter, WebSocket, WebSocketDisconnect


router = APIRouter()
connected_clients: dict[int, list[WebSocket]] = {}


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
            await websocket.send_json(message)
        except Exception:
            disconnected.append(websocket)
    clients[:] = [client for client in clients if all(client is not closed for closed in disconnected)]
    if not clients:
        connected_clients.pop(systemid, None)
