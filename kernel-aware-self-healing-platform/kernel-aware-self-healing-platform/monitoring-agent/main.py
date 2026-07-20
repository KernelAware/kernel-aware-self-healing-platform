from fastapi import FastAPI
from fastapi.responses import Response
from prometheus_client import generate_latest
from sender.exporter_network import update_network_metrics
from sender.exporter_disk import update_disk_metrics

import threading
import time

app = FastAPI()

last_metrix = ""


def collect_metrix():
    global last_metrix
    last_metrix = ""

    while True:
        update_network_metrics()
        update_disk_metrics()
        last_metrix = generate_latest().decode("utf-8")

        time.sleep(1)


@app.get("/metrics")
def metrics():
    return Response(
        content=last_metrix,
        media_type="text/plain; version=0.0.4; charset=utf-8",
    )


threading.Thread(target=collect_metrix, daemon=True).start()
