# ============================================================
# Exporter
#
# Converts log collector data into:
#
#   • Prometheus Metrics
#   • Loki Log Streams
#
# Source:
#   collectors.logs
# ============================================================

import json
import os
import time
import requests
from pathlib import Path

from prometheus_client import Gauge
from prometheus_client import generate_latest

from collectors.logs import (
    refresh_sources,
    get_logs_snapshot
)


# ============================================================
# Configuration
# ============================================================

# Loki runs in a separate container in docker-compose, so localhost only works
# when the exporter is running directly on the host.
MONITORING_SERVER = os.getenv(
    "LOKI_HOST",
    "loki" if Path("/.dockerenv").exists() else "localhost"
)

PROMETHEUS_PORT = 8001

LOKI_PORT = 3100

JOB_NAME = "kaisp_logs"

LOKI_URL = (
    f"http://{MONITORING_SERVER}:{LOKI_PORT}"
    "/loki/api/v1/push"
)


# ============================================================
# Kernel Metrics
# ============================================================

kernel_journal_logs = Gauge(
    "kernel_journal_logs_total",
    "Total kernel journal log entries"
)

kernel_logs = Gauge(
    "kernel_logs_total",
    "Total kernel log entries"
)

boot_logs = Gauge(
    "boot_logs_total",
    "Total boot log entries"
)

oom_events = Gauge(
    "oom_events_total",
    "Total OOM killer events"
)

filesystem_errors = Gauge(
    "filesystem_errors_total",
    "Total filesystem errors"
)

hardware_errors = Gauge(
    "hardware_errors_total",
    "Total hardware errors"
)

network_errors = Gauge(
    "network_errors_total",
    "Total network errors"
)


# ============================================================
# Authentication Metrics
# ============================================================

authentication_logs = Gauge(
    "authentication_logs_total",
    "Total authentication log entries"
)

ssh_logs = Gauge(
    "ssh_logs_total",
    "Total SSH log entries"
)

failed_logins = Gauge(
    "failed_logins_total",
    "Total failed login attempts"
)

successful_logins = Gauge(
    "successful_logins_total",
    "Total successful login attempts"
)

sudo_events = Gauge(
    "sudo_events_total",
    "Total sudo events"
)

permission_denied = Gauge(
    "permission_denied_total",
    "Total permission denied events"
)

privilege_escalation = Gauge(
    "privilege_escalation_total",
    "Total privilege escalation events"
)

authentication_failures = Gauge(
    "authentication_failures_total",
    "Total authentication failures"
)

security_events = Gauge(
    "security_events_total",
    "Total security related events"
)

# ============================================================
# Service Metrics
# ============================================================

service_logs = Gauge(
    "service_logs_total",
    "Total service log entries"
)

failed_services = Gauge(
    "failed_services_total",
    "Total failed service events"
)

running_services = Gauge(
    "running_services_total",
    "Total running service events"
)

restart_events = Gauge(
    "service_restart_events_total",
    "Total service restart events"
)

service_failures = Gauge(
    "service_failures_total",
    "Total service failures"
)

service_status_changes = Gauge(
    "service_status_changes_total",
    "Total service status changes"
)


# ============================================================
# User Metrics
# ============================================================

logged_users = Gauge(
    "logged_users",
    "Currently logged in users"
)

login_history = Gauge(
    "login_history_total",
    "Total login history entries"
)

cron_logs = Gauge(
    "cron_logs_total",
    "Total cron log entries"
)

application_logs = Gauge(
    "application_logs_total",
    "Total application log entries"
)

root_logins = Gauge(
    "root_logins_total",
    "Total root login events"
)

remote_logins = Gauge(
    "remote_logins_total",
    "Total remote login events"
)

local_logins = Gauge(
    "local_logins_total",
    "Total local login events"
)


# ============================================================
# Log File Metrics
# ============================================================

configured_log_files = Gauge(
    "configured_log_files",
    "Configured log files"
)

existing_log_files = Gauge(
    "existing_log_files",
    "Existing log files"
)

missing_log_files = Gauge(
    "missing_log_files",
    "Missing log files"
)

empty_log_files = Gauge(
    "empty_log_files",
    "Empty log files"
)

large_log_files = Gauge(
    "large_log_files",
    "Large log files"
)

recent_log_files = Gauge(
    "recent_log_files",
    "Recently modified log files"
)

total_log_size_mb = Gauge(
    "total_log_size_mb",
    "Total log file size in MB"
)


# ============================================================
# Snapshot Summary Metrics
# ============================================================

snapshot_kernel_logs = Gauge(
    "snapshot_kernel_logs_total",
    "Kernel logs in current snapshot"
)

snapshot_journal_logs = Gauge(
    "snapshot_journal_logs_total",
    "Journal logs in current snapshot"
)

snapshot_authentication_logs = Gauge(
    "snapshot_authentication_logs_total",
    "Authentication logs in current snapshot"
)

snapshot_security_events = Gauge(
    "snapshot_security_events_total",
    "Security events in current snapshot"
)

snapshot_failed_logins = Gauge(
    "snapshot_failed_logins_total",
    "Failed logins in current snapshot"
)

snapshot_failed_services = Gauge(
    "snapshot_failed_services_total",
    "Failed services in current snapshot"
)

snapshot_logged_users = Gauge(
    "snapshot_logged_users",
    "Logged users in current snapshot"
)

snapshot_cron_logs = Gauge(
    "snapshot_cron_logs_total",
    "Cron logs in current snapshot"
)

snapshot_application_logs = Gauge(
    "snapshot_application_logs_total",
    "Application logs in current snapshot"
)

snapshot_existing_log_files = Gauge(
    "snapshot_existing_log_files",
    "Existing log files in current snapshot"
)

snapshot_missing_log_files = Gauge(
    "snapshot_missing_log_files",
    "Missing log files in current snapshot"
)


# ============================================================
# Loki Helper Functions
# ============================================================

def push_logs(
    stream_name,
    log_entries,
    host,
    environment
):
    """
    Push a list of log entries to Loki.
    """

    if not log_entries:
        return

    values = []

    for entry in log_entries:

        if not entry:
            continue

        values.append(
            [
                str(time.time_ns()),
                str(entry).rstrip()
            ]
        )

    if not values:
        return

    payload = {
        "streams": [
            {
                "stream": {
                    "job": JOB_NAME,
                    "collector": "logs",
                    "host": host,
                    "environment": environment,
                    "stream": stream_name
                },
                "values": values
            }
        ]
    }

    try:

        response = requests.post(
            LOKI_URL,
            json=payload,
            timeout=10
        )

        response.raise_for_status()

    except Exception as e:

        print(
            f"Loki Export Error ({stream_name}) : {e}"
        )


# ============================================================
# Export Snapshot to Loki
# ============================================================

def export_snapshot_to_loki(logs):

    host = logs["hostname"]

    environment = logs["environment"]["environment"]


    # ============================================================
    # Kernel
    # ============================================================

    push_logs(
        "kernel_journal",
        logs["kernel"]["journal"],
        host,
        environment
    )

    push_logs(
        "kernel_logs",
        logs["kernel"]["kernel_logs"],
        host,
        environment
    )

    push_logs(
        "boot_logs",
        logs["kernel"]["boot_logs"],
        host,
        environment
    )

    push_logs(
        "oom_killer",
        logs["kernel"]["oom_killer"],
        host,
        environment
    )

    push_logs(
        "filesystem_errors",
        logs["kernel"]["filesystem_errors"],
        host,
        environment
    )

    push_logs(
        "hardware_errors",
        logs["kernel"]["hardware_errors"],
        host,
        environment
    )

    push_logs(
        "network_errors",
        logs["kernel"]["network_errors"],
        host,
        environment
    )


    # ============================================================
    # Authentication
    # ============================================================

    push_logs(
        "authentication_logs",
        logs["authentication"]["logs"],
        host,
        environment
    )

    push_logs(
        "ssh_logs",
        logs["authentication"]["ssh"],
        host,
        environment
    )

    push_logs(
        "failed_logins",
        logs["authentication"]["failed_logins"],
        host,
        environment
    )

    push_logs(
        "successful_logins",
        logs["authentication"]["successful_logins"],
        host,
        environment
    )

    push_logs(
        "sudo_logs",
        logs["authentication"]["sudo"],
        host,
        environment
    )

    push_logs(
        "permission_denied",
        logs["authentication"]["permission_denied"],
        host,
        environment
    )

    push_logs(
        "privilege_escalation",
        logs["authentication"]["privilege_escalation"],
        host,
        environment
    )

    push_logs(
        "authentication_failures",
        logs["authentication"]["authentication_failures"],
        host,
        environment
    )

    push_logs(
        "security_events",
        logs["authentication"]["security_events"],
        host,
        environment
    )



        # ============================================================
    # Services
    # ============================================================

    push_logs(
        "service_logs",
        logs["services"]["logs"],
        host,
        environment
    )

    push_logs(
        "failed_services",
        logs["services"]["failed"],
        host,
        environment
    )

    push_logs(
        "running_services",
        logs["services"]["running"],
        host,
        environment
    )

    push_logs(
        "restart_events",
        logs["services"]["restart_events"],
        host,
        environment
    )

    push_logs(
        "started_services",
        logs["services"]["started"],
        host,
        environment
    )

    push_logs(
        "stopped_services",
        logs["services"]["stopped"],
        host,
        environment
    )

    push_logs(
        "reloaded_services",
        logs["services"]["reloaded"],
        host,
        environment
    )

    push_logs(
        "service_failures",
        logs["services"]["failures"],
        host,
        environment
    )

    push_logs(
        "status_changes",
        logs["services"]["status_changes"],
        host,
        environment
    )


    # ============================================================
    # Users
    # ============================================================

    push_logs(
        "logged_users",
        logs["users"]["logged_users"],
        host,
        environment
    )

    push_logs(
        "login_history",
        logs["users"]["login_history"],
        host,
        environment
    )

    push_logs(
        "cron_logs",
        logs["users"]["cron"],
        host,
        environment
    )

    push_logs(
        "application_logs",
        logs["users"]["applications"],
        host,
        environment
    )

    push_logs(
        "root_logins",
        logs["users"]["root_logins"],
        host,
        environment
    )

    push_logs(
        "remote_logins",
        logs["users"]["remote_logins"],
        host,
        environment
    )



    # ============================================================
# Update Log Metrics
# ============================================================

def update_logs_metrics():

    # ------------------------------------------------------------
    # Refresh collector data
    # ------------------------------------------------------------

    refresh_sources()

    logs = get_logs_snapshot()

    # ------------------------------------------------------------
    # Optional Debug
    # ------------------------------------------------------------

    # print(
    #     json.dumps(
    #         logs,
    #         indent=4
    #     )
    # )


    # ============================================================
    # Kernel Metrics
    # ============================================================

    kernel = logs["kernel"]["statistics"]

    kernel_journal_logs.set(
        kernel["journal_logs"]
    )

    kernel_logs.set(
        kernel["kernel_logs"]
    )

    boot_logs.set(
        kernel["boot_logs"]
    )

    oom_events.set(
        kernel["oom_events"]
    )

    filesystem_errors.set(
        kernel["filesystem_errors"]
    )

    hardware_errors.set(
        kernel["hardware_errors"]
    )

    network_errors.set(
        kernel["network_errors"]
    )


    # ============================================================
    # Authentication Metrics
    # ============================================================

    authentication = logs["authentication"]["statistics"]

    authentication_logs.set(
        authentication["authentication_logs"]
    )

    ssh_logs.set(
        authentication["ssh_logs"]
    )

    failed_logins.set(
        authentication["failed_logins"]
    )

    successful_logins.set(
        authentication["successful_logins"]
    )

    sudo_events.set(
        authentication["sudo_events"]
    )

    permission_denied.set(
        authentication["permission_denied"]
    )

    privilege_escalation.set(
        authentication["privilege_escalation"]
    )

    authentication_failures.set(
        authentication["authentication_failures"]
    )

    security_events.set(
        authentication["security_events"]
    )


        # ============================================================
    # Service Metrics
    # ============================================================

    services = logs["services"]["statistics"]

    service_logs.set(
        services["service_logs"]
    )

    failed_services.set(
        services["failed_services"]
    )

    running_services.set(
        services["running_services"]
    )

    restart_events.set(
        services["restart_events"]
    )

    service_failures.set(
        services["failures"]
    )

    service_status_changes.set(
        services["status_changes"]
    )


    # ============================================================
    # User Metrics
    # ============================================================

    users = logs["users"]["statistics"]

    logged_users.set(
        users["logged_users"]
    )

    login_history.set(
        users["login_history"]
    )

    cron_logs.set(
        users["cron_logs"]
    )

    application_logs.set(
        users["application_logs"]
    )

    root_logins.set(
        users["root_logins"]
    )

    remote_logins.set(
        users["remote_logins"]
    )

    local_logins.set(
        users["local_logins"]
    )


    # ============================================================
    # Log File Metrics
    # ============================================================

    log_files = logs["log_files"]["summary"]

    configured_log_files.set(
        log_files["configured_logs"]
    )

    existing_log_files.set(
        log_files["existing_logs"]
    )

    missing_log_files.set(
        log_files["missing_logs"]
    )

    empty_log_files.set(
        log_files["empty_logs"]
    )

    large_log_files.set(
        log_files["large_logs"]
    )

    recent_log_files.set(
        log_files["recent_logs"]
    )

    total_log_size_mb.set(
        log_files["total_size_mb"]
    )


        # ============================================================
    # Snapshot Summary Metrics
    # ============================================================

    summary = logs["summary"]

    snapshot_kernel_logs.set(
        summary["kernel"]["kernel_logs"]
    )

    snapshot_journal_logs.set(
        summary["kernel"]["journal_logs"]
    )

    snapshot_authentication_logs.set(
        summary["authentication"]["authentication_logs"]
    )

    snapshot_security_events.set(
        summary["authentication"]["security_events"]
    )

    snapshot_failed_logins.set(
        summary["authentication"]["failed_logins"]
    )

    snapshot_failed_services.set(
        summary["services"]["failed_services"]
    )

    snapshot_logged_users.set(
        summary["users"]["logged_users"]
    )

    snapshot_cron_logs.set(
        summary["users"]["cron_logs"]
    )

    snapshot_application_logs.set(
        summary["users"]["application_logs"]
    )

    snapshot_existing_log_files.set(
        summary["logs"]["existing_logs"]
    )

    snapshot_missing_log_files.set(
        summary["logs"]["missing_logs"]
    )


    # ============================================================
    # Export All Logs to Loki
    # ============================================================

    export_snapshot_to_loki(
        logs
    )


    return generate_latest().decode(
        "utf-8"
    )


# ============================================================
# Standalone Test
# ============================================================

if __name__ == "__main__":

    print(
        update_logs_metrics()
    )