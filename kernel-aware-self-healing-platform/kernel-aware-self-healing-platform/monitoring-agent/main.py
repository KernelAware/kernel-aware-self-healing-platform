from fastapi import FastAPI
from fastapi.responses import Response
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from collectors.process import initialize_cpu_measurement

from sender.exporter_network import update_network_metrics
from sender.exporter_process import update_process_metrics
from sender.exporter_service import update_service_metrics

import threading
import time

app = FastAPI()


def collect_metrics():

    initialize_cpu_measurement()
    time.sleep(2)
    while True:

        update_network_metrics()

        update_process_metrics()

        update_service_metrics()

        time.sleep(1)


threading.Thread(
    target=collect_metrics,
    daemon=True
).start()


@app.get("/metrics")
def metrics():
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )