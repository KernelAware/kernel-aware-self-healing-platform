
from sender.promethes_sender.exporter_cpu import update_cpu_metrics
from fastapi import FastAPI
from fastapi.responses import Response
from sender.promethes_sender.exporter_disk import update_disk_metrics
from sender.promethes_sender.exporter_logs import update_logs_metrics
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from collectors.system_metrics.process import initialize_cpu_measurement

from sender.promethes_sender.exporter_network import update_network_metrics
from sender.promethes_sender.exporter_process import update_process_metrics
from sender.promethes_sender.exporter_service import update_service_metrics
from sender.promethes_sender.exporter_memory import update_memory_metrics
from sender.promethes_sender.exporter_health import update_health_metrics

from collectors.process_details.process_collector import get_processes
from sender.backend_sender.send_backend import send_inventory

from collectors.service_details.service_collector import get_services

import logging
import threading
import time


app = FastAPI()
logger = logging.getLogger(__name__)

last_metrix = ""


# --------------------------------------------------
# START INDIVIDUAL METRIC COLLECTOR THREADS
# --------------------------------------------------

def start_collector(name, collector, interval):

    def run_collector():

        time.sleep(2)

        while True:

            started = time.monotonic()

            try:
                collector()

            except Exception:
                logger.exception(
                    "%s metrics collection failed",
                    name
                )

            elapsed = time.monotonic() - started

            time.sleep(max(0, interval - elapsed))

    threading.Thread(
        target=run_collector,
        daemon=True,
        name=f"metrics-{name}"
    ).start()

    logger.info(
        "%s collector started with %s-second interval",
        name,
        interval
    )


# --------------------------------------------------
# METRIC COLLECTION
# --------------------------------------------------

def collect_metrics():

    initialize_cpu_measurement()

    time.sleep(2)

    start_collector("cpu", update_cpu_metrics, 5)
    start_collector("memory", update_memory_metrics, 5)
    start_collector("disk", update_disk_metrics, 5)
    start_collector("network", update_network_metrics, 5)

    #start_collector("logs", update_logs_metrics, 60)

    start_collector("process", update_process_metrics, 15)
    start_collector("service", update_service_metrics, 30)

    start_collector("health", update_health_metrics, 60)


# --------------------------------------------------
# PROCESS INVENTORY COLLECTION
# --------------------------------------------------

def collect_process_inventory():

    while True:

        try:
            processes = get_processes()

            send_inventory(
                system_id=1,
                items=processes,
                inventory_type="processes"
            )

        except Exception as e:
            logger.error(
                "Process inventory error: %s",
                e
            )

        time.sleep(30)


# --------------------------------------------------
# SERVICE INVENTORY COLLECTION
# --------------------------------------------------

def collect_service_inventory():

    while True:

        try:
            services = get_services()

            send_inventory(
                system_id=1,
                items=services,
                inventory_type="services"
            )

        except Exception as e:
            logger.error(
                "Service inventory error: %s",
                e
            )

        time.sleep(30)


# --------------------------------------------------
# START BACKGROUND THREADS
# --------------------------------------------------

threading.Thread(
    target=collect_metrics,
    daemon=True,
    name="metrics-manager"
).start()


threading.Thread(
    target=collect_process_inventory,
    daemon=True,
    name="process-inventory"
).start()


threading.Thread(
    target=collect_service_inventory,
    daemon=True,
    name="service-inventory"
).start()


# --------------------------------------------------
# PROMETHEUS METRICS ENDPOINT
# --------------------------------------------------

@app.get("/system_metrics")
def metrics():

    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )
