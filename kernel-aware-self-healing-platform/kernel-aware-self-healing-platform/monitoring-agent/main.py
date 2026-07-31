from fastapi import FastAPI, Response
from sender.exporter_network import update_network_metrics
from sender.exporter_cpu import update_cpu_metrics
from fastapi import FastAPI
from fastapi.responses import Response
from prometheus_client import generate_latest
from sender.exporter_network import update_network_metrics
from sender.exporter_disk import update_disk_metrics
from sender.exporter_logs import update_logs_metrics
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from collectors.process import initialize_cpu_measurement

from sender.exporter_network import update_network_metrics
from sender.exporter_process import update_process_metrics
from sender.exporter_service import update_service_metrics

import logging
import threading
import time

app = FastAPI()
logger = logging.getLogger(__name__)

last_metrix = ""


def collect_metrics():

    initialize_cpu_measurement()
    time.sleep(2)
    while True:
        try:
            update_network_metrics()
        except Exception as exc:
            logger.exception("Network metrics update failed: %s", exc)

        try:
            update_disk_metrics()
        except Exception as exc:
            logger.exception("Disk metrics update failed: %s", exc)

        try:
            update_logs_metrics()
        except Exception as exc:
            logger.exception("Log metrics update failed: %s", exc)

        last_metrix = generate_latest().decode("utf-8")
        Network_Metrics = update_network_metrics()
        cpu_metrics = update_cpu_metrics()

        last_metrix = cpu_metrics

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
