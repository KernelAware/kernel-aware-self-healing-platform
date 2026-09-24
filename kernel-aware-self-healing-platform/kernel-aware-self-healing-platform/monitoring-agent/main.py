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
from sender.backend_sender.send_backend import send_process_inventory

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
        update_process_metrics()

        update_service_metrics()

        update_network_metrics()

        update_disk_metrics()

        update_logs_metrics()

        update_network_metrics()

        update_cpu_metrics()

        update_network_metrics()
        
        update_memory_metrics()

        update_health_metrics()


def collect_process_inventory():

    while True:
        try:
            processes = get_processes()

            send_process_inventory(
                system_id=1,
                processes=processes
            )

        except Exception as e:
            logger.error(f"Process inventory error: {e}")

        time.sleep(30)


threading.Thread(
    target=collect_metrics,
    daemon=True
).start()

threading.Thread(
    target=collect_process_inventory,
    daemon=True
).start()

@app.get("/system_metrics")
def metrics():
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )
