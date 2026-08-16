import requests

PROMETHEUS_URL = "http://localhost:9090"


def query_prometheus(query: str):
    response = requests.get(
        f"{PROMETHEUS_URL}/api/v1/query",
        params={"query": query},
        timeout=10,
    )

    response.raise_for_status()

    data = response.json()

    if data["status"] != "success":
        raise RuntimeError("Prometheus query failed")

    return data["data"]["result"]


def get_cpu_metrics():
    return query_prometheus(
        'process_cpu_percent'
    )


def get_memory_metrics():
    return query_prometheus(
        'process_memory_rss_bytes'
    )


def get_disk_metrics():
    return query_prometheus(
        'disk_usage_percent'
    )


def get_network_metrics():
    return query_prometheus(
        'network_byte_sent_total'
    )


def get_process_metrics():
    return query_prometheus(
        'process_cpu_percent'
    )


def get_metrics():



    return {
        "cpu": get_cpu_metrics(),
        "memory": get_memory_metrics(),
        "disk": get_disk_metrics(),
        "network": get_network_metrics(),
        "process": get_process_metrics(),
    }
