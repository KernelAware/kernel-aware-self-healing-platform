import json
import os
import socket
import subprocess
import logging
import time

from pathlib import Path
from datetime import datetime


# ============================================================
# Logging Configuration
# ============================================================

logging.basicConfig(
    filename="app.txt",
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

logger = logging.getLogger(__name__)


# ============================================================
# Configuration
# ============================================================

DEFAULT_LOG_LINES = 100

COMMAND_TIMEOUT = 10


# ============================================================
# Linux Log Files
# ============================================================

COMMON_LOG_FILES = {

    "syslog": "/var/log/syslog",

    "messages": "/var/log/messages",

    "auth": "/var/log/auth.log",

    "kern": "/var/log/kern.log",

    "boot": "/var/log/boot.log",

    "cron": "/var/log/cron"

}


# ============================================================
# Snapshot Cache
# ============================================================

"""
Every Linux source is collected ONLY ONCE.

Every filtering function reuses this cache.

This dramatically improves performance.
"""

CACHE = {

    "timestamp": None,

    "hostname": None,

    # journalctl
    "system_journal": [],

    # journalctl -k
    "kernel_logs": [],

    # auth.log
    "auth_logs": [],

    # syslog
    "syslog": [],

    # systemctl --failed
    "failed_services": [],

    # systemctl list-units
    "running_services": [],

    # last
    "login_history": [],

    # who
    "logged_users": []

}


# ============================================================
# Helper
# Clear Cache
# ============================================================

def clear_cache():

    CACHE["timestamp"] = None

    CACHE["hostname"] = None

    CACHE["system_journal"] = []

    CACHE["kernel_logs"] = []

    CACHE["auth_logs"] = []

    CACHE["syslog"] = []

    CACHE["failed_services"] = []

    CACHE["running_services"] = []

    CACHE["login_history"] = []

    CACHE["logged_users"] = []


# ============================================================
# Helper
# Run Linux Command
# ============================================================

def run_command(command):

    try:

        result = subprocess.run(

            command,

            capture_output=True,

            text=True,

            timeout=COMMAND_TIMEOUT

        )

        if result.returncode != 0:

            logger.warning(

                f"Command failed: "

                f"{' '.join(command)} "

                f"{result.stderr.strip()}"

            )

            return []

        return [

            line.strip()

            for line in result.stdout.splitlines()

            if line.strip()

        ]

    except subprocess.TimeoutExpired:

        logger.error(

            f"Command timeout: "

            f"{' '.join(command)}"

        )

        return []

    except Exception as e:

        logger.error(

            f"Command failed: {e}"

        )

        return []


# ============================================================
# Helper
# Read Log File
# ============================================================

def read_log_file(

        file_path,

        lines=DEFAULT_LOG_LINES

):

    try:

        if not Path(file_path).exists():

            return []

        with open(

            file_path,

            "r",

            encoding="utf-8",

            errors="ignore"

        ) as file:

            content = file.readlines()

        return [

            line.strip()

            for line in content[-lines:]

        ]

    except Exception as e:

        logger.error(

            f"Unable to read "

            f"{file_path}: {e}"

        )

        return []


# ============================================================
# Helper
# Create Log Entry
# ============================================================

def create_log_entry(

        source,

        message

):

    return {

        "timestamp":

            datetime.now().isoformat(),

        "source":

            source,

        "message":

            message

    }


# ============================================================
# Helper
# Bytes → MB
# ============================================================

def bytes_to_mb(value):

    return round(

        value /

        (1024 * 1024),

        2

    )


# ============================================================
# Helper
# Last Modified
# ============================================================

def get_last_modified(path):

    try:

        return datetime.fromtimestamp(

            os.path.getmtime(path)

        ).isoformat()

    except Exception:

        return None


# ============================================================
# Helper
# Refresh Cache
# ============================================================

"""
Refreshes every primary Linux source.

This function is called

ONLY ONCE

before creating a snapshot.
"""

def refresh_cache():

    clear_cache()

    CACHE["timestamp"] = datetime.now().isoformat()

    CACHE["hostname"] = socket.gethostname()

    logger.info(

        "Refreshing Linux log cache..."

    )

    # ============================================================
# Primary Collector
# System Journal
# ============================================================

def collect_system_journal():

    logger.info(

        "Collecting system journal..."

    )

    CACHE["system_journal"] = run_command(

        [

            "journalctl",

            "-n",

            str(DEFAULT_LOG_LINES),

            "--no-pager",

            "--output=short"

        ]

    )


# ============================================================
# Primary Collector
# Kernel Logs
# ============================================================

"""
Uses

journalctl -k

instead of

dmesg

This works on most modern Linux systems
without requiring root.
"""

def collect_kernel_logs():

    logger.info(

        "Collecting kernel logs..."

    )

    CACHE["kernel_logs"] = run_command(

        [

            "journalctl",

            "-k",

            "-n",

            str(DEFAULT_LOG_LINES),

            "--no-pager"

        ]

    )


# ============================================================
# Primary Collector
# Authentication Logs
# ============================================================

def collect_auth_logs():

    logger.info(

        "Collecting authentication logs..."

    )

    auth_file = COMMON_LOG_FILES.get(

        "auth"

    )

    if auth_file and Path(auth_file).exists():

        CACHE["auth_logs"] = read_log_file(

            auth_file,

            DEFAULT_LOG_LINES

        )

        return

    CACHE["auth_logs"] = run_command(

        [

            "journalctl",

            "-u",

            "ssh",

            "-n",

            str(DEFAULT_LOG_LINES),

            "--no-pager"

        ]

    )


# ============================================================
# Primary Collector
# Syslog
# ============================================================

def collect_syslog():

    logger.info(

        "Collecting syslog..."

    )

    logs = []

    for name in [

        "syslog",

        "messages"

    ]:

        path = COMMON_LOG_FILES.get(

            name

        )

        if path and Path(path).exists():

            logs.extend(

                read_log_file(

                    path,

                    DEFAULT_LOG_LINES

                )

            )

    CACHE["syslog"] = logs


# ============================================================
# Primary Collector
# Failed Services
# ============================================================

def collect_failed_services():

    logger.info(

        "Collecting failed services..."

    )

    CACHE["failed_services"] = run_command(

        [

            "systemctl",

            "--failed",

            "--no-pager",

            "--plain"

        ]

    )


# ============================================================
# Primary Collector
# Running Services
# ============================================================

def collect_running_services():

    logger.info(

        "Collecting running services..."

    )

    CACHE["running_services"] = run_command(

        [

            "systemctl",

            "list-units",

            "--type=service",

            "--state=running",

            "--no-pager",

            "--plain"

        ]

    )


# ============================================================
# Primary Collector
# Login History
# ============================================================

def collect_login_history():

    logger.info(

        "Collecting login history..."

    )

    CACHE["login_history"] = run_command(

        [

            "last",

            "-n",

            str(DEFAULT_LOG_LINES)

        ]

    )


# ============================================================
# Primary Collector
# Logged Users
# ============================================================

def collect_logged_users():

    logger.info(

        "Collecting logged-in users..."

    )

    CACHE["logged_users"] = run_command(

        [

            "who"

        ]

    )


# ============================================================
# Refresh Cache
# (Complete)
# ============================================================

def refresh_cache():

    clear_cache()

    CACHE["timestamp"] = datetime.now().isoformat()

    CACHE["hostname"] = socket.gethostname()

    logger.info(

        "Refreshing Linux cache..."

    )

    collect_system_journal()

    collect_kernel_logs()

    collect_auth_logs()

    collect_syslog()

    collect_failed_services()

    collect_running_services()

    collect_login_history()

    collect_logged_users()

    logger.info(

        "Linux cache refreshed."

    )


    # ============================================================
# Kernel Filters
# ============================================================

"""
Every function in this section filters

CACHE["kernel_logs"]

No Linux commands are executed here.
"""


# ============================================================
# Return All Kernel Logs
# ============================================================

def get_kernel_logs():

    return [

        create_log_entry(

            "kernel",

            log

        )

        for log in CACHE["kernel_logs"]

    ]


# ============================================================
# Kernel Errors
# ============================================================

def get_kernel_errors():

    keywords = [

        "error",

        "failed",

        "panic",

        "critical",

        "segfault",

        "oops",

        "bug"

    ]

    errors = []

    for line in CACHE["kernel_logs"]:

        lower = line.lower()

        if any(

            word in lower

            for word in keywords

        ):

            errors.append(

                create_log_entry(

                    "kernel_error",

                    line

                )

            )

    return errors


# ============================================================
# OOM Killer Logs
# ============================================================

def get_oom_logs():

    keywords = [

        "oom",

        "out of memory",

        "killed process",

        "oom-killer"

    ]

    result = []

    for line in CACHE["kernel_logs"]:

        lower = line.lower()

        if any(

            word in lower

            for word in keywords

        ):

            result.append(

                create_log_entry(

                    "oom",

                    line

                )

            )

    return result


# ============================================================
# Filesystem Errors
# ============================================================

def get_filesystem_errors():

    keywords = [

        "ext4",

        "xfs",

        "btrfs",

        "filesystem",

        "superblock",

        "inode",

        "mount failed",

        "fs error"

    ]

    result = []

    for line in CACHE["kernel_logs"]:

        lower = line.lower()

        if any(

            word in lower

            for word in keywords

        ):

            result.append(

                create_log_entry(

                    "filesystem",

                    line

                )

            )

    return result


# ============================================================
# Disk Errors
# ============================================================

def get_disk_errors():

    keywords = [

        "i/o",

        "read error",

        "write error",

        "disk",

        "nvme",

        "sda",

        "sdb",

        "block"

    ]

    result = []

    for line in CACHE["kernel_logs"]:

        lower = line.lower()

        if any(

            word in lower

            for word in keywords

        ):

            result.append(

                create_log_entry(

                    "disk",

                    line

                )

            )

    return result


# ============================================================
# Hardware Errors
# ============================================================

def get_hardware_errors():

    keywords = [

        "cpu",

        "hardware",

        "thermal",

        "pci",

        "memory",

        "machine check",

        "mce",

        "firmware"

    ]

    result = []

    for line in CACHE["kernel_logs"]:

        lower = line.lower()

        if any(

            word in lower

            for word in keywords

        ):

            result.append(

                create_log_entry(

                    "hardware",

                    line

                )

            )

    return result


# ============================================================
# Storage Warnings
# ============================================================

def get_storage_warnings():

    keywords = [

        "readonly",

        "read-only",

        "remount",

        "degraded",

        "bad block",

        "smart",

        "warning"

    ]

    result = []

    for line in CACHE["kernel_logs"]:

        lower = line.lower()

        if any(

            word in lower

            for word in keywords

        ):

            result.append(

                create_log_entry(

                    "storage",

                    line

                )

            )

    return result


# ============================================================
# Kernel Statistics
# ============================================================

def get_kernel_statistics():

    return {

        "kernel_logs":

            len(

                CACHE["kernel_logs"]

            ),

        "kernel_errors":

            len(

                get_kernel_errors()

            ),

        "oom_events":

            len(

                get_oom_logs()

            ),

        "filesystem_errors":

            len(

                get_filesystem_errors()

            ),

        "disk_errors":

            len(

                get_disk_errors()

            ),

        "hardware_errors":

            len(

                get_hardware_errors()

            ),

        "storage_warnings":

            len(

                get_storage_warnings()

            )

    }


# ============================================================
# Authentication Filters
# ============================================================

"""
Every function in this section filters

CACHE["auth_logs"]

No Linux commands are executed here.
"""


# ============================================================
# Authentication Logs
# ============================================================

def get_auth_logs():

    return [

        create_log_entry(

            "authentication",

            log

        )

        for log in CACHE["auth_logs"]

    ]


# ============================================================
# Failed Login Attempts
# ============================================================

def get_failed_logins():

    keywords = [

        "failed password",

        "authentication failure",

        "invalid user",

        "failed",

        "failure"

    ]

    failed = []

    for line in CACHE["auth_logs"]:

        lower = line.lower()

        if any(

            keyword in lower

            for keyword in keywords

        ):

            failed.append(

                create_log_entry(

                    "failed_login",

                    line

                )

            )

    return failed


# ============================================================
# Successful Login Attempts
# ============================================================

def get_successful_logins():

    keywords = [

        "accepted password",

        "accepted publickey",

        "session opened",

        "login successful"

    ]

    successful = []

    for line in CACHE["auth_logs"]:

        lower = line.lower()

        if any(

            keyword in lower

            for keyword in keywords

        ):

            successful.append(

                create_log_entry(

                    "successful_login",

                    line

                )

            )

    return successful


# ============================================================
# SSH Events
# ============================================================

def get_ssh_logs():

    keywords = [

        "sshd",

        "ssh",

        "accepted",

        "connection closed",

        "disconnect"

    ]

    ssh_logs = []

    for line in CACHE["auth_logs"]:

        lower = line.lower()

        if any(

            keyword in lower

            for keyword in keywords

        ):

            ssh_logs.append(

                create_log_entry(

                    "ssh",

                    line

                )

            )

    return ssh_logs


# ============================================================
# Sudo Activity
# ============================================================

def get_sudo_logs():

    sudo_logs = []

    for line in CACHE["auth_logs"]:

        if "sudo" in line.lower():

            sudo_logs.append(

                create_log_entry(

                    "sudo",

                    line

                )

            )

    return sudo_logs


# ============================================================
# Permission Denied Events
# ============================================================

def get_permission_denied_logs():

    keywords = [

        "permission denied",

        "access denied",

        "operation not permitted"

    ]

    denied = []

    for line in CACHE["auth_logs"]:

        lower = line.lower()

        if any(

            keyword in lower

            for keyword in keywords

        ):

            denied.append(

                create_log_entry(

                    "permission_denied",

                    line

                )

            )

    return denied


# ============================================================
# Privilege Escalation Events
# ============================================================

def get_privilege_escalation_logs():

    keywords = [

        "sudo",

        "su:",

        "session opened",

        "session closed",

        "root"

    ]

    events = []

    for line in CACHE["auth_logs"]:

        lower = line.lower()

        if any(

            keyword in lower

            for keyword in keywords

        ):

            events.append(

                create_log_entry(

                    "privilege_escalation",

                    line

                )

            )

    return events


# ============================================================
# Authentication Failures
# ============================================================

def get_authentication_failures():

    keywords = [

        "authentication failure",

        "failed password",

        "invalid user"

    ]

    failures = []

    for line in CACHE["auth_logs"]:

        lower = line.lower()

        if any(

            keyword in lower

            for keyword in keywords

        ):

            failures.append(

                create_log_entry(

                    "authentication_failure",

                    line

                )

            )

    return failures


# ============================================================
# Security Events
# ============================================================

def get_security_events():

    keywords = [

        "sudo",

        "failed password",

        "authentication failure",

        "invalid user",

        "permission denied",

        "pam_unix",

        "session opened",

        "session closed"

    ]

    security = []

    for line in CACHE["auth_logs"]:

        lower = line.lower()

        if any(

            keyword in lower

            for keyword in keywords

        ):

            security.append(

                create_log_entry(

                    "security",

                    line

                )

            )

    return security


# ============================================================
# Authentication Statistics
# ============================================================

def get_authentication_statistics():

    return {

        "authentication_logs":

            len(

                CACHE["auth_logs"]

            ),

        "failed_logins":

            len(

                get_failed_logins()

            ),

        "successful_logins":

            len(

                get_successful_logins()

            ),

        "ssh_events":

            len(

                get_ssh_logs()

            ),

        "sudo_events":

            len(

                get_sudo_logs()

            ),

        "permission_denied":

            len(

                get_permission_denied_logs()

            ),

        "privilege_escalation":

            len(

                get_privilege_escalation_logs()

            ),

        "authentication_failures":

            len(

                get_authentication_failures()

            ),

        "security_events":

            len(

                get_security_events()

            )

    }



# ============================================================
# Journal Filters
# ============================================================

"""
Every function in this section filters

CACHE["system_journal"]

No Linux commands are executed here.
"""


# ============================================================
# System Journal
# ============================================================

def get_system_journal():

    return [

        create_log_entry(

            "system_journal",

            log

        )

        for log in CACHE["system_journal"]

    ]


# ============================================================
# Boot Events
# ============================================================

def get_boot_events():

    keywords = [

        "boot",

        "startup",

        "started",

        "reached target",

        "booting"

    ]

    events = []

    for line in CACHE["system_journal"]:

        lower = line.lower()

        if any(

            keyword in lower

            for keyword in keywords

        ):

            events.append(

                create_log_entry(

                    "boot",

                    line

                )

            )

    return events


# ============================================================
# Shutdown Events
# ============================================================

def get_shutdown_events():

    keywords = [

        "shutdown",

        "poweroff",

        "halt",

        "stopped",

        "powering off"

    ]

    events = []

    for line in CACHE["system_journal"]:

        lower = line.lower()

        if any(

            keyword in lower

            for keyword in keywords

        ):

            events.append(

                create_log_entry(

                    "shutdown",

                    line

                )

            )

    return events


# ============================================================
# Restart Events
# ============================================================

def get_restart_events():

    keywords = [

        "restart",

        "restarted",

        "restarting"

    ]

    events = []

    for line in CACHE["system_journal"]:

        lower = line.lower()

        if any(

            keyword in lower

            for keyword in keywords

        ):

            events.append(

                create_log_entry(

                    "restart",

                    line

                )

            )

    return events


# ============================================================
# Network Events
# ============================================================

def get_network_events():

    keywords = [

        "network",

        "ethernet",

        "link",

        "dhcp",

        "interface",

        "route",

        "carrier"

    ]

    events = []

    for line in CACHE["system_journal"]:

        lower = line.lower()

        if any(

            keyword in lower

            for keyword in keywords

        ):

            events.append(

                create_log_entry(

                    "network",

                    line

                )

            )

    return events


# ============================================================
# DNS Events
# ============================================================

def get_dns_events():

    keywords = [

        "dns",

        "resolved",

        "resolver",

        "lookup",

        "nameserver"

    ]

    events = []

    for line in CACHE["system_journal"]:

        lower = line.lower()

        if any(

            keyword in lower

            for keyword in keywords

        ):

            events.append(

                create_log_entry(

                    "dns",

                    line

                )

            )

    return events


# ============================================================
# Firewall Events
# ============================================================

def get_firewall_events():

    keywords = [

        "ufw",

        "iptables",

        "firewalld",

        "nft",

        "firewall"

    ]

    events = []

    for line in CACHE["system_journal"]:

        lower = line.lower()

        if any(

            keyword in lower

            for keyword in keywords

        ):

            events.append(

                create_log_entry(

                    "firewall",

                    line

                )

            )

    return events


# ============================================================
# Application Events
# ============================================================

def get_application_events():

    keywords = [

        ".service",

        "application",

        "daemon",

        "server",

        "process"

    ]

    events = []

    for line in CACHE["system_journal"]:

        lower = line.lower()

        if any(

            keyword in lower

            for keyword in keywords

        ):

            events.append(

                create_log_entry(

                    "application",

                    line

                )

            )

    return events


# ============================================================
# Warning Events
# ============================================================

def get_warning_events():

    keywords = [

        "warning",

        "warn"

    ]

    warnings = []

    for line in CACHE["system_journal"]:

        lower = line.lower()

        if any(

            keyword in lower

            for keyword in keywords

        ):

            warnings.append(

                create_log_entry(

                    "warning",

                    line

                )

            )

    return warnings


# ============================================================
# Error Events
# ============================================================

def get_error_events():

    keywords = [

        "error",

        "failed",

        "failure",

        "critical",

        "fatal"

    ]

    errors = []

    for line in CACHE["system_journal"]:

        lower = line.lower()

        if any(

            keyword in lower

            for keyword in keywords

        ):

            errors.append(

                create_log_entry(

                    "error",

                    line

                )

            )

    return errors


# ============================================================
# Journal Statistics
# ============================================================

def get_journal_statistics():

    return {

        "journal_logs":

            len(

                CACHE["system_journal"]

            ),

        "boot_events":

            len(

                get_boot_events()

            ),

        "shutdown_events":

            len(

                get_shutdown_events()

            ),

        "restart_events":

            len(

                get_restart_events()

            ),

        "network_events":

            len(

                get_network_events()

            ),

        "dns_events":

            len(

                get_dns_events()

            ),

        "firewall_events":

            len(

                get_firewall_events()

            ),

        "application_events":

            len(

                get_application_events()

            ),

        "warnings":

            len(

                get_warning_events()

            ),

        "errors":

            len(

                get_error_events()

            )

    }


    # ============================================================
# Service Filters
# ============================================================

"""
Every function in this section filters

CACHE["running_services"]

CACHE["failed_services"]

No Linux commands are executed here.
"""


# ============================================================
# Running Services
# ============================================================

def get_running_services():

    services = []

    for line in CACHE["running_services"]:

        if ".service" not in line:

            continue

        services.append(

            create_log_entry(

                "running_service",

                line

            )

        )

    return services


# ============================================================
# Failed Services
# ============================================================

def get_failed_services():

    services = []

    for line in CACHE["failed_services"]:

        if ".service" not in line:

            continue

        services.append(

            create_log_entry(

                "failed_service",

                line

            )

        )

    return services


# ============================================================
# Started Services
# ============================================================

def get_started_services():

    services = []

    for line in CACHE["system_journal"]:

        lower = line.lower()

        if "started" in lower and ".service" in lower:

            services.append(

                create_log_entry(

                    "service_started",

                    line

                )

            )

    return services


# ============================================================
# Stopped Services
# ============================================================

def get_stopped_services():

    services = []

    for line in CACHE["system_journal"]:

        lower = line.lower()

        if "stopped" in lower and ".service" in lower:

            services.append(

                create_log_entry(

                    "service_stopped",

                    line

                )

            )

    return services


# ============================================================
# Restarted Services
# ============================================================

def get_restarted_services():

    services = []

    keywords = [

        "restart",

        "restarted",

        "restarting"

    ]

    for line in CACHE["system_journal"]:

        lower = line.lower()

        if ".service" not in lower:

            continue

        if any(

            keyword in lower

            for keyword in keywords

        ):

            services.append(

                create_log_entry(

                    "service_restarted",

                    line

                )

            )

    return services


# ============================================================
# Reloaded Services
# ============================================================

def get_reloaded_services():

    services = []

    for line in CACHE["system_journal"]:

        lower = line.lower()

        if "reloaded" in lower and ".service" in lower:

            services.append(

                create_log_entry(

                    "service_reloaded",

                    line

                )

            )

    return services


# ============================================================
# Service Failures
# ============================================================

def get_service_failures():

    failures = []

    keywords = [

        "failed",

        "failure",

        "crashed",

        "core dumped"

    ]

    for line in CACHE["system_journal"]:

        lower = line.lower()

        if ".service" not in lower:

            continue

        if any(

            keyword in lower

            for keyword in keywords

        ):

            failures.append(

                create_log_entry(

                    "service_failure",

                    line

                )

            )

    return failures


# ============================================================
# Service Status Changes
# ============================================================

def get_service_status_changes():

    changes = []

    keywords = [

        "started",

        "stopped",

        "restart",

        "reloaded",

        "failed"

    ]

    for line in CACHE["system_journal"]:

        lower = line.lower()

        if ".service" not in lower:

            continue

        if any(

            keyword in lower

            for keyword in keywords

        ):

            changes.append(

                create_log_entry(

                    "service_status",

                    line

                )

            )

    return changes


# ============================================================
# Service Statistics
# ============================================================

def get_service_statistics():

    return {

        "running_services":

            len(

                get_running_services()

            ),

        "failed_services":

            len(

                get_failed_services()

            ),

        "started_services":

            len(

                get_started_services()

            ),

        "stopped_services":

            len(

                get_stopped_services()

            ),

        "restarted_services":

            len(

                get_restarted_services()

            ),

        "reloaded_services":

            len(

                get_reloaded_services()

            ),

        "service_failures":

            len(

                get_service_failures()

            ),

        "status_changes":

            len(

                get_service_status_changes()

            )

    }


# ============================================================
# Find Service
# ============================================================

"""
Returns information about a specific service.

Example

find_service("ssh")

find_service("docker")

find_service("nginx")
"""


def find_service(service_name):

    service_name = service_name.lower()

    matches = []

    for line in CACHE["running_services"]:

        if service_name in line.lower():

            matches.append(

                create_log_entry(

                    "service",

                    line

                )

            )

    for line in CACHE["failed_services"]:

        if service_name in line.lower():

            matches.append(

                create_log_entry(

                    "failed_service",

                    line

                )

            )

    return matches




# ============================================================
# User & Session Filters
# ============================================================

"""
This section filters

CACHE["login_history"]
CACHE["logged_users"]
CACHE["system_journal"]

No Linux commands are executed.
"""


# ============================================================
# Login History
# ============================================================

def get_login_history():

    history = []

    for line in CACHE["login_history"]:

        if line.startswith("wtmp"):

            continue

        history.append(

            create_log_entry(

                "login_history",

                line

            )

        )

    return history


# ============================================================
# Logged-in Users
# ============================================================

def get_logged_users():

    users = []

    for line in CACHE["logged_users"]:

        users.append(

            create_log_entry(

                "logged_user",

                line

            )

        )

    return users


# ============================================================
# Login Events
# ============================================================

def get_login_events():

    keywords = [

        "session opened",

        "accepted password",

        "accepted publickey",

        "login"

    ]

    events = []

    for line in CACHE["auth_logs"]:

        lower = line.lower()

        if any(

            keyword in lower

            for keyword in keywords

        ):

            events.append(

                create_log_entry(

                    "login_event",

                    line

                )

            )

    return events


# ============================================================
# Logout Events
# ============================================================

def get_logout_events():

    keywords = [

        "session closed",

        "logged out",

        "logout"

    ]

    events = []

    for line in CACHE["auth_logs"]:

        lower = line.lower()

        if any(

            keyword in lower

            for keyword in keywords

        ):

            events.append(

                create_log_entry(

                    "logout_event",

                    line

                )

            )

    return events


# ============================================================
# Root Login Events
# ============================================================

def get_root_login_events():

    events = []

    for line in CACHE["auth_logs"]:

        lower = line.lower()

        if "root" in lower:

            events.append(

                create_log_entry(

                    "root_login",

                    line

                )

            )

    return events


# ============================================================
# Remote Login Events
# ============================================================

def get_remote_login_events():

    keywords = [

        "sshd",

        "accepted",

        "publickey",

        "password"

    ]

    events = []

    for line in CACHE["auth_logs"]:

        lower = line.lower()

        if any(

            keyword in lower

            for keyword in keywords

        ):

            events.append(

                create_log_entry(

                    "remote_login",

                    line

                )

            )

    return events


# ============================================================
# Cron Events
# ============================================================

def get_cron_events():

    events = []

    keywords = [

        "cron",

        "crond",

        "cronie"

    ]

    for line in CACHE["system_journal"]:

        lower = line.lower()

        if any(

            keyword in lower

            for keyword in keywords

        ):

            events.append(

                create_log_entry(

                    "cron",

                    line

                )

            )

    return events


# ============================================================
# User Session Summary
# ============================================================

def get_user_sessions():

    sessions = []

    for line in CACHE["logged_users"]:

        columns = line.split()

        session = {

            "user":

                columns[0] if len(columns) > 0 else "",

            "terminal":

                columns[1] if len(columns) > 1 else "",

            "login_time":

                " ".join(columns[2:4])

                if len(columns) > 3 else "",

            "raw":

                line

        }

        sessions.append(session)

    return sessions


# ============================================================
# User Statistics
# ============================================================

def get_user_statistics():

    return {

        "login_history":

            len(

                get_login_history()

            ),

        "logged_users":

            len(

                get_logged_users()

            ),

        "login_events":

            len(

                get_login_events()

            ),

        "logout_events":

            len(

                get_logout_events()

            ),

        "root_logins":

            len(

                get_root_login_events()

            ),

        "remote_logins":

            len(

                get_remote_login_events()

            ),

        "cron_events":

            len(

                get_cron_events()

            )

    }


# ============================================================
# Find User
# ============================================================

"""
Example

find_user("ubuntu")

find_user("root")
"""


def find_user(username):

    username = username.lower()

    results = []

    for line in CACHE["login_history"]:

        if username in line.lower():

            results.append(

                create_log_entry(

                    "login_history",

                    line

                )

            )

    for line in CACHE["logged_users"]:

        if username in line.lower():

            results.append(

                create_log_entry(

                    "logged_user",

                    line

                )

            )

    return results



# ============================================================
# Log File Statistics
# ============================================================

"""
Collect information about monitored Linux log files.

No Linux commands are executed.
"""


# ============================================================
# Get Log File Statistics
# ============================================================

def get_log_file_statistics():

    statistics = []

    for name, path in COMMON_LOG_FILES.items():

        exists = Path(path).exists()

        if exists:

            size = os.path.getsize(path)

        else:

            size = 0

        statistics.append({

            "name": name,

            "path": path,

            "exists": exists,

            "size_bytes": size,

            "size_mb": bytes_to_mb(size),

            "last_modified":

                get_last_modified(path),

            "readable":

                os.access(path, os.R_OK)

                if exists else False

        })

    return statistics


# ============================================================
# Existing Log Files
# ============================================================

def get_existing_log_files():

    files = []

    for log in get_log_file_statistics():

        if log["exists"]:

            files.append(log)

    return files


# ============================================================
# Missing Log Files
# ============================================================

def get_missing_log_files():

    files = []

    for log in get_log_file_statistics():

        if not log["exists"]:

            files.append(log)

    return files


# ============================================================
# Large Log Files
# ============================================================

def get_large_log_files(

        minimum_size_mb=100

):

    files = []

    for log in get_log_file_statistics():

        if log["size_mb"] >= minimum_size_mb:

            files.append(log)

    return files


# ============================================================
# Empty Log Files
# ============================================================

def get_empty_log_files():

    files = []

    for log in get_log_file_statistics():

        if log["exists"] and log["size_bytes"] == 0:

            files.append(log)

    return files


# ============================================================
# Recently Modified Log Files
# ============================================================

def get_recent_log_files(

        hours=24

):

    files = []

    now = time.time()

    for log in get_log_file_statistics():

        if not log["exists"]:

            continue

        modified = os.path.getmtime(

            log["path"]

        )

        elapsed = (

            now -

            modified

        ) / 3600

        if elapsed <= hours:

            files.append(log)

    return files


# ============================================================
# Largest Log File
# ============================================================

def get_largest_log_file():

    files = get_existing_log_files()

    if not files:

        return None

    return max(

        files,

        key=lambda x: x["size_bytes"]

    )


# ============================================================
# Total Log Directory Size
# ============================================================

def get_total_log_size():

    total = 0

    for log in get_existing_log_files():

        total += log["size_bytes"]

    return {

        "total_size_bytes":

            total,

        "total_size_mb":

            bytes_to_mb(total)

    }


# ============================================================
# Log File Statistics Summary
# ============================================================

def get_log_statistics():

    return {

        "configured_logs":

            len(COMMON_LOG_FILES),

        "existing_logs":

            len(

                get_existing_log_files()

            ),

        "missing_logs":

            len(

                get_missing_log_files()

            ),

        "large_logs":

            len(

                get_large_log_files()

            ),

        "empty_logs":

            len(

                get_empty_log_files()

            ),

        "recent_logs":

            len(

                get_recent_log_files()

            ),

        "total_log_size":

            get_total_log_size()

    }


# ============================================================
# Find Log File
# ============================================================

"""
Example

find_log_file("syslog")

find_log_file("auth")

find_log_file("kern")
"""


def find_log_file(name):

    name = name.lower()

    for log in get_log_file_statistics():

        if log["name"].lower() == name:

            return log

    return None



    # ============================================================
# Build Complete Snapshot
# ============================================================

"""
Build a complete Linux log snapshot.

IMPORTANT

refresh_cache()

must be called BEFORE this function.
"""


def get_logs_snapshot():

    snapshot = {

        # ====================================================
        # Snapshot Information
        # ====================================================

        "timestamp":

            CACHE["timestamp"],

        "hostname":

            CACHE["hostname"],

        # ====================================================
        # Kernel
        # ====================================================

        "kernel": {

            "logs":

                get_kernel_logs(),

            "errors":

                get_kernel_errors(),

            "oom":

                get_oom_logs(),

            "filesystem":

                get_filesystem_errors(),

            "disk":

                get_disk_errors(),

            "hardware":

                get_hardware_errors(),

            "storage":

                get_storage_warnings(),

            "statistics":

                get_kernel_statistics()

        },

        # ====================================================
        # Authentication
        # ====================================================

        "authentication": {

            "logs":

                get_auth_logs(),

            "failed_logins":

                get_failed_logins(),

            "successful_logins":

                get_successful_logins(),

            "ssh":

                get_ssh_logs(),

            "sudo":

                get_sudo_logs(),

            "permission_denied":

                get_permission_denied_logs(),

            "privilege_escalation":

                get_privilege_escalation_logs(),

            "authentication_failures":

                get_authentication_failures(),

            "security_events":

                get_security_events(),

            "statistics":

                get_authentication_statistics()

        },

        # ====================================================
        # System Journal
        # ====================================================

        "journal": {

            "logs":

                get_system_journal(),

            "boot":

                get_boot_events(),

            "shutdown":

                get_shutdown_events(),

            "restart":

                get_restart_events(),

            "network":

                get_network_events(),

            "dns":

                get_dns_events(),

            "firewall":

                get_firewall_events(),

            "applications":

                get_application_events(),

            "warnings":

                get_warning_events(),

            "errors":

                get_error_events(),

            "statistics":

                get_journal_statistics()

        },

        # ====================================================
        # Services
        # ====================================================

        "services": {

            "running":

                get_running_services(),

            "failed":

                get_failed_services(),

            "started":

                get_started_services(),

            "stopped":

                get_stopped_services(),

            "restarted":

                get_restarted_services(),

            "reloaded":

                get_reloaded_services(),

            "failures":

                get_service_failures(),

            "changes":

                get_service_status_changes(),

            "statistics":

                get_service_statistics()

        },

        # ====================================================
        # Users
        # ====================================================

        "users": {

            "login_history":

                get_login_history(),

            "logged_users":

                get_logged_users(),

            "login_events":

                get_login_events(),

            "logout_events":

                get_logout_events(),

            "root_logins":

                get_root_login_events(),

            "remote_logins":

                get_remote_login_events(),

            "cron":

                get_cron_events(),

            "sessions":

                get_user_sessions(),

            "statistics":

                get_user_statistics()

        },

        # ====================================================
        # Log Files
        # ====================================================

        "log_files": {

            "files":

                get_log_file_statistics(),

            "existing":

                get_existing_log_files(),

            "missing":

                get_missing_log_files(),

            "large":

                get_large_log_files(),

            "empty":

                get_empty_log_files(),

            "recent":

                get_recent_log_files(),

            "largest":

                get_largest_log_file(),

            "directory":

                get_log_statistics()

        }

    }

    return snapshot


# ============================================================
# Snapshot Summary
# ============================================================

"""
Returns only important counts.

Useful for dashboards.
"""


def get_snapshot_summary():

    return {

        "timestamp":

            CACHE["timestamp"],

        "hostname":

            CACHE["hostname"],

        "kernel_errors":

            len(

                get_kernel_errors()

            ),

        "oom_events":

            len(

                get_oom_logs()

            ),

        "failed_logins":

            len(

                get_failed_logins()

            ),

        "security_events":

            len(

                get_security_events()

            ),

        "failed_services":

            len(

                get_failed_services()

            ),

        "logged_users":

            len(

                get_logged_users()

            ),

        "journal_errors":

            len(

                get_error_events()

            ),

        "large_log_files":

            len(

                get_large_log_files()

            )

    }


# ============================================================
# Export Snapshot
# ============================================================

def export_snapshot_json(

        filename="logs_snapshot.json"

):

    snapshot = get_logs_snapshot()

    with open(

        filename,

        "w",

        encoding="utf-8"

    ) as file:

        json.dump(

            snapshot,

            file,

            indent=4

        )

    logger.info(

        f"Snapshot exported to {filename}"

    )



    # ============================================================
# Continuous Monitoring
# ============================================================

"""
Continuously monitor Linux logs.

Workflow

refresh_cache()

↓

get_logs_snapshot()

↓

Export / Process Snapshot

↓

Sleep

↓

Repeat
"""


def monitor_logs_continuously(interval=5):

    logger.info(

        f"Starting Linux Log Monitor "

        f"(interval={interval}s)"

    )

    while True:

        try:

            refresh_cache()

            snapshot = get_logs_snapshot()

            logger.info(

                json.dumps(

                    get_snapshot_summary(),

                    indent=4

                )

            )

            time.sleep(interval)

        except KeyboardInterrupt:

            logger.info(

                "Linux Log Monitor stopped."

            )

            break

        except Exception as e:

            logger.exception(

                f"Monitoring failed: {e}"

            )

            time.sleep(interval)


# ============================================================
# Print Snapshot
# ============================================================

def print_snapshot():

    refresh_cache()

    snapshot = get_logs_snapshot()

    print(

        json.dumps(

            snapshot,

            indent=4

        )

    )


# ============================================================
# Print Summary
# ============================================================

def print_summary():

    refresh_cache()

    summary = get_snapshot_summary()

    print(

        json.dumps(

            summary,

            indent=4

        )

    )


# ============================================================
# Save Snapshot
# ============================================================

def save_snapshot(

        filename="logs_snapshot.json"

):

    refresh_cache()

    export_snapshot_json(

        filename

    )

    logger.info(

        f"Snapshot saved "

        f"to {filename}"

    )


# ============================================================
# Health Check
# ============================================================

def health_check():

    try:

        refresh_cache()

        return {

            "healthy": True,

            "timestamp":

                CACHE["timestamp"],

            "hostname":

                CACHE["hostname"],

            "journal_logs":

                len(

                    CACHE["system_journal"]

                ),

            "kernel_logs":

                len(

                    CACHE["kernel_logs"]

                ),

            "auth_logs":

                len(

                    CACHE["auth_logs"]

                ),

            "running_services":

                len(

                    CACHE["running_services"]

                )

        }

    except Exception as e:

        logger.exception(

            f"Health check failed: {e}"

        )

        return {

            "healthy": False,

            "error": str(e)

        }


# ============================================================
# Module Information
# ============================================================

def module_information():

    return {

        "module":

            "Linux Log Collector",

        "version":

            "2.0",

        "architecture":

            "Cached",

        "collector":

            "Kernel Aware Self-Healing Platform",

        "primary_sources": [

            "journalctl",

            "journalctl -k",

            "auth.log",

            "syslog",

            "systemctl",

            "last",

            "who"

        ]

    }


# ============================================================
# Main
# ============================================================

if __name__ == "__main__":

    logger.info(

        "===================================="

    )

    logger.info(

        "Linux Log Collector Started"

    )

    logger.info(

        "===================================="

    )

    info = module_information()

    print(

        json.dumps(

            info,

            indent=4

        )

    )

    health = health_check()

    print(

        json.dumps(

            health,

            indent=4

        )

    )

    if health["healthy"]:

        print("\nHealth Check : PASSED\n")

    else:

        print("\nHealth Check : FAILED\n")

    refresh_cache()

    snapshot = get_logs_snapshot()

    print(

        json.dumps(

            snapshot,

            indent=4

        )

    )

    monitor_logs_continuously(interval=5)