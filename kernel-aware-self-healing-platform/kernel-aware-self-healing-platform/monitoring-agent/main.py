from fastapi import FastAPI, Response
from sender.exporter_network import update_network_metrics
from sender.exporter_cpu import update_cpu_metrics

import threading
import time

app = FastAPI()

last_metrix = ""

def collect_metrix():
    global last_metrix

    while True:
        Network_Metrics = update_network_metrics()
        cpu_metrics = update_cpu_metrics()

        last_metrix = cpu_metrics

        time.sleep(1)

@app.get("/metrics")
def metrics():
    return Response(content=last_metrix, media_type="text/plain")

threading.Thread(target=collect_metrix, daemon=True).start()