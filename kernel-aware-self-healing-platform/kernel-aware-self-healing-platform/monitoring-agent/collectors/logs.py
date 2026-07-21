import json
import os
import socket
import shutil
import subprocess
import logging
import time

from pathlib import Path
from datetime import datetime


# ============================================================
# Logging Configuration
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

LOG_FILE = BASE_DIR / "log.txt"

logging.basicConfig(
    filename=str(LOG_FILE),
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    force=True
)

logger = logging.getLogger(__name__)

logger.info("Linux Log Collector Started")


# ============================================================
# Configuration
# ============================================================

DEFAULT_LOG_LINES = 100

COMMAND_TIMEOUT = 10


# ============================================================
# Host Log Search Paths
# ============================================================

LOG_DIRECTORIES = [

    "/host/var/log",      # Docker mounted host logs

    "/var/log"            # Native Linux

]


# ============================================================
# Linux Log Files
# ============================================================

COMMON_LOG_FILES = {

    "syslog": [

        "syslog",

        "messages"

    ],

    "auth": [

        "auth.log",

        "secure"

    ],

    "kern": [

        "kern.log",

        "messages"

    ],

    "boot": [

        "boot.log"

    ],

    "cron": [

        "cron",

        "cron.log"

    ]

}


# ============================================================
# Environment Detection
# ============================================================

def is_docker():

    return Path("/.dockerenv").exists()


def is_kubernetes():

    return (

        "KUBERNETES_SERVICE_HOST"

        in os.environ

    )


def get_environment():

    if is_kubernetes():

        return "Kubernetes"

    if is_docker():

        return "Docker"

    return "Linux"


# ============================================================
# Command Availability
# ============================================================

def command_exists(command):

    return shutil.which(command) is not None


def has_journalctl():

    return command_exists("journalctl")


def has_systemctl():

    return command_exists("systemctl")


def has_dmesg():

    return command_exists("dmesg")


# ============================================================
# Universal Log Discovery
# ============================================================

def find_log_file(log_type):

    candidates = COMMON_LOG_FILES.get(

        log_type,

        []

    )

    for directory in LOG_DIRECTORIES:

        for filename in candidates:

            path = Path(directory) / filename

            if path.exists():

                return path

    return None


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

            return []

        return [

            line.rstrip()

            for line in result.stdout.splitlines()

            if line.strip()

        ]

    except Exception:

        return []


# ============================================================
# Helper
# Read Log File
# ============================================================

def read_log_file(

        path,

        lines=DEFAULT_LOG_LINES

):

    try:

        if path is None:

            return []

        with open(

                path,

                "r",

                encoding="utf-8",

                errors="ignore"

        ) as file:

            return [

                line.rstrip()

                for line in file.readlines()[-lines:]

            ]

    except Exception:

        return []


# ============================================================
# Universal Log Reader
# ============================================================

def read_logs(log_type):

    path = find_log_file(log_type)

    if path:

        return read_log_file(path)

    if has_journalctl():

        command = [

            "journalctl",

            "--no-pager",

            "-n",

            str(DEFAULT_LOG_LINES)

        ]

        if log_type == "kern":

            command.insert(

                1,

                "-k"

            )

        return run_command(command)

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
# Module Information
# ============================================================

def module_information():

    return {

        "module":

            "Universal Linux Log Collector",

        "version":

            "3.0",

        "environment":

            get_environment(),

        "hostname":

            socket.gethostname(),

        "journalctl":

            has_journalctl(),

        "systemctl":

            has_systemctl(),

        "dmesg":

            has_dmesg(),

        "host_log_directory":

            next(

                (

                    path

                    for path in LOG_DIRECTORIES

                    if Path(path).exists()

                ),

                None

            )

    }


# ============================================================
# Health Check
# ============================================================

def health_check():

    return {

        "healthy": True,

        "environment":

            get_environment(),

        "hostname":

            socket.gethostname(),

        "journalctl":

            has_journalctl(),

        "systemctl":

            has_systemctl(),

        "dmesg":

            has_dmesg()

    }


# ============================================================
# Main
# ============================================================

if __name__ == "__main__":

    print(

        json.dumps(

            module_information(),

            indent=4

        )

    )

    print(

        json.dumps(

            health_check(),

            indent=4

        )

    )


    # ============================================================
# System Journal Logs
# ============================================================

def get_system_journal_logs():

    logger.info(
        "Collecting system journal logs..."
    )

    if has_journalctl():

        return [

            create_log_entry(
                "system_journal",
                line
            )

            for line in run_command(

                [

                    "journalctl",

                    "--no-pager",

                    "-n",

                    str(DEFAULT_LOG_LINES)

                ]

            )

        ]

    logs = []

    logs.extend(

        [

            create_log_entry(
                "system_journal",
                line
            )

            for line in read_logs("syslog")

        ]

    )

    return logs


# ============================================================
# Kernel Logs
# ============================================================

def get_kernel_logs():

    logger.info(
        "Collecting kernel logs..."
    )

    if has_dmesg():

        logs = run_command(

            [

                "dmesg",

                "--ctime"

            ]

        )

        if logs:

            return [

                create_log_entry(
                    "kernel",
                    line
                )

                for line in logs[-DEFAULT_LOG_LINES:]

            ]

    if has_journalctl():

        logs = run_command(

            [

                "journalctl",

                "-k",

                "--no-pager",

                "-n",

                str(DEFAULT_LOG_LINES)

            ]

        )

        if logs:

            return [

                create_log_entry(
                    "kernel",
                    line
                )

                for line in logs

            ]

    return [

        create_log_entry(
            "kernel",
            line
        )

        for line in read_logs("kern")

    ]


# ============================================================
# Boot Logs
# ============================================================

def get_boot_logs():

    logger.info(
        "Collecting boot logs..."
    )

    boot_logs = []

    for entry in get_system_journal_logs():

        message = entry["message"].lower()

        if any(

                keyword in message

                for keyword in [

                    "boot",

                    "startup",

                    "started",

                    "booting",

                    "reached target"

                ]

        ):

            boot_logs.append(entry)

    return boot_logs


# ============================================================
# OOM Killer Logs
# ============================================================

def get_oom_killer_logs():

    logger.info(
        "Collecting OOM killer logs..."
    )

    keywords = [

        "oom",

        "out of memory",

        "oom-killer",

        "killed process"

    ]

    logs = []

    for entry in get_kernel_logs():

        message = entry["message"].lower()

        if any(

                keyword in message

                for keyword in keywords

        ):

            logs.append(entry)

    return logs


# ============================================================
# Filesystem Error Logs
# ============================================================

def get_filesystem_error_logs():

    logger.info(
        "Collecting filesystem errors..."
    )

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

    logs = []

    for entry in get_kernel_logs():

        message = entry["message"].lower()

        if any(

                keyword in message

                for keyword in keywords

        ):

            logs.append(entry)

    return logs


# ============================================================
# Hardware Error Logs
# ============================================================

def get_hardware_error_logs():

    logger.info(
        "Collecting hardware errors..."
    )

    keywords = [

        "hardware",

        "machine check",

        "mce",

        "firmware",

        "pci",

        "thermal",

        "cpu",

        "memory",

        "nvme",

        "smart",

        "i/o error",

        "read error",

        "write error"

    ]

    logs = []

    for entry in get_kernel_logs():

        message = entry["message"].lower()

        if any(

                keyword in message

                for keyword in keywords

        ):

            logs.append(entry)

    return logs


# ============================================================
# Network Error Logs
# ============================================================

def get_network_error_logs():

    logger.info(
        "Collecting network errors..."
    )

    keywords = [

        "network",

        "ethernet",

        "link is down",

        "link is up",

        "dhcp",

        "carrier",

        "dns",

        "route",

        "interface",

        "connection lost"

    ]

    logs = []

    for entry in get_system_journal_logs():

        message = entry["message"].lower()

        if any(

                keyword in message

                for keyword in keywords

        ):

            logs.append(entry)

    return logs


# ============================================================
# Kernel Statistics
# ============================================================

def get_kernel_statistics():

    return {

        "kernel_logs":

            len(
                get_kernel_logs()
            ),

        "boot_logs":

            len(
                get_boot_logs()
            ),

        "oom_events":

            len(
                get_oom_killer_logs()
            ),

        "filesystem_errors":

            len(
                get_filesystem_error_logs()
            ),

        "hardware_errors":

            len(
                get_hardware_error_logs()
            ),

        "network_errors":

            len(
                get_network_error_logs()
            )

    }

# ============================================================
# Authentication Logs
# ============================================================

def get_auth_logs():

    logger.info(
        "Collecting authentication logs..."
    )

    return [

        create_log_entry(
            "authentication",
            line
        )

        for line in read_logs("auth")

    ]


# ============================================================
# SSH Logs
# ============================================================

def get_ssh_logs():

    logger.info(
        "Collecting SSH logs..."
    )

    keywords = [

        "sshd",

        "ssh",

        "accepted",

        "publickey",

        "connection closed",

        "disconnect"

    ]

    logs = []

    for entry in get_auth_logs():

        message = entry["message"].lower()

        if any(

                keyword in message

                for keyword in keywords

        ):

            logs.append(entry)

    return logs


# ============================================================
# Failed Login Attempts
# ============================================================

def get_failed_logins():

    keywords = [

        "failed password",

        "authentication failure",

        "invalid user",

        "failed"

    ]

    logs = []

    for entry in get_auth_logs():

        message = entry["message"].lower()

        if any(

                keyword in message

                for keyword in keywords

        ):

            logs.append(entry)

    return logs


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

    logs = []

    for entry in get_auth_logs():

        message = entry["message"].lower()

        if any(

                keyword in message

                for keyword in keywords

        ):

            logs.append(entry)

    return logs


# ============================================================
# Sudo Activity
# ============================================================

def get_sudo_logs():

    logs = []

    for entry in get_auth_logs():

        if "sudo" in entry["message"].lower():

            logs.append(entry)

    return logs


# ============================================================
# Permission Denied Events
# ============================================================

def get_permission_denied_logs():

    keywords = [

        "permission denied",

        "access denied",

        "operation not permitted"

    ]

    logs = []

    for entry in get_auth_logs():

        message = entry["message"].lower()

        if any(

                keyword in message

                for keyword in keywords

        ):

            logs.append(entry)

    return logs


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

    logs = []

    for entry in get_auth_logs():

        message = entry["message"].lower()

        if any(

                keyword in message

                for keyword in keywords

        ):

            logs.append(entry)

    return logs


# ============================================================
# Authentication Failures
# ============================================================

def get_authentication_failures():

    keywords = [

        "authentication failure",

        "failed password",

        "invalid user"

    ]

    logs = []

    for entry in get_auth_logs():

        message = entry["message"].lower()

        if any(

                keyword in message

                for keyword in keywords

        ):

            logs.append(entry)

    return logs


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

    logs = []

    for entry in get_auth_logs():

        message = entry["message"].lower()

        if any(

                keyword in message

                for keyword in keywords

        ):

            logs.append(entry)

    return logs


# ============================================================
# Logout Events
# ============================================================

def get_logout_events():

    keywords = [

        "session closed",

        "logout",

        "logged out"

    ]

    logs = []

    for entry in get_auth_logs():

        message = entry["message"].lower()

        if any(

                keyword in message

                for keyword in keywords

        ):

            logs.append(entry)

    return logs


# ============================================================
# Root Login Events
# ============================================================

def get_root_login_events():

    logs = []

    for entry in get_auth_logs():

        if "root" in entry["message"].lower():

            logs.append(entry)

    return logs


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

    logs = []

    for entry in get_auth_logs():

        message = entry["message"].lower()

        if any(

                keyword in message

                for keyword in keywords

        ):

            logs.append(entry)

    return logs


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

        "session closed",

        "root"

    ]

    logs = []

    for entry in get_auth_logs():

        message = entry["message"].lower()

        if any(

                keyword in message

                for keyword in keywords

        ):

            logs.append(entry)

    return logs


# ============================================================
# Authentication Statistics
# ============================================================

def get_authentication_statistics():

    return {

        "authentication_logs":

            len(
                get_auth_logs()
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
# Service Logs
# ============================================================

def get_service_logs():

    logger.info(
        "Collecting service logs..."
    )

    logs = []

    if has_journalctl():

        logs = run_command(

            [

                "journalctl",

                "--no-pager",

                "-u",

                "*",

                "-n",

                str(DEFAULT_LOG_LINES)

            ]

        )

    else:

        logs = read_logs("syslog")

    return [

        create_log_entry(

            "service",

            line

        )

        for line in logs

    ]


# ============================================================
# Failed Services
# ============================================================

def get_failed_services():

    logger.info(
        "Collecting failed services..."
    )

    if not has_systemctl():

        return []

    logs = run_command(

        [

            "systemctl",

            "--failed",

            "--no-pager",

            "--plain"

        ]

    )

    return [

        create_log_entry(

            "failed_service",

            line

        )

        for line in logs

        if ".service" in line

    ]


# ============================================================
# Running Services
# ============================================================

def get_running_services():

    logger.info(
        "Collecting running services..."
    )

    if not has_systemctl():

        return []

    logs = run_command(

        [

            "systemctl",

            "list-units",

            "--type=service",

            "--state=running",

            "--no-pager",

            "--plain"

        ]

    )

    return [

        create_log_entry(

            "running_service",

            line

        )

        for line in logs

        if ".service" in line

    ]


# ============================================================
# Service Restart Events
# ============================================================

def get_service_restart_events():

    logger.info(
        "Collecting service restart events..."
    )

    keywords = [

        "restart",

        "restarted",

        "restarting"

    ]

    events = []

    for entry in get_service_logs():

        message = entry["message"].lower()

        if ".service" not in message:

            continue

        if any(

            keyword in message

            for keyword in keywords

        ):

            events.append(entry)

    return events


# ============================================================
# Started Services
# ============================================================

def get_started_services():

    events = []

    for entry in get_service_logs():

        message = entry["message"].lower()

        if (

            ".service" in message

            and

            "started" in message

        ):

            events.append(entry)

    return events


# ============================================================
# Stopped Services
# ============================================================

def get_stopped_services():

    events = []

    for entry in get_service_logs():

        message = entry["message"].lower()

        if (

            ".service" in message

            and

            "stopped" in message

        ):

            events.append(entry)

    return events


# ============================================================
# Reloaded Services
# ============================================================

def get_reloaded_services():

    events = []

    for entry in get_service_logs():

        message = entry["message"].lower()

        if (

            ".service" in message

            and

            "reloaded" in message

        ):

            events.append(entry)

    return events


# ============================================================
# Service Failures
# ============================================================

def get_service_failures():

    keywords = [

        "failed",

        "failure",

        "crashed",

        "core dumped"

    ]

    failures = []

    for entry in get_service_logs():

        message = entry["message"].lower()

        if ".service" not in message:

            continue

        if any(

            keyword in message

            for keyword in keywords

        ):

            failures.append(entry)

    return failures


# ============================================================
# Service Status Changes
# ============================================================

def get_service_status_changes():

    keywords = [

        "started",

        "stopped",

        "restart",

        "reloaded",

        "failed"

    ]

    changes = []

    for entry in get_service_logs():

        message = entry["message"].lower()

        if ".service" not in message:

            continue

        if any(

            keyword in message

            for keyword in keywords

        ):

            changes.append(entry)

    return changes


# ============================================================
# Find Service
# ============================================================

def find_service(

        service_name

):

    service_name = service_name.lower()

    results = []

    for entry in get_running_services():

        if service_name in entry["message"].lower():

            results.append(entry)

    for entry in get_failed_services():

        if service_name in entry["message"].lower():

            results.append(entry)

    return results


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

                get_service_restart_events()

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
# Login History
# ============================================================

def get_login_history():

    logger.info(
        "Collecting login history..."
    )

    logs = run_command(

        [

            "last",

            "-n",

            str(DEFAULT_LOG_LINES)

        ]

    )

    history = []

    for line in logs:

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
# Logged Users
# ============================================================

def get_logged_users():

    logger.info(
        "Collecting logged users..."
    )

    logs = run_command(

        [

            "who"

        ]

    )

    return [

        create_log_entry(

            "logged_user",

            line

        )

        for line in logs

    ]


# ============================================================
# Login Sessions
# ============================================================

def get_login_sessions():

    sessions = []

    for entry in get_logged_users():

        columns = entry["message"].split()

        sessions.append({

            "user":

                columns[0]

                if len(columns) > 0

                else "",

            "terminal":

                columns[1]

                if len(columns) > 1

                else "",

            "login_time":

                " ".join(

                    columns[2:5]

                )

                if len(columns) > 4

                else "",

            "raw":

                entry["message"]

        })

    return sessions


# ============================================================
# Cron Logs
# ============================================================

def get_cron_logs():

    logger.info(
        "Collecting cron logs..."
    )

    cron_logs = [

        create_log_entry(

            "cron",

            line

        )

        for line in read_logs("cron")

    ]

    if cron_logs:

        return cron_logs

    keywords = [

        "cron",

        "crond",

        "cronie"

    ]

    events = []

    for entry in get_system_journal_logs():

        message = entry["message"].lower()

        if any(

            keyword in message

            for keyword in keywords

        ):

            events.append(entry)

    return events


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

    for entry in get_auth_logs():

        message = entry["message"].lower()

        if any(

            keyword in message

            for keyword in keywords

        ):

            events.append(entry)

    return events


# ============================================================
# Logout Events
# ============================================================

def get_logout_events():

    keywords = [

        "session closed",

        "logout",

        "logged out"

    ]

    events = []

    for entry in get_auth_logs():

        message = entry["message"].lower()

        if any(

            keyword in message

            for keyword in keywords

        ):

            events.append(entry)

    return events


# ============================================================
# Root Login Events
# ============================================================

def get_root_login_events():

    events = []

    for entry in get_auth_logs():

        if "root" in entry["message"].lower():

            events.append(entry)

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

    for entry in get_auth_logs():

        message = entry["message"].lower()

        if any(

            keyword in message

            for keyword in keywords

        ):

            events.append(entry)

    return events


# ============================================================
# Find User
# ============================================================

def find_user(username):

    username = username.lower()

    results = []

    for entry in get_login_history():

        if username in entry["message"].lower():

            results.append(entry)

    for entry in get_logged_users():

        if username in entry["message"].lower():

            results.append(entry)

    return results


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

                get_cron_logs()

            )

    }

# ============================================================
# Log File Statistics
# ============================================================

def get_log_file_statistics():

    logger.info(
        "Collecting log file statistics..."
    )

    statistics = []

    for log_type in COMMON_LOG_FILES:

        path = find_log_file(log_type)

        exists = path is not None

        if exists:

            size = path.stat().st_size

        else:

            size = 0

        statistics.append({

            "name":

                log_type,

            "path":

                str(path)

                if path

                else None,

            "exists":

                exists,

            "size_bytes":

                size,

            "size_mb":

                bytes_to_mb(size),

            "last_modified":

                get_last_modified(path)

                if path

                else None,

            "readable":

                os.access(path, os.R_OK)

                if path

                else False

        })

    return statistics


# ============================================================
# Existing Log Files
# ============================================================

def get_existing_log_files():

    return [

        log

        for log in get_log_file_statistics()

        if log["exists"]

    ]


# ============================================================
# Missing Log Files
# ============================================================

def get_missing_log_files():

    return [

        log

        for log in get_log_file_statistics()

        if not log["exists"]

    ]


# ============================================================
# Empty Log Files
# ============================================================

def get_empty_log_files():

    return [

        log

        for log in get_log_file_statistics()

        if (

            log["exists"]

            and

            log["size_bytes"] == 0

        )

    ]


# ============================================================
# Large Log Files
# ============================================================

def get_large_log_files(

        minimum_size_mb=100

):

    return [

        log

        for log in get_log_file_statistics()

        if log["size_mb"] >= minimum_size_mb

    ]


# ============================================================
# Recently Modified Log Files
# ============================================================

def get_recent_log_files(

        hours=24

):

    now = time.time()

    recent = []

    for log in get_existing_log_files():

        modified = os.path.getmtime(

            log["path"]

        )

        elapsed = (

            now -

            modified

        ) / 3600

        if elapsed <= hours:

            recent.append(log)

    return recent


# ============================================================
# Largest Log File
# ============================================================

def get_largest_log_file():

    files = get_existing_log_files()

    if not files:

        return None

    return max(

        files,

        key=lambda x:

        x["size_bytes"]

    )


# ============================================================
# Total Log Size
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
# Find Log File
# ============================================================

def find_log_statistics(

        log_name

):

    log_name = log_name.lower()

    for log in get_log_file_statistics():

        if log["name"].lower() == log_name:

            return log

    return None


# ============================================================
# Log Statistics Summary
# ============================================================

def get_log_statistics():

    return {

        "configured_logs":

            len(

                COMMON_LOG_FILES

            ),

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

        "largest_log":

            get_largest_log_file(),

        "total_size":

            get_total_log_size()

    }

# ============================================================
# Build Complete Snapshot
# ============================================================

def get_logs_snapshot():

    logger.info(
        "Building complete logs snapshot..."
    )

    snapshot = {

        # ====================================================
        # Snapshot Information
        # ====================================================

        "timestamp":

            datetime.now().isoformat(),

        "hostname":

            socket.gethostname(),

        "environment":

            get_environment(),

        # ====================================================
        # Kernel
        # ====================================================

        "kernel": {

            "journal":

                get_system_journal_logs(),

            "logs":

                get_kernel_logs(),

            "boot":

                get_boot_logs(),

            "oom":

                get_oom_killer_logs(),

            "filesystem":

                get_filesystem_error_logs(),

            "hardware":

                get_hardware_error_logs(),

            "network":

                get_network_error_logs(),

            "statistics":

                get_kernel_statistics()

        },

        # ====================================================
        # Authentication
        # ====================================================

        "authentication": {

            "logs":

                get_auth_logs(),

            "ssh":

                get_ssh_logs(),

            "failed_logins":

                get_failed_logins(),

            "successful_logins":

                get_successful_logins(),

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
        # Services
        # ====================================================

        "services": {

            "logs":

                get_service_logs(),

            "running":

                get_running_services(),

            "failed":

                get_failed_services(),

            "started":

                get_started_services(),

            "stopped":

                get_stopped_services(),

            "restarted":

                get_service_restart_events(),

            "reloaded":

                get_reloaded_services(),

            "failures":

                get_service_failures(),

            "status_changes":

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

            "sessions":

                get_login_sessions(),

            "login_events":

                get_login_events(),

            "logout_events":

                get_logout_events(),

            "root_logins":

                get_root_login_events(),

            "remote_logins":

                get_remote_login_events(),

            "cron":

                get_cron_logs(),

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

            "empty":

                get_empty_log_files(),

            "large":

                get_large_log_files(),

            "recent":

                get_recent_log_files(),

            "largest":

                get_largest_log_file(),

            "statistics":

                get_log_statistics()

        }

    }

    logger.info(
        "Logs snapshot created successfully."
    )

    return snapshot


# ============================================================
# Snapshot Summary
# ============================================================

def get_snapshot_summary():

    snapshot = get_logs_snapshot()

    return {

        "timestamp":

            snapshot["timestamp"],

        "hostname":

            snapshot["hostname"],

        "environment":

            snapshot["environment"],

        "kernel_logs":

            snapshot["kernel"]["statistics"]["kernel_logs"],

        "boot_logs":

            snapshot["kernel"]["statistics"]["boot_logs"],

        "oom_events":

            snapshot["kernel"]["statistics"]["oom_events"],

        "filesystem_errors":

            snapshot["kernel"]["statistics"]["filesystem_errors"],

        "hardware_errors":

            snapshot["kernel"]["statistics"]["hardware_errors"],

        "network_errors":

            snapshot["kernel"]["statistics"]["network_errors"],

        "failed_logins":

            snapshot["authentication"]["statistics"]["failed_logins"],

        "successful_logins":

            snapshot["authentication"]["statistics"]["successful_logins"],

        "security_events":

            snapshot["authentication"]["statistics"]["security_events"],

        "failed_services":

            snapshot["services"]["statistics"]["failed_services"],

        "running_services":

            snapshot["services"]["statistics"]["running_services"],

        "logged_users":

            snapshot["users"]["statistics"]["logged_users"],

        "cron_events":

            snapshot["users"]["statistics"]["cron_events"],

        "existing_log_files":

            snapshot["log_files"]["statistics"]["existing_logs"],

        "missing_log_files":

            snapshot["log_files"]["statistics"]["missing_logs"]

    }

# ============================================================
# Temporary Test Output
#
# NOTE
#
# This function is ONLY for testing.
#
# It is NOT part of the final architecture.
#
# After verification simply comment out
#
#     write_test_log(snapshot)
#
# ============================================================

def write_test_log(snapshot):

    try:

        output_file = BASE_DIR / "log.txt"

        with open(

            output_file,

            "w",

            encoding="utf-8"

        ) as file:

            file.write("=" * 80 + "\n")

            file.write("KAISP Universal Linux Log Collector\n")

            file.write("=" * 80 + "\n\n")

            file.write(

                f"Timestamp   : {snapshot['timestamp']}\n"

            )

            file.write(

                f"Hostname    : {snapshot['hostname']}\n"

            )

            file.write(

                f"Environment : {snapshot['environment']}\n\n"

            )

            # ====================================================
            # Kernel
            # ====================================================

            file.write("=" * 80 + "\n")

            file.write("KERNEL\n")

            file.write("=" * 80 + "\n")

            for item in snapshot["kernel"]["logs"]:

                file.write(item["message"] + "\n")

            file.write("\n")

            # ====================================================
            # Authentication
            # ====================================================

            file.write("=" * 80 + "\n")

            file.write("AUTHENTICATION\n")

            file.write("=" * 80 + "\n")

            for item in snapshot["authentication"]["logs"]:

                file.write(item["message"] + "\n")

            file.write("\n")

            # ====================================================
            # Services
            # ====================================================

            file.write("=" * 80 + "\n")

            file.write("SERVICES\n")

            file.write("=" * 80 + "\n")

            for item in snapshot["services"]["logs"]:

                file.write(item["message"] + "\n")

            file.write("\n")

            # ====================================================
            # Users
            # ====================================================

            file.write("=" * 80 + "\n")

            file.write("USERS\n")

            file.write("=" * 80 + "\n")

            for item in snapshot["users"]["logged_users"]:

                file.write(item["message"] + "\n")

            file.write("\n")

            # ====================================================
            # Log Files
            # ====================================================

            file.write("=" * 80 + "\n")

            file.write("LOG FILES\n")

            file.write("=" * 80 + "\n")

            for log in snapshot["log_files"]["files"]:

                file.write(

                    f"{log['name']}\n"

                )

                file.write(

                    f"  Exists : {log['exists']}\n"

                )

                file.write(

                    f"  Path   : {log['path']}\n"

                )

                file.write(

                    f"  Size   : {log['size_mb']} MB\n\n"

                )

            # ====================================================
            # Summary
            # ====================================================

            file.write("=" * 80 + "\n")

            file.write("SUMMARY\n")

            file.write("=" * 80 + "\n")

            summary = get_snapshot_summary()

            for key, value in summary.items():

                file.write(

                    f"{key:25}: {value}\n"

                )

            file.write("\n")

        logger.info(

            "Temporary test log written to log.txt"

        )

    except Exception as e:

        logger.exception(

            f"Unable to write test log: {e}"

        )


        # ============================================================
# Continuous Monitoring
# ============================================================

def monitor_logs_continuously(interval=5):

    logger.info(

        f"Starting Linux Log Monitor "

        f"(interval={interval}s)"

    )

    while True:

        try:

            snapshot = get_logs_snapshot()

            # ====================================================
            # TEMPORARY
            #
            # ONLY FOR TESTING
            #
            # Remove or comment later.
            # ====================================================

            write_test_log(snapshot)

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

    summary = get_snapshot_summary()

    print(

        json.dumps(

            summary,

            indent=4

        )

    )


# ============================================================
# Health Check
# ============================================================

def health_check():

    try:

        module_information()

        get_logs_snapshot()

        return {

            "healthy": True,

            "timestamp":

                datetime.now().isoformat(),

            "hostname":

                socket.gethostname(),

            "environment":

                get_environment()

        }

    except Exception as e:

        logger.exception(

            f"Health check failed: {e}"

        )

        return {

            "healthy": False,

            "error":

                str(e)

        }


# ============================================================
# Main
# ============================================================

if __name__ == "__main__":

    logger.info(

        "=" * 60

    )

    logger.info(

        "Universal Linux Log Collector Started"

    )

    logger.info(

        "=" * 60

    )

    print(

        json.dumps(

            module_information(),

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

        print(

            "\nHealth Check : PASSED\n"

        )

    else:

        print(

            "\nHealth Check : FAILED\n"

        )

    print_summary()

    monitor_logs_continuously(

        interval=5

    )