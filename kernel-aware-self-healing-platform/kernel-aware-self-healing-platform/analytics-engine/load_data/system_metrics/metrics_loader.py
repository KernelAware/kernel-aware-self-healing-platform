import requests
from sqlalchemy.orm import query

METRIC_MAP = {
    "CPU Usage (%)": "process_cpu_percent",
    "Memory Usage (%)": "process_memory_percent",
    "Disk Usage (%)": "disk_usage_percent",
    "Disk Read": "process_disk_read_bytes",
    "Disk Write": "process_disk_write_bytes",
}

DISK_METRIC_MAP = {
    "Disk Usage (%)": ("disk_usage_percent", ("device", "mountpoint", "filesystem")),
    "Read Throughput": ("disk_read_speed_mb", ()),
    "Write Throughput": ("disk_write_speed_mb", ()),
    "Read IOPS": ("disk_read_iops", ()),
    "Write IOPS": ("disk_write_iops", ()),
    "Read Latency": ("disk_read_latency_ms", ()),
    "Write Latency": ("disk_write_latency_ms", ()),
    "Disk Busy Time (%)": ("disk_busy_percentage", ()),
    "Read Operations": ("disk_read_count", ()),
    "Write Operations": ("disk_write_count", ()),
    "Read Time": ("disk_read_time_ms", ()),
    "Write Time": ("disk_write_time_ms", ()),
}

DISK_PER_DEVICE_MAP = {
    "Read Throughput": "disk_per_read_speed_mb",
    "Write Throughput": "disk_per_write_speed_mb",
    "Read IOPS": "disk_per_read_iops",
    "Write IOPS": "disk_per_write_iops",
    "Read Latency": "disk_per_read_latency_ms",
    "Write Latency": "disk_per_write_latency_ms",
    "Disk Busy Time (%)": "disk_per_busy_percentage",
    "Read Operations": "disk_per_read_count",
    "Write Operations": "disk_per_write_count",
    "Read Time": "disk_per_read_time_ms",
    "Write Time": "disk_per_write_time_ms",
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


def get_process_metric(system_id, process_name, metric):
    prometheus_metric = METRIC_MAP[metric["metric"]]

    query = f'''
        {prometheus_metric}{{
            system_id="{system_id}",
            name="{process_name}"
        }}
    '''

    return query_prometheus(query)


def get_disk_metric(target, metric):
    prometheus_metric, labels = DISK_METRIC_MAP[metric["metric"]]
    if target.get("device") and metric["metric"] in DISK_PER_DEVICE_MAP:
        prometheus_metric = DISK_PER_DEVICE_MAP[metric["metric"]]
        labels = ("disk",)
    label_values = {
        "device": target.get("device"),
        "mountpoint": target.get("mountpoint"),
        "filesystem": target.get("filesystem"),
        "disk": target.get("device") or target.get("disk"),
    }
    filters = [
        f'{label}="{label_values[label]}"'
        for label in labels
        if label_values.get(label)
    ]
    selector = "{" + ",".join(filters) + "}" if filters else ""
    return query_prometheus(f"{prometheus_metric}{selector}")






