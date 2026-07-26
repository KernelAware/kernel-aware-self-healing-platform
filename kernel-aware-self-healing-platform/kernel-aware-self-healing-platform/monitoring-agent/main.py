from fastapi import FastAPI
from fastapi.responses import Response
from sender.exporter_network import update_network_metrics
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

import threading
import time

app = FastAPI()

last_metrix= {}

def collect_metrix():
    global last_metrix
    last_metrix = {}

    while True:
        Network_Metrics = update_network_metrics()
        print(Network_Metrics)

        time.sleep(1)

@app.get("/metrics")
def metrics():
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )

threading.Thread(target=collect_metrix, daemon=True).start()