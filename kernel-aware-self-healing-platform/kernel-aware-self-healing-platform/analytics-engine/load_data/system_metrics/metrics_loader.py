import json
import os
import re

import requests


METRIC_MAP = {
    "CPU Usage (%)": "process_cpu_percent",
    "Memory Usage (%)": "process_memory_percent",
    "Disk Usage (%)": "disk_usage_percent",
    "Disk Read": "process_disk_read_bytes",
    "Disk Write": "process_disk_write_bytes",
    "disk_read_bytes": "process_disk_read_bytes",
    "disk_write_bytes": "process_disk_write_bytes",
    "Thread Count": "process_threads",
    "Open Files": "process_open_files",
}

PROMETHEUS_URL = os.environ.get("PROMETHEUS_URL", "http://localhost:9090").rstrip("/")


def query_prometheus(query: str):
    response = requests.get(
        f"{PROMETHEUS_URL}/api/v1/query",
        params={"query": query},
        timeout=10,
    )
    response.raise_for_status()
    data = response.json()
    if data.get("status") != "success":
        raise RuntimeError("Prometheus query failed")
    return data.get("data", {}).get("result", [])


def get_cpu_metrics():
    return query_prometheus("process_cpu_percent")


def get_memory_metrics():
    return query_prometheus("process_memory_rss_bytes")


def get_disk_metrics(system_id=None):
    if system_id is None:
        return query_prometheus("disk_usage_percent")
    return get_disk_metric(system_id, "disk_usage_percent")


def get_network_metrics():
    return query_prometheus("network_byte_sent_total")


def get_process_metric(system_id, process_name, metric):
    metric_name = metric.get("metric") if isinstance(metric, dict) else str(metric)
    prometheus_metric = METRIC_MAP.get(metric_name, metric_name)
    if not prometheus_metric.startswith("process_"):
        raise ValueError(f"Unsupported Process metric: {metric_name}")

    labels = {
        "system_id": str(system_id),
        "name": str(process_name),
    }
    label_selector = ",".join(f"{key}={json.dumps(value)}" for key, value in labels.items())
    return query_prometheus(f"{prometheus_metric}{{{label_selector}}}")


def get_disk_metric(system_id, metric_name):
    """Query a disk metric by its exported name and actual Prometheus system label."""
    if not re.fullmatch(r"[a-zA-Z_:][a-zA-Z0-9_:]*", str(metric_name or "")):
        raise ValueError("Invalid Prometheus metric name")
    return query_prometheus(
        f"{metric_name}{{system_id={json.dumps(str(system_id))}}}"
    )
