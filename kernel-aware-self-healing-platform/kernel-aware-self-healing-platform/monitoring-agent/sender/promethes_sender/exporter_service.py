
import os
import subprocess
from prometheus_client import Gauge
from collectors.system_metrics.service import collect_services, get_service_summary

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
    ["name", "status", "startup_type", "pid", "user"]
)

service_cpu_usage = Gauge(
    "service_cpu_usage_percent",
    "CPU usage percentage of service",
    ["name", "pid"]
)

service_memory_usage = Gauge(
    "service_memory_rss_bytes",
    "Memory RSS usage of service",
    ["name", "pid"]
)

service_uptime = Gauge(
    "service_uptime_seconds",
    "Service uptime in seconds",
    ["name", "pid"]
)

service_disk_usage = Gauge(
    "service_disk_usage_bytes",
    "Measured disk usage of service directories or sizes of open files",
    ["name", "pid", "source"]
)

DIRECTORY_TYPES = {
    "StateDirectory": "/var/lib",
    "LogsDirectory": "/var/log",
    "CacheDirectory": "/var/cache",
    "ConfigurationDirectory": "/etc",
    "RuntimeDirectory": "/run",
}


def get_unit_directories(name):
    directories = []

    try:
        result = subprocess.run(
            [
                "systemctl",
                "show",
                f"{name.removesuffix('.service')}.service",
                "--property=StateDirectory",
                "--property=LogsDirectory",
                "--property=CacheDirectory",
                "--property=ConfigurationDirectory",
                "--property=RuntimeDirectory",
                "--no-pager",
            ],
            capture_output=True,
            text=True,
            timeout=5,
            check=True,
        )

        properties = {}

        for line in result.stdout.splitlines():
            if "=" in line:
                key, value = line.split("=", 1)
                properties[key] = value.strip()

        for property_name, base_path in DIRECTORY_TYPES.items():
            value = properties.get(property_name, "")

            for directory_name in value.split():
                if os.path.isabs(directory_name):
                    path = directory_name
                else:
                    path = os.path.join(base_path, directory_name)

                if os.path.isdir(path):
                    directories.append(os.path.realpath(path))

    except (subprocess.SubprocessError, OSError):
        pass

    return list(dict.fromkeys(directories))


def get_directory_disk_usage(path):
    try:
        result = subprocess.run(
            ["du", "-sB1", "--", path],
            capture_output=True,
            text=True,
            timeout=15,
            check=True,
        )

        return int(result.stdout.split()[0])

    except (subprocess.SubprocessError, ValueError, OSError, IndexError):
        return 0


def get_open_files_size(pid):
    if not pid or int(pid) <= 0:
        return 0

    fd_directory = f"/proc/{int(pid)}/fd"
    total_size = 0
    seen_files = set()

    try:
        file_descriptors = os.listdir(fd_directory)

        for fd in file_descriptors:
            fd_path = os.path.join(fd_directory, fd)

            try:
                file_stat = os.stat(fd_path)

                if not os.path.isfile(fd_path):
                    continue

                file_identity = (file_stat.st_dev, file_stat.st_ino)

                if file_identity in seen_files:
                    continue

                seen_files.add(file_identity)
                total_size += file_stat.st_size

            except (OSError, PermissionError):
                continue

    except (OSError, PermissionError):
        return 0

    return total_size


def get_service_disk_measurements(service):
    name = service["service_name"]
    pid = int(service.get("main_pid") or 0)

    directories = get_unit_directories(name)

    if directories:
        return [
            (path, get_directory_disk_usage(path))
            for path in directories
        ]

    if pid > 0:
        return [("open_files", get_open_files_size(pid))]

    return [("unavailable", 0)]


def update_service_metrics():
    services = collect_services()
    summary = get_service_summary(services)

    service_total.set(summary["total"])

    for status, count in summary.items():
        if status != "total":
            service_status_total.labels(status=status).set(count)

    service_disk_usage.clear()

    for service in services:
        name = service["service_name"]
        pid = str(service.get("main_pid") or 0)

        service_info.labels(
            name=name,
            status=service["status"],
            startup_type=service["startup_type"],
            pid=pid,
            user=service["user"],
        ).set(1)

        service_cpu_usage.labels(
            name=name,
            pid=pid,
        ).set(service["cpu_percent"])

        service_memory_usage.labels(
            name=name,
            pid=pid,
        ).set(service["memory_rss_bytes"])

        service_uptime.labels(
            name=name,
            pid=pid,
        ).set(service["uptime_seconds"])

        measurements = get_service_disk_measurements(service)

        for source, size_bytes in measurements:
            service_disk_usage.labels(
                name=name,
                pid=pid,
                source=source,
            ).set(size_bytes)
