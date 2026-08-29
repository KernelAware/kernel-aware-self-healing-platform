from get_metrics.prometheus_client import query_prometheus

METRIC_MAP = {
    "CPU Usage (%)": "process_cpu_percent",
    "Memory Usage (%)": "process_memory_percent",
    "Disk Read": "process_disk_read_bytes",
    "Disk Write": "process_disk_write_bytes",
}

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
    prometheus_metric = METRIC_MAP[metric]

    query = f'''
        {prometheus_metric}{{
            system_id="{system_id}",
            name="{process_name}"
        }}
    '''

    return query_prometheus(query)