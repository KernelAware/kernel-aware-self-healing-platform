from get_metrics.prometheus_client import Gauge, generate_latest, CONTENT_TYPE_LATEST
from collectors.service import collect_services, get_service_summary

service_total = Gauge(
    "service_total",
    "Total systemd services"
)

service_status_total = Gauge(
    "service_status_total",
    "Number of services by status",
    ["status"]
)

service_info = Gauge(
    "service_info",
    "Systemd service information",
    [
        "name",
        "status",
        "startup_type",
        "pid",
        "user"
    ]
)


service_cpu_usage = Gauge(
    "service_cpu_usage_percent",
    "CPU usage percentage of service",
    [
        "name",
        "pid"
    ]
)


service_memory_usage = Gauge(
    "service_memory_rss_bytes",
    "Memory RSS usage of service",
    [
        "name",
        "pid"
    ]
)


service_uptime = Gauge(
    "service_uptime_seconds",
    "Service uptime in seconds",
    [
        "name",
        "pid"
    ]
)

def update_service_metrics():

    services = collect_services()
    summary = get_service_summary(services)

    service_total.set(summary["total"])

    for status, count in summary.items():
        if status != "total":
            service_status_total.labels(
                status=status
            ).set(count)

    for service in services:

        name = service["service_name"]
        pid = str(service["main_pid"])

        service_info.labels(
            name=name,
            status=service["status"],
            startup_type=service["startup_type"],
            pid=pid,
            user=service["user"]
        ).set(1)

        service_cpu_usage.labels(
            name=name,
            pid=pid
        ).set(service["cpu_percent"])

        service_memory_usage.labels(
            name=name,
            pid=pid
        ).set(service["memory_rss_bytes"])

        service_uptime.labels(
            name=name,
            pid=pid
        ).set(service["uptime_seconds"])