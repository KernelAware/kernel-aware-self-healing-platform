from fastapi import FastAPI
from exporter import update_network_metrics

import threading
import time

app = FastAPI()

last_metrix= {}

def collect_metrix():
    global last_metrix
    last_metrix = {}

    while True:
        pakaya = update_network_metrics()
        print(pakaya)

        time.sleep(1)

@app.get("/metrics")
def metrics():
    return last_metrix

threading.Thread(target=collect_metrix, daemon=True).start()
