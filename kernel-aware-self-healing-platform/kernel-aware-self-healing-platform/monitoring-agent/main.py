from fastapi import FastAPI
from fastapi.responses import Response
from prometheus_client import generate_latest
from sender.exporter_network import update_network_metrics
from sender.exporter_disk import update_disk_metrics
from sender.exporter_logs import update_logs_metrics

import logging
import threading
import time

app = FastAPI()
logger = logging.getLogger(__name__)

last_metrix = ""


def collect_metrix():
    global last_metrix

    # Seed the endpoint immediately so Prometheus never sees an empty scrape body.
    last_metrix = generate_latest().decode("utf-8")

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

        time.sleep(1)


@app.get("/metrics")
def metrics():
    return Response(
        content=last_metrix,
        media_type="text/plain; version=0.0.4; charset=utf-8",
    )


threading.Thread(target=collect_metrix, daemon=True).start()
