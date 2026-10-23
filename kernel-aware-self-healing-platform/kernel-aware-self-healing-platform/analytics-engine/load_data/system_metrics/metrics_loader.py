import requests
from sqlalchemy.orm import query

PROCESS_METRIC_MAP = {
    "CPU Usage (%)": "process_cpu_percent",
    "Memory Usage (%)": "process_memory_percent",
    "Disk Usage (%)": "disk_usage_percent",
    "Disk Read": "process_disk_read_bytes",
    "Disk Write": "process_disk_write_bytes",
}

SERVICE_METRIC_MAP = {
    "CPU Usage (%)": "service_cpu_usage_percent",
    "Memory Usage (%)": "service_memory_rss_bytes",
    "Disk Usage (%)": "service_disk_usage_bytes",
}

CPU_METRIC_MAP = {
    "cpu_usage_percent": "cpu_usage_percent",
    "cpu_load_1min": "cpu_load_1min",
    "cpu_load_5min": "cpu_load_5min",
    "cpu_load_15min": "cpu_load_15min",
    "cpu_core_usage_percent": "cpu_core_usage_percent",
    "cpu_freq_current_mhz": "cpu_freq_current_mhz",
    "cpu_times_user": "cpu_times_user",
    "cpu_times_system": "cpu_times_system",
    "cpu_times_iowait": "cpu_times_iowait",
    "cpu_times_steal": "cpu_times_steal",
    "cpu_ctx_switches": "cpu_ctx_switches",
}

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


def get_process_metric(system_id, process_details, metric):
    process_name = process_details.split("@service=")[0]
    pid = process_details.split("@pid=")[1]
    prometheus_metric = PROCESS_METRIC_MAP[metric["metric"]]

    query = f'''
        {prometheus_metric}{{
            system_id="{system_id}",
            name="{process_name}",
            pid="{pid}",
        }}
    '''
    return query_prometheus(query)

def get_service_metric(system_id, service_details, metric):

    service_name = service_details.split("@pid=")[0]
    prometheus_metric = SERVICE_METRIC_MAP[metric["metric"]]

    query = f'''
        {prometheus_metric}{{
            system_id="{system_id}",
            name="{service_name}"
        }}
    '''
    return query_prometheus(query)

def get_cpu_metric(system_id, metric):
    prometheus_metric = CPU_METRIC_MAP[metric["metric"]]
    labels = [f'system_id="{system_id}"']

    core = metric.get("core")
    if prometheus_metric == "cpu_core_usage_percent" and core is not None:
        labels.append(f'core="{core}"')

    query = f"{prometheus_metric}{{{', '.join(labels)}}}"
    return query_prometheus(query)






