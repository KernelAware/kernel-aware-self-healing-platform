
import os
import re
import json
import time
import socket
import shutil
import logging
import subprocess

from pathlib import Path
from datetime import datetime

# Logging Configuration

BASE_DIR = Path(__file__).resolve().parent

LOG_FILE = BASE_DIR / "app.txt"

logging.basicConfig(
#   filename=str(LOG_FILE),      ##################################################################################################  logger to file
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    force=True
)

logger = logging.getLogger(__name__)

logger.info("=" * 60)
logger.info("KAISP Universal Log Collector Started")
logger.info("=" * 60)

# Configuration
DEFAULT_LOG_LINES = 200
COMMAND_TIMEOUT = 10

# ============================================================
# Global Raw Data
#
# Filled ONLY by refresh_sources()
#
# No collector should execute Linux commands.
# ============================================================

RAW_DATA = {
    "environment": {},
    "journal": [],
    "kernel": [],
    "authentication": [],
    "services": [],
    "boot": [],
    "cron": [],
    "applications": [],
    "users": [],
    "statistics": {}
}

# ============================================================
# Universal Log Locations
# ============================================================

LOG_DIRECTORIES = [
    Path("/host/var/log"),
    Path("/var/log")
]

COMMON_LOG_FILES = {
    "syslog": [
        "syslog",
        "messages"
    ],
    "kernel": [
        "kern.log",
        "messages"
    ],
    "authentication": [
        "auth.log",
        "secure"
    ],
    "boot": [
        "boot.log"
    ],
    "cron": [
        "cron",
        "cron.log"
    ]
}

# Environment Detection

def is_docker():
    return Path("/.dockerenv").exists()


def is_kubernetes():
    return "KUBERNETES_SERVICE_HOST" in os.environ


def is_ec2():
    try:
        return Path(
            "/sys/hypervisor/uuid"
        ).read_text().startswith(
            "ec2"
        )

    except Exception:
        return False


def get_environment():
    if is_kubernetes():
        return "Kubernetes"

    if is_docker():
        return "Docker"

    if is_ec2():
        return "AWS EC2"

    return "Linux"


# Command Detection

def command_exists(command):
    return shutil.which(command) is not None


def has_journalctl():
    return command_exists("journalctl")


def has_systemctl():
    return command_exists("systemctl")


def has_dmesg():
    return command_exists("dmesg")


def has_last():
    return command_exists("last")


def has_who():
    return command_exists("who")


# Universal Log Discovery

def find_log_file(log_type):
    candidates = COMMON_LOG_FILES.get(log_type,[])
    for directory in LOG_DIRECTORIES:
        if not directory.exists():
            continue

        for filename in candidates:
            path = directory / filename
            if path.exists():
                return path

    return None


# Helper function to Execute Linux Command

def run_command(command):
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=COMMAND_TIMEOUT)
        if result.returncode != 0:
            return []

        return result.stdout.splitlines()

    except Exception as e:
        logger.warning(
            f"Command failed: {command} : {e}"
        )

        return []


# Helper function to Read Log File

def read_log_file(path,lines=DEFAULT_LOG_LINES):
    if path is None:
        return []

    try:
        with open(
                path,
                "r",
                encoding="utf-8",
                errors="ignore"
        ) as file:
            return file.readlines()[-lines:]

    except Exception as e:
        logger.warning(
            f"Unable to read {path}: {e}"
        )
        return []


# Universal Reader
# ALL collectors will use this.
# Collectors NEVER know where logs come from.

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

        if log_type == "kernel":
            command.insert(
                1,
                "-k"
            )

        return run_command(command)

    return []


# Helper Functions

def bytes_to_mb(value):
    return round( value / (1024 * 1024) , 2)


def current_timestamp():
    return datetime.now().isoformat()


def hostname():
    return socket.gethostname()


# Environment Information

def get_environment_information():
    return {
        "environment":
            get_environment(),

        "hostname":
            hostname(),

        "journalctl":
            has_journalctl(),

        "systemctl":
            has_systemctl(),

        "dmesg":
            has_dmesg(),

        "last":
            has_last(),

        "who":
            has_who(),

        "log_directory":
            str(
                next(
                        (
                            d
                            for d in LOG_DIRECTORIES
                            if d.exists()
                        ),
                        ""
                    )
                )
    }


# Main
# Testing Part 1

if __name__ == "__main__":
    print(
        json.dumps(
            get_environment_information(),
            indent=4
        )
    )


# Primary Collectors

# These are the ONLY functions that perform I/O.
# Every other collector reads only from RAW_DATA.

def collect_system_journal():
    logger.info("Collecting system journal...")
    if has_journalctl():
        RAW_DATA["journal"] = run_command(
            [
                "journalctl",
                "--no-pager",
                "-n",
                str(DEFAULT_LOG_LINES)
            ]
        )

    else:
        RAW_DATA["journal"] = read_logs("syslog")


def collect_kernel_logs():
    logger.info("Collecting kernel logs...")
    if has_dmesg():
        logs = run_command(
            [
                "dmesg",
                "--ctime"
            ]
        )

        if logs:
            RAW_DATA["kernel"] = logs[-DEFAULT_LOG_LINES:]
            return

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
            RAW_DATA["kernel"] = logs
            return

    RAW_DATA["kernel"] = read_logs("kernel")


def collect_authentication_logs():
    logger.info("Collecting authentication logs...")
    RAW_DATA["authentication"] = read_logs(
        "authentication"
    )


def collect_service_logs():
    logger.info("Collecting service logs...")
    if has_journalctl():
        RAW_DATA["services"] = run_command(
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
        RAW_DATA["services"] = read_logs(
            "syslog"
        )


def collect_boot_logs():
    logger.info("Collecting boot logs...")
    boot = read_logs("boot")
    if boot:
        RAW_DATA["boot"] = boot
        return

    boot_events = []
    for line in RAW_DATA["journal"]:
        text = line.lower()
        if any(
            keyword in text
            for keyword in [
                "boot",
                "startup",
                "booting",
                "reached target"
            ]
        ):
            boot_events.append(line)

    RAW_DATA["boot"] = boot_events


def collect_cron_logs():
    logger.info("Collecting cron logs...")
    cron = read_logs("cron")
    if cron:
        RAW_DATA["cron"] = cron
        return

    events = []
    for line in RAW_DATA["journal"]:
        text = line.lower()
        if any(
            keyword in text
            for keyword in [
                "cron",
                "crond",
                "cronie"
            ]
        ):
            events.append(line)

    RAW_DATA["cron"] = events


def collect_application_logs():
    logger.info("Collecting application logs...")
    RAW_DATA["applications"] = read_logs(
        "syslog"
    )


def collect_user_sessions():
    logger.info("Collecting user sessions...")
    users = {}
    if has_last():
        users["history"] = run_command(
            [
                "last",
                "-n",
                str(DEFAULT_LOG_LINES)
            ]
        )

    else:
        users["history"] = []

    if has_who():
        users["current"] = run_command(
            [
                "who"
            ]
        )

    else:
        users["current"] = []
    RAW_DATA["users"] = users


def collect_log_statistics():
    logger.info("Collecting log statistics...")
    stats = {}
    for log_type in COMMON_LOG_FILES:
        path = find_log_file(log_type)
        if path is None:
            stats[log_type] = {
                "exists": False,
                "path": None,
                "size": 0
            }

            continue

        stats[log_type] = {
            "exists": True,
            "path": str(path),
            "size": path.stat().st_size,
            "modified": datetime.fromtimestamp(
                path.stat().st_mtime
            ).isoformat()
        }

    RAW_DATA["statistics"] = stats


# Refresh Sources
# The ONLY entry point that performs I/O.

def refresh_sources():
    logger.info("=" * 60)
    logger.info("Refreshing log sources...")
    RAW_DATA["environment"] = get_environment_information()
    collect_system_journal()
    collect_kernel_logs()
    collect_authentication_logs()
    collect_service_logs()
    collect_boot_logs()
    collect_cron_logs()
    collect_application_logs()
    collect_user_sessions()
    collect_log_statistics()
    logger.info("Refresh complete.")


# Kernel Collectors

# NO I/O
# Uses: RAW_DATA["kernel"]

def get_system_journal_logs():
    logger.info("Getting system journal logs...")
    return RAW_DATA["journal"]


def get_kernel_logs():
    logger.info("Getting kernel logs...")
    return RAW_DATA["kernel"]


def get_oom_killer_logs():
    logger.info("Getting OOM Killer logs...")
    keywords = (
        "oom",
        "out of memory",
        "oom-killer",
        "killed process"
    )

    return [
        line
        for line in RAW_DATA["kernel"]
        if any(
            keyword in line.lower()
            for keyword in keywords
        )
    ]


def get_filesystem_error_logs():
    logger.info(
        "Getting filesystem errors..."
    )
    keywords = (
        "ext4",
        "xfs",
        "btrfs",
        "filesystem",
        "superblock",
        "inode",
        "mount failed",
        "fs error"
    )

    return [
        line
        for line in RAW_DATA["kernel"]
        if any(
            keyword in line.lower()
            for keyword in keywords
        )
    ]


def get_hardware_error_logs():
    logger.info(
        "Getting hardware errors..."
    )

    keywords = (
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
    )

    return [
        line
        for line in RAW_DATA["kernel"]
        if any(
            keyword in line.lower()
            for keyword in keywords
        )
    ]


def get_network_error_logs():
    logger.info(
        "Getting network errors..."
    )
    keywords = (
        "network",
        "ethernet",
        "carrier",
        "dhcp",
        "dns",
        "interface",
        "link is down",
        "link is up",
        "connection lost",
        "route"
    )

    return [
        line
        for line in RAW_DATA["kernel"]
        if any(
            keyword in line.lower()
            for keyword in keywords
        )
    ]


def get_boot_logs():
    logger.info(
        "Getting boot logs..."
    )

    return RAW_DATA["boot"]


def get_kernel_statistics():
    logger.info(
        "Getting kernel statistics..."
    )

    return {
        "journal_logs":
            len(
                RAW_DATA["journal"]
            ),

        "kernel_logs":
            len(
                RAW_DATA["kernel"]
            ),

        "boot_logs":
            len(
                RAW_DATA["boot"]
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


def has_kernel_errors():
    return (
        len(
            get_filesystem_error_logs()
        )
        +
        len(
            get_hardware_error_logs()
        )
        +
        len(
            get_oom_killer_logs()
        )
    ) > 0


def kernel_summary():
    return {
        "kernel_logs":
            len(
                get_kernel_logs()
            ),

        "boot_logs":
            len(
                get_boot_logs()
            ),

        "oom":
            len(
                get_oom_killer_logs()
            ),

        "filesystem":
            len(
                get_filesystem_error_logs()
            ),

        "hardware":
            len(
                get_hardware_error_logs()
            ),

        "network":
            len(
                get_network_error_logs()
            )
    }


# Authentication Collectors, NO I/O
# Uses:
# RAW_DATA["authentication"]

def get_auth_logs():
    logger.info("Getting authentication logs...")
    return RAW_DATA["authentication"]


def get_ssh_logs():
    logger.info("Getting SSH logs...")
    keywords = (
        "sshd",
        "ssh",
        "accepted password",
        "accepted publickey",
        "connection closed",
        "disconnect"
    )

    return [
        line
        for line in RAW_DATA["authentication"]
        if any(
            keyword in line.lower()
            for keyword in keywords
        )
    ]


def get_failed_logins():
    logger.info("Getting failed logins...")
    keywords = (
        "failed password",
        "authentication failure",
        "invalid user",
        "failed login",
        "login incorrect"
    )

    return [
        line
        for line in RAW_DATA["authentication"]
        if any(
            keyword in line.lower()
            for keyword in keywords
        )
    ]


def get_successful_logins():
    logger.info("Getting successful logins...")
    keywords = (
        "accepted password",
        "accepted publickey",
        "session opened",
        "login successful"
    )

    return [
        line
        for line in RAW_DATA["authentication"]
        if any(
            keyword in line.lower()
            for keyword in keywords
        )
    ]


def get_sudo_logs():
    logger.info("Getting sudo logs...")
    return [
        line
        for line in RAW_DATA["authentication"]
        if "sudo" in line.lower()
    ]


def get_permission_denied_logs():
    logger.info("Getting permission denied logs...")
    keywords = (
        "permission denied",
        "access denied",
        "operation not permitted"
    )

    return [
        line
        for line in RAW_DATA["authentication"]
        if any(
            keyword in line.lower()
            for keyword in keywords
        )
    ]


def get_privilege_escalation_logs():
    logger.info("Getting privilege escalation logs...")
    keywords = (
        "sudo",
        "su:",
        "root",
        "session opened",
        "session closed"
    )

    return [
        line
        for line in RAW_DATA["authentication"]
        if any(
            keyword in line.lower()
            for keyword in keywords
        )
    ]


def get_authentication_failures():
    logger.info("Getting authentication failures...")
    keywords = (
        "authentication failure",
        "failed password",
        "invalid user"
    )

    return [
        line
        for line in RAW_DATA["authentication"]
        if any(
            keyword in line.lower()
            for keyword in keywords
        )
    ]


def get_login_events():
    logger.info("Getting login events...")
    keywords = (
        "accepted password",
        "accepted publickey",
        "session opened",
        "login"
    )

    return [
        line
        for line in RAW_DATA["authentication"]
        if any(
            keyword in line.lower()
            for keyword in keywords
        )
    ]


def get_logout_events():
    logger.info("Getting logout events...")
    keywords = (
        "session closed",
        "logout",
        "logged out"
    )

    return [
        line
        for line in RAW_DATA["authentication"]
        if any(
            keyword in line.lower()
            for keyword in keywords
        )
    ]


def get_root_login_events():
    logger.info("Getting root login events...")
    return [
        line
        for line in RAW_DATA["authentication"]
        if "root" in line.lower()
    ]


def get_remote_login_events():
    logger.info("Getting remote login events...")
    keywords = (
        "sshd",
        "accepted password",
        "accepted publickey"
    )

    return [
        line
        for line in RAW_DATA["authentication"]
        if any(
            keyword in line.lower()
            for keyword in keywords
        )
    ]


def get_security_events():
    logger.info("Getting security events...")
    keywords = (
        "sudo",
        "authentication failure",
        "failed password",
        "invalid user",
        "permission denied",
        "pam_unix",
        "root",
        "accepted password",
        "accepted publickey"
    )

    return [
        line
        for line in RAW_DATA["authentication"]
        if any(
            keyword in line.lower()
            for keyword in keywords
        )
    ]


def get_authentication_statistics():
    logger.info("Getting authentication statistics...")
    return {
        "authentication_logs":
            len(
                RAW_DATA["authentication"]
            ),

        "ssh_logs":
            len(
                get_ssh_logs()
            ),

        "failed_logins":
            len(
                get_failed_logins()
            ),

        "successful_logins":
            len(
                get_successful_logins()
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


def has_security_events():

    return (

        len(

            get_security_events()

        ) > 0

    )


# ============================================================

def authentication_summary():

    return {

        "authentication_logs":

            len(

                RAW_DATA["authentication"]

            ),

        "failed_logins":

            len(

                get_failed_logins()

            ),

        "successful_logins":

            len(

                get_successful_logins()

            ),

        "ssh":

            len(

                get_ssh_logs()

            ),

        "sudo":

            len(

                get_sudo_logs()

            ),

        "security":

            len(

                get_security_events()

            )

    }


# ============================================================
# Service Collectors
#
# NO I/O
#
# Uses:
#
# RAW_DATA["services"]
#
# ============================================================

def get_service_logs():

    logger.info("Getting service logs...")

    return RAW_DATA["services"]


# ============================================================

def get_failed_services():

    logger.info("Getting failed services...")

    keywords = (

        "failed",

        "failure",

        "failed with result",

        "exited with status",

        "core dumped"

    )

    return [

        line

        for line in RAW_DATA["services"]

        if any(

            keyword in line.lower()

            for keyword in keywords

        )

    ]


# ============================================================

def get_service_restart_events():

    logger.info("Getting service restart events...")

    keywords = (

        "restart",

        "restarted",

        "restarting"

    )

    return [

        line

        for line in RAW_DATA["services"]

        if any(

            keyword in line.lower()

            for keyword in keywords

        )

    ]


# ============================================================

def get_started_services():

    logger.info("Getting started services...")

    keywords = (

        "started",

        "starting"

    )

    return [

        line

        for line in RAW_DATA["services"]

        if any(

            keyword in line.lower()

            for keyword in keywords

        )

    ]


# ============================================================

def get_stopped_services():

    logger.info("Getting stopped services...")

    keywords = (

        "stopped",

        "stopping"

    )

    return [

        line

        for line in RAW_DATA["services"]

        if any(

            keyword in line.lower()

            for keyword in keywords

        )

    ]


# ============================================================

def get_reloaded_services():

    logger.info("Getting reloaded services...")

    keywords = (

        "reloaded",

        "reload"

    )

    return [

        line

        for line in RAW_DATA["services"]

        if any(

            keyword in line.lower()

            for keyword in keywords

        )

    ]


# ============================================================

def get_running_services():

    logger.info("Getting running services...")

    keywords = (

        "running",

        "started"

    )

    return [

        line

        for line in RAW_DATA["services"]

        if any(

            keyword in line.lower()

            for keyword in keywords

        )

    ]


# ============================================================

def get_service_failures():

    logger.info("Getting service failures...")

    keywords = (

        "failed",

        "failure",

        "crashed",

        "core dumped",

        "segmentation fault"

    )

    return [

        line

        for line in RAW_DATA["services"]

        if any(

            keyword in line.lower()

            for keyword in keywords

        )

    ]


# ============================================================

def get_service_status_changes():

    logger.info("Getting service status changes...")

    keywords = (

        "started",

        "stopped",

        "restart",

        "reloaded",

        "failed"

    )

    return [

        line

        for line in RAW_DATA["services"]

        if any(

            keyword in line.lower()

            for keyword in keywords

        )

    ]


# ============================================================

def find_service(service_name):

    logger.info(

        f"Searching for service: {service_name}"

    )

    service_name = service_name.lower()

    return [

        line

        for line in RAW_DATA["services"]

        if service_name in line.lower()

    ]


# ============================================================

def has_failed_services():

    return len(

        get_failed_services()

    ) > 0


# ============================================================

def service_summary():

    return {

        "service_logs":

            len(

                RAW_DATA["services"]

            ),

        "failed_services":

            len(

                get_failed_services()

            ),

        "running_services":

            len(

                get_running_services()

            ),

        "restart_events":

            len(

                get_service_restart_events()

            ),

        "started":

            len(

                get_started_services()

            ),

        "stopped":

            len(

                get_stopped_services()

            ),

        "reloaded":

            len(

                get_reloaded_services()

            )

    }


# ============================================================

def get_service_statistics():

    logger.info(

        "Getting service statistics..."

    )

    return {

        "service_logs":

            len(

                RAW_DATA["services"]

            ),

        "failed_services":

            len(

                get_failed_services()

            ),

        "running_services":

            len(

                get_running_services()

            ),

        "restart_events":

            len(

                get_service_restart_events()

            ),

        "status_changes":

            len(

                get_service_status_changes()

            ),

        "failures":

            len(

                get_service_failures()

            )

    }


# ============================================================
# User & System Collectors
#
# NO I/O
#
# Uses:
#
# RAW_DATA["users"]
# RAW_DATA["cron"]
# RAW_DATA["applications"]
#
# ============================================================

def get_login_sessions():

    logger.info("Getting login sessions...")

    sessions = []

    for line in RAW_DATA["users"].get("current", []):

        parts = line.split()

        session = {

            "user":

                parts[0]

                if len(parts) > 0

                else "",

            "terminal":

                parts[1]

                if len(parts) > 1

                else "",

            "date":

                " ".join(parts[2:])

                if len(parts) > 2

                else "",

            "raw":

                line

        }

        sessions.append(session)

    return sessions


# ============================================================

def get_login_history():

    logger.info("Getting login history...")

    return RAW_DATA["users"].get(

        "history",

        []

    )


# ============================================================

def get_logged_users():

    logger.info("Getting logged users...")

    return RAW_DATA["users"].get(

        "current",

        []

    )


# ============================================================

def get_cron_logs():

    logger.info("Getting cron logs...")

    return RAW_DATA["cron"]


# ============================================================

def get_application_logs():

    logger.info("Getting application logs...")

    return RAW_DATA["applications"]


# ============================================================

def get_root_login_events():

    logger.info("Getting root login events...")

    return [

        line

        for line in RAW_DATA["users"].get(

            "history",

            []

        )

        if "root" in line.lower()

    ]


# ============================================================

def get_remote_login_events():

    logger.info("Getting remote login events...")

    keywords = (

        "ssh",

        "pts/",

        "from"

    )

    return [

        line

        for line in RAW_DATA["users"].get(

            "history",

            []

        )

        if any(

            keyword in line.lower()

            for keyword in keywords

        )

    ]


# ============================================================

def get_local_login_events():

    logger.info("Getting local login events...")

    return [

        line

        for line in RAW_DATA["users"].get(

            "history",

            []

        )

        if "tty" in line.lower()

    ]


# ============================================================

def get_active_user_count():

    return len(

        RAW_DATA["users"].get(

            "current",

            []

        )

    )


# ============================================================

def get_login_history_count():

    return len(

        RAW_DATA["users"].get(

            "history",

            []

        )

    )


# ============================================================

def find_user(username):

    logger.info(

        f"Searching user: {username}"

    )

    username = username.lower()

    results = []

    for line in RAW_DATA["users"].get(

        "history",

        []

    ):

        if username in line.lower():

            results.append(line)

    for line in RAW_DATA["users"].get(

        "current",

        []

    ):

        if username in line.lower():

            results.append(line)

    return results


# ============================================================

def get_user_statistics():

    logger.info(

        "Getting user statistics..."

    )

    return {

        "logged_users":

            get_active_user_count(),

        "login_history":

            get_login_history_count(),

        "cron_logs":

            len(

                RAW_DATA["cron"]

            ),

        "application_logs":

            len(

                RAW_DATA["applications"]

            ),

        "root_logins":

            len(

                get_root_login_events()

            ),

        "remote_logins":

            len(

                get_remote_login_events()

            ),

        "local_logins":

            len(

                get_local_login_events()

            )

    }


# ============================================================

def user_summary():

    return {

        "logged_users":

            get_active_user_count(),

        "login_history":

            get_login_history_count(),

        "cron":

            len(

                RAW_DATA["cron"]

            ),

        "applications":

            len(

                RAW_DATA["applications"]

            )

    }


# ============================================================
# Log File Statistics
#
# NO I/O
#
# Uses:
#
# RAW_DATA["statistics"]
#
# ============================================================

def get_log_file_statistics():

    logger.info("Getting log file statistics...")

    return RAW_DATA["statistics"]


# ============================================================

def get_existing_log_files():

    logger.info("Getting existing log files...")

    return {

        name: info

        for name, info in RAW_DATA["statistics"].items()

        if info["exists"]

    }


# ============================================================

def get_missing_log_files():

    logger.info("Getting missing log files...")

    return {

        name: info

        for name, info in RAW_DATA["statistics"].items()

        if not info["exists"]

    }


# ============================================================

def get_empty_log_files():

    logger.info("Getting empty log files...")

    return {

        name: info

        for name, info in RAW_DATA["statistics"].items()

        if info["exists"]

        and info["size"] == 0

    }


# ============================================================

def get_large_log_files(

        minimum_size_mb=100

):

    logger.info("Getting large log files...")

    minimum_bytes = minimum_size_mb * 1024 * 1024

    return {

        name: info

        for name, info in RAW_DATA["statistics"].items()

        if info["exists"]

        and info["size"] >= minimum_bytes

    }


# ============================================================

def get_total_log_size():

    logger.info("Getting total log size...")

    total = sum(

        info["size"]

        for info in RAW_DATA["statistics"].values()

        if info["exists"]

    )

    return {

        "bytes": total,

        "mb": bytes_to_mb(total)

    }


# ============================================================

def get_largest_log_file():

    logger.info("Getting largest log file...")

    existing = get_existing_log_files()

    if not existing:

        return None

    name = max(

        existing,

        key=lambda key:

        existing[key]["size"]

    )

    return {

        "name": name,

        **existing[name]

    }


# ============================================================

def get_recent_log_files(

        hours=24

):

    logger.info("Getting recent log files...")

    recent = {}

    now = time.time()

    limit = hours * 3600

    for name, info in RAW_DATA["statistics"].items():

        if not info["exists"]:

            continue

        try:

            modified = datetime.fromisoformat(

                info["modified"]

            ).timestamp()

        except Exception:

            continue

        if now - modified <= limit:

            recent[name] = info

    return recent


# ============================================================

def find_log_statistics(

        log_name

):

    logger.info(

        f"Finding statistics for {log_name}"

    )

    return RAW_DATA["statistics"].get(

        log_name

    )


# ============================================================

def has_missing_logs():

    return any(

        not info["exists"]

        for info in RAW_DATA["statistics"].values()

    )


# ============================================================

def log_statistics_summary():

    logger.info(

        "Getting log statistics summary..."

    )

    return {

        "configured_logs":

            len(

                RAW_DATA["statistics"]

            ),

        "existing_logs":

            len(

                get_existing_log_files()

            ),

        "missing_logs":

            len(

                get_missing_log_files()

            ),

        "empty_logs":

            len(

                get_empty_log_files()

            ),

        "large_logs":

            len(

                get_large_log_files()

            ),

        "recent_logs":

            len(

                get_recent_log_files()

            ),

        "total_size_mb":

            get_total_log_size()["mb"]

    }


# ============================================================

def get_statistics_summary():

    return {

        "kernel":

            get_kernel_statistics(),

        "authentication":

            get_authentication_statistics(),

        "services":

            get_service_statistics(),

        "users":

            get_user_statistics(),

        "logs":

            log_statistics_summary()

    }


# ============================================================
# Snapshot Builder
#
# NO I/O
#
# Everything comes from RAW_DATA through
# the collector functions.
# ============================================================

def get_logs_snapshot():

    logger.info("Building logs snapshot...")

    snapshot = {

        "timestamp": current_timestamp(),

        "hostname": hostname(),

        "environment": RAW_DATA["environment"],

        # ====================================================
        # Kernel
        # ====================================================

        "kernel": {

            "journal":

                get_system_journal_logs(),

            "kernel_logs":

                get_kernel_logs(),

            "boot_logs":

                get_boot_logs(),

            "oom_killer":

                get_oom_killer_logs(),

            "filesystem_errors":

                get_filesystem_error_logs(),

            "hardware_errors":

                get_hardware_error_logs(),

            "network_errors":

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

            "failed":

                get_failed_services(),

            "running":

                get_running_services(),

            "restart_events":

                get_service_restart_events(),

            "started":

                get_started_services(),

            "stopped":

                get_stopped_services(),

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

            "logged_users":

                get_logged_users(),

            "login_sessions":

                get_login_sessions(),

            "login_history":

                get_login_history(),

            "cron":

                get_cron_logs(),

            "applications":

                get_application_logs(),

            "root_logins":

                get_root_login_events(),

            "remote_logins":

                get_remote_login_events(),

            "statistics":

                get_user_statistics()

        },

        # ====================================================
        # Log Files
        # ====================================================

        "log_files": {

            "statistics":

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

            "summary":

                log_statistics_summary()

        },

        # ====================================================
        # Overall Statistics
        # ====================================================

        "summary":

            get_statistics_summary()

    }

    logger.info("Logs snapshot created.")

    return snapshot


# ============================================================
# Snapshot Summary
# ============================================================

def get_snapshot_summary():

    logger.info("Building snapshot summary...")

    return {

        "timestamp":

            current_timestamp(),

        "hostname":

            hostname(),

        "environment":

            RAW_DATA["environment"].get(

                "environment",

                "Unknown"

            ),

        "kernel_logs":

            len(

                get_kernel_logs()

            ),

        "journal_logs":

            len(

                get_system_journal_logs()

            ),

        "authentication_logs":

            len(

                get_auth_logs()

            ),

        "security_events":

            len(

                get_security_events()

            ),

        "failed_logins":

            len(

                get_failed_logins()

            ),

        "failed_services":

            len(

                get_failed_services()

            ),

        "logged_users":

            len(

                get_logged_users()

            ),

        "cron_logs":

            len(

                get_cron_logs()

            ),

        "application_logs":

            len(

                get_application_logs()

            ),

        "existing_logs":

            len(

                get_existing_log_files()

            ),

        "missing_logs":

            len(

                get_missing_log_files()

            )

    }


# ============================================================
# Print Snapshot
# ============================================================

def print_snapshot():

    print(

        json.dumps(

            get_logs_snapshot(),

            indent=4

        )

    )


# ============================================================
# Print Summary
# ============================================================

def print_summary():

    print(

        json.dumps(

            get_snapshot_summary(),

            indent=4

        )

    )




    # ============================================================
# Temporary Test Output
#
# NOTE:
#
# This is ONLY for testing.
#
# Remove or comment out
#
#     write_test_log(snapshot)
#
# after verification.
#
# ============================================================

def write_test_log(snapshot):

    try:

        output = BASE_DIR / "log.txt"

        with open(

            output,

            "w",

            encoding="utf-8"

        ) as file:

            file.write(

                json.dumps(

                    snapshot,

                    indent=4

                )

            )

        logger.info(

            "Temporary log.txt updated."

        )

    except Exception as e:

        logger.exception(

            f"Unable to write test log: {e}"

        )


# ============================================================
# Health Check
# ============================================================

def health_check():

    logger.info(

        "Running health check..."

    )

    try:

        refresh_sources()

        snapshot = get_logs_snapshot()

        return {

            "healthy": True,

            "timestamp":

                current_timestamp(),

            "hostname":

                hostname(),

            "environment":

                RAW_DATA["environment"],

            "snapshot_created":

                snapshot is not None

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
# Monitor
# ============================================================

def monitor_logs_continuously(

        interval=10

):

    logger.info(

        f"Monitoring every {interval} seconds."

    )

    while True:

        try:

            refresh_sources()

            snapshot = get_logs_snapshot()

            # ---------------------------------------------
            # Temporary testing only
            # ---------------------------------------------

            #write_test_log(snapshot)       ########################################################################################logger

            logger.info(

                json.dumps(

                    get_snapshot_summary(),

                    indent=4

                )

            )

            time.sleep(interval)

        except KeyboardInterrupt:

            logger.info(

                "Collector stopped."

            )

            break

        except Exception as e:

            logger.exception(

                f"Monitoring error: {e}"

            )

            time.sleep(interval)


# ============================================================
# Main
# ============================================================

def main():

    logger.info(

        "=" * 60

    )

    logger.info(

        "KAISP Universal Log Collector"

    )

    logger.info(

        "=" * 60

    )

    print(

        json.dumps(

            get_environment_information(),

            indent=4

        )

    )

    status = health_check()

    print(

        json.dumps(

            status,

            indent=4

        )

    )

    if status["healthy"]:

        print(

            "\nHealth Check : PASSED\n"

        )

    else:

        print(

            "\nHealth Check : FAILED\n"

        )

        return

    print_summary()

    monitor_logs_continuously(

        interval=10

    )


# ============================================================
# Entry Point
# ============================================================

if __name__ == "__main__":

    main()