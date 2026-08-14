from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

connected_clients: dict[int, WebSocket] = {}


@router.websocket("/ws/{userid}")
async def websocket_endpoint(websocket: WebSocket, systemid: int):
    await websocket.accept()

    connected_clients[systemid] = websocket

    try:
        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        connected_clients.pop(systemid, None)


async def give_message(message: dict, systemid: int):
    websocket = connected_clients.get(systemid)

    if websocket:
        try:
            await websocket.send_json(message)
        except Exception:
            connected_clients.pop(systemid, None)