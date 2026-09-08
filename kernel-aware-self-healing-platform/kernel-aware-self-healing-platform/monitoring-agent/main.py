from sender.exporter_cpu import update_cpu_metrics
from fastapi import FastAPI
from fastapi.responses import Response
from sender.exporter_disk import update_disk_metrics
# from sender.exporter_logs import update_logs_metrics
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from collectors.process import initialize_cpu_measurement

from sender.exporter_network import update_network_metrics
from sender.exporter_process import update_process_metrics
from sender.exporter_service import update_service_metrics
from sender.exporter_memory import update_memory_metrics
from sender.exporter_health import update_health_metrics

import logging
import threading
import time

app = FastAPI()
logger = logging.getLogger(__name__)

last_metrix = ""


def collect_metrics():
    initialize_cpu_measurement()

    collectors = (
        ("process", update_process_metrics, 15),
        ("service", update_service_metrics, 30),
        ("network", update_network_metrics, 5),
        ("disk", update_disk_metrics, 5),
        ("cpu", update_cpu_metrics, 5),
        ("memory", update_memory_metrics, 5),
        ("health", update_health_metrics, 60),
        # ("logs", update_logs_metrics, 60),
    )

    def run_collector(name, collector, interval):
        time.sleep(2)
        while True:
            started = time.monotonic()
            try:
                collector()
            except Exception:
                logger.exception("%s metrics collection failed", name)

            elapsed = time.monotonic() - started
            time.sleep(max(0, interval - elapsed))

    for name, collector, interval in collectors:
        threading.Thread(
            target=run_collector,
            args=(name, collector, interval),
            daemon=True,
            name=f"metrics-{name}"
        ).start()


threading.Thread(
    target=collect_metrics,
    daemon=True
).start()


@app.get("/system_metrics")
def metrics():
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )
