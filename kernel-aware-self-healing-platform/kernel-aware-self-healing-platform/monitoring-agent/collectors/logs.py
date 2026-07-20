import json
import os
import subprocess
import time
import logging
import socket

from datetime import datetime
from pathlib import Path


# Logging Configuration

logging.basicConfig(
    filename="app.txt",
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

logger = logging.getLogger(__name__)

# Configuration

# Maximum number of log lines to return from each source.
DEFAULT_LOG_LINES = 100

# Timeout when running Linux commands.
COMMAND_TIMEOUT = 10

# Common Linux Log Files

COMMON_LOG_FILES = {
    "syslog": "/var/log/syslog",
    "messages": "/var/log/messages",
    "auth": "/var/log/auth.log",
    "kern": "/var/log/kern.log",
    "boot": "/var/log/boot.log",
    "cron": "/var/log/cron",
    "dmesg": "/var/log/dmesg"
}


# Helper Function to Run Linux Commands
"""
Runs a Linux command and returns its output.
Example
run_command(["journalctl", "-n", "20"])
Returns
{
    "success": True,
    "output": "...",
    "error": ""
}
"""

def run_command(command):
    try:
        result = subprocess.run(command,capture_output=True,text=True,timeout=COMMAND_TIMEOUT)
        return {
            "success": result.returncode == 0,
            "output": result.stdout.strip(),
            "error": result.stderr.strip()
        }
    
    except subprocess.TimeoutExpired:
        logger.error(
            f"Command timeout: {' '.join(command)}"
        )

        return {
            "success": False,
            "output": "",
            "error": "Command timed out"
        }

    except Exception as e:
        logger.error(
            f"Command execution failed: {e}"
        )
        return {
            "success": False,
            "output": "",
            "error": str(e)
        }


# Helper Function to Read Log File
"""
Reads the last N lines from a log file.
Returns
[
    "Jul 20 10:05 systemd Started...",
    "Jul 20 10:06 sshd Accepted..."
]
"""

def read_log_file(file_path, lines=DEFAULT_LOG_LINES):
    try:
        if not os.path.exists(file_path):
            logger.warning(
                f"Log file not found: {file_path}"
            )
            return []
        with open(file_path,"r",encoding="utf-8",errors="ignore") as file:
            content = file.readlines()
        return [
            line.strip()
            for line in content[-lines:]
        ]

    except PermissionError:
        logger.warning(
            f"Permission denied: {file_path}"
        )
        return []

    except Exception as e:
        logger.error(
            f"Unable to read {file_path}: {e}"
        )
        return []


# Helper Function to Check File Exists
"""
Returns
    True or False
"""

def file_exists(file_path):
    return Path(file_path).exists()


# Helper Function to Get File Size
"""
Returns
    102400(bytes)
"""

def get_file_size(file_path):
    try:
        return os.path.getsize(file_path)
    except Exception:
        return 0


# Helper Function to Convert Bytes to MB

def bytes_to_mb(value):
    return round(value / (1024 * 1024),2)


# Helper Function to Get Last Modified Time
"""
Returns
    2026-07-20T18:42:31
"""

def get_last_modified(file_path):
    try:
        timestamp = os.path.getmtime(file_path)
        return datetime.fromtimestamp(
            timestamp
        ).isoformat()
    
    except Exception:
        return None


# Helper Function to Parse Command Output
"""
Converts command output into a list.
Example
    line1
    line2
    line3
becomes
[
    "line1",
    "line2",
    "line3"
]
"""

def output_to_list(output):
    if not output:
        return []

    return [
        line.strip()
        for line in output.splitlines()
        if line.strip()
    ]


# Helper Function to Create Standard Log Entry

"""
Returns

{
    "timestamp":"...",
    "source":"kernel",
    "message":"Disk error..."
}
"""


def create_log_entry(

        source,

        message,

        timestamp=None

):

    if timestamp is None:

        timestamp = datetime.now().isoformat()

    return {

        "timestamp": timestamp,

        "source": source,

        "message": message

    }


# ============================================================
# Helper Function
# Get Host Information
# ============================================================

"""
Returns

{
    "hostname":"ubuntu-server",
    "timestamp":"..."
}
"""


def get_host_information():

    return {

        "hostname":

            socket.gethostname(),

        "timestamp":

            datetime.now().isoformat()

    }

# ============================================================
# System Journal Logs
# ============================================================

"""
Collect recent system journal logs.

Uses:
    journalctl

Returns

[
    {
        "timestamp": "...",
        "source": "systemd",
        "message": "Started Network Manager..."
    }
]
"""


def get_system_journal_logs(lines=DEFAULT_LOG_LINES):

    try:

        command = [
            "journalctl",
            "-n",
            str(lines),
            "--no-pager",
            "--output=short"
        ]

        result = run_command(command)

        if not result["success"]:

            logger.warning(
                f"Unable to collect system journal logs: "
                f"{result['error']}"
            )

            return []

        logs = []

        for line in output_to_list(result["output"]):

            logs.append(
                create_log_entry(
                    source="system_journal",
                    message=line
                )
            )

        return logs

    except Exception as e:

        logger.error(
            f"System journal collection failed: {e}"
        )

        return []


# ============================================================
# Kernel Logs
# ============================================================

"""
Collect recent Linux kernel logs.

Uses:
    dmesg

Returns

[
    {
        "timestamp":"...",
        "source":"kernel",
        "message":"EXT4 filesystem mounted..."
    }
]
"""


def get_kernel_logs(lines=DEFAULT_LOG_LINES):

    try:

        command = [
            "dmesg",
            "--ctime"
        ]

        result = run_command(command)

        if not result["success"]:

            logger.warning(
                f"Unable to collect kernel logs: "
                f"{result['error']}"
            )

            return []

        kernel_lines = output_to_list(result["output"])

        logs = []

        for line in kernel_lines[-lines:]:

            logs.append(

                create_log_entry(

                    source="kernel",

                    message=line

                )

            )

        return logs

    except Exception as e:

        logger.error(

            f"Kernel log collection failed: {e}"

        )

        return []


# ============================================================
# Recent Kernel Errors
# ============================================================

"""
Collect only kernel error messages.

Searches for

error
fail
panic
segfault
I/O error

Returns

[
    {
        "timestamp":"...",
        "source":"kernel_error",
        "message":"EXT4-fs error..."
    }
]
"""


def get_kernel_error_logs(lines=DEFAULT_LOG_LINES):

    keywords = [

        "error",

        "fail",

        "panic",

        "segfault",

        "i/o",

        "critical"

    ]

    try:

        logs = get_kernel_logs(lines * 5)

        errors = []

        for log in logs:

            message = log["message"].lower()

            if any(

                keyword in message

                for keyword in keywords

            ):

                errors.append(log)

        return errors[-lines:]

    except Exception as e:

        logger.error(

            f"Kernel error collection failed: {e}"

        )

        return []


# ============================================================
# System Journal Errors
# ============================================================

"""
Collect ERROR and WARNING messages from systemd journal.

Uses

journalctl -p warning

Returns

[
    {
        "timestamp":"...",
        "source":"journal_warning",
        "message":"Network service failed..."
    }
]
"""


def get_system_warning_logs(lines=DEFAULT_LOG_LINES):

    try:

        command = [

            "journalctl",

            "-p",

            "warning",

            "-n",

            str(lines),

            "--no-pager"

        ]

        result = run_command(command)

        if not result["success"]:

            return []

        logs = []

        for line in output_to_list(

            result["output"]

        ):

            logs.append(

                create_log_entry(

                    source="journal_warning",

                    message=line

                )

            )

        return logs

    except Exception as e:

        logger.error(

            f"Journal warning collection failed: {e}"

        )

        return []


# ============================================================
# Journal Statistics
# ============================================================

"""
Returns information about the system journal.

Example

{
    "entries":120,
    "warnings":10,
    "kernel_errors":3
}
"""


def get_journal_statistics():

    try:

        journal_logs = get_system_journal_logs()

        warning_logs = get_system_warning_logs()

        kernel_errors = get_kernel_error_logs()

        return {

            "journal_entries":

                len(journal_logs),

            "warning_entries":

                len(warning_logs),

            "kernel_error_entries":

                len(kernel_errors)

        }

    except Exception as e:

        logger.error(

            f"Journal statistics failed: {e}"

        )

        return {}
    
    # ============================================================
# Authentication Logs
# ============================================================

"""
Collect recent authentication logs.

Reads

    /var/log/auth.log

Returns

[
    {
        "timestamp":"...",
        "source":"authentication",
        "message":"Accepted password for ubuntu..."
    }
]
"""


def get_auth_logs(lines=DEFAULT_LOG_LINES):

    try:

        logs = []

        auth_file = COMMON_LOG_FILES.get("auth")

        if auth_file and file_exists(auth_file):

            for line in read_log_file(auth_file, lines):

                logs.append(

                    create_log_entry(

                        source="authentication",

                        message=line

                    )

                )

            return logs

        # Fallback to journalctl
        command = [

            "journalctl",

            "-u",

            "ssh",

            "-n",

            str(lines),

            "--no-pager"

        ]

        result = run_command(command)

        if not result["success"]:

            return []

        for line in output_to_list(result["output"]):

            logs.append(

                create_log_entry(

                    source="authentication",

                    message=line

                )

            )

        return logs

    except Exception as e:

        logger.error(

            f"Authentication log collection failed: {e}"

        )

        return []


# ============================================================
# SSH Logs
# ============================================================

"""
Collect SSH service logs.

Returns

[
    {
        "timestamp":"...",
        "source":"ssh",
        "message":"Accepted publickey..."
    }
]
"""


def get_ssh_logs(lines=DEFAULT_LOG_LINES):

    try:

        command = [

            "journalctl",

            "-u",

            "ssh",

            "-n",

            str(lines),

            "--no-pager"

        ]

        result = run_command(command)

        if not result["success"]:

            return []

        logs = []

        for line in output_to_list(result["output"]):

            logs.append(

                create_log_entry(

                    source="ssh",

                    message=line

                )

            )

        return logs

    except Exception as e:

        logger.error(

            f"SSH log collection failed: {e}"

        )

        return []


# ============================================================
# Failed Login Attempts
# ============================================================

"""
Collect failed login attempts.

Searches for

Failed password
authentication failure
Invalid user

Returns

[
    {
        "timestamp":"...",
        "source":"failed_login",
        "message":"Failed password for root..."
    }
]
"""


def get_failed_login_attempts(lines=DEFAULT_LOG_LINES):

    keywords = [

        "failed password",

        "authentication failure",

        "invalid user",

        "failure"

    ]

    try:

        auth_logs = get_auth_logs(lines * 5)

        failed = []

        for log in auth_logs:

            message = log["message"].lower()

            if any(

                keyword in message

                for keyword in keywords

            ):

                failed.append(

                    create_log_entry(

                        source="failed_login",

                        message=log["message"],

                        timestamp=log["timestamp"]

                    )

                )

        return failed[-lines:]

    except Exception as e:

        logger.error(

            f"Failed login collection failed: {e}"

        )

        return []


# ============================================================
# Successful Login Attempts
# ============================================================

"""
Collect successful logins.

Searches for

Accepted password
Accepted publickey
session opened

Returns

[
    {
        "timestamp":"...",
        "source":"successful_login",
        "message":"Accepted password..."
    }
]
"""


def get_successful_login_attempts(lines=DEFAULT_LOG_LINES):

    keywords = [

        "accepted password",

        "accepted publickey",

        "session opened"

    ]

    try:

        auth_logs = get_auth_logs(lines * 5)

        successful = []

        for log in auth_logs:

            message = log["message"].lower()

            if any(

                keyword in message

                for keyword in keywords

            ):

                successful.append(

                    create_log_entry(

                        source="successful_login",

                        message=log["message"],

                        timestamp=log["timestamp"]

                    )

                )

        return successful[-lines:]

    except Exception as e:

        logger.error(

            f"Successful login collection failed: {e}"

        )

        return []


# ============================================================
# Authentication Statistics
# ============================================================

"""
Returns

{
    "authentication_logs":120,
    "failed_logins":8,
    "successful_logins":42
}
"""


def get_authentication_statistics():

    try:

        auth_logs = get_auth_logs()

        failed = get_failed_login_attempts()

        successful = get_successful_login_attempts()

        return {

            "authentication_logs":

                len(auth_logs),

            "failed_logins":

                len(failed),

            "successful_logins":

                len(successful)

        }

    except Exception as e:

        logger.error(

            f"Authentication statistics failed: {e}"

        )

        return {}
    
    # ============================================================
# Service Logs
# ============================================================

"""
Collect recent service logs from systemd.

Uses

journalctl

Returns

[
    {
        "timestamp":"...",
        "source":"service",
        "message":"Started nginx.service."
    }
]
"""


def get_service_logs(lines=DEFAULT_LOG_LINES):

    try:

        command = [

            "journalctl",

            "-n",

            str(lines),

            "--no-pager",

            "--output=short"

        ]

        result = run_command(command)

        if not result["success"]:

            return []

        logs = []

        service_keywords = [

            ".service",

            "systemd",

            "Started",

            "Stopped",

            "Restarted",

            "Failed"

        ]

        for line in output_to_list(result["output"]):

            if any(

                keyword.lower() in line.lower()

                for keyword in service_keywords

            ):

                logs.append(

                    create_log_entry(

                        source="service",

                        message=line

                    )

                )

        return logs

    except Exception as e:

        logger.error(

            f"Service log collection failed: {e}"

        )

        return []


# ============================================================
# Failed Services
# ============================================================

"""
Collect all failed systemd services.

Uses

systemctl --failed

Returns

[
    {
        "service":"apache2.service",
        "state":"failed"
    }
]
"""


def get_failed_services():

    try:

        command = [

            "systemctl",

            "--failed",

            "--no-pager",

            "--plain"

        ]

        result = run_command(command)

        if not result["success"]:

            return []

        failed_services = []

        for line in output_to_list(result["output"]):

            if ".service" not in line:

                continue

            columns = line.split()

            if len(columns) < 4:

                continue

            failed_services.append({

                "service": columns[0],

                "load": columns[1],

                "active": columns[2],

                "sub": columns[3],

                "description":

                    " ".join(columns[4:])

            })

        return failed_services

    except Exception as e:

        logger.error(

            f"Failed service collection failed: {e}"

        )

        return []


# ============================================================
# Service Status Changes
# ============================================================

"""
Collect service start/stop/restart events.

Searches journal for

Started
Stopped
Restarted
Reloaded

Returns

[
    {
        "timestamp":"...",
        "source":"service_change",
        "message":"Stopped docker.service"
    }
]
"""


def get_service_status_changes(lines=DEFAULT_LOG_LINES):

    keywords = [

        "started",

        "stopped",

        "restarted",

        "reloaded"

    ]

    try:

        logs = get_service_logs(lines * 5)

        changes = []

        for log in logs:

            message = log["message"].lower()

            if any(

                keyword in message

                for keyword in keywords

            ):

                changes.append(

                    create_log_entry(

                        source="service_change",

                        message=log["message"],

                        timestamp=log["timestamp"]

                    )

                )

        return changes[-lines:]

    except Exception as e:

        logger.error(

            f"Service status collection failed: {e}"

        )

        return []


# ============================================================
# Service Restart Events
# ============================================================

"""
Collect services that restarted.

Returns

[
    {
        "timestamp":"...",
        "source":"service_restart",
        "message":"Restarted nginx.service"
    }
]
"""


def get_service_restart_events(lines=DEFAULT_LOG_LINES):

    try:

        changes = get_service_status_changes(

            lines * 5

        )

        restarts = []

        for log in changes:

            if "restart" in log["message"].lower():

                restarts.append(

                    create_log_entry(

                        source="service_restart",

                        message=log["message"],

                        timestamp=log["timestamp"]

                    )

                )

        return restarts[-lines:]

    except Exception as e:

        logger.error(

            f"Service restart collection failed: {e}"

        )

        return []


# ============================================================
# Running Services
# ============================================================

"""
Collect all active services.

Uses

systemctl list-units

Returns

[
    {
        "service":"ssh.service",
        "state":"running"
    }
]
"""


def get_running_services():

    try:

        command = [

            "systemctl",

            "list-units",

            "--type=service",

            "--state=running",

            "--no-pager",

            "--plain"

        ]

        result = run_command(command)

        if not result["success"]:

            return []

        services = []

        for line in output_to_list(result["output"]):

            if ".service" not in line:

                continue

            columns = line.split()

            if len(columns) < 4:

                continue

            services.append({

                "service": columns[0],

                "load": columns[1],

                "active": columns[2],

                "sub": columns[3],

                "description":

                    " ".join(columns[4:])

            })

        return services

    except Exception as e:

        logger.error(

            f"Running service collection failed: {e}"

        )

        return []


# ============================================================
# Service Statistics
# ============================================================

"""
Returns

{

    "running_services": 154,

    "failed_services": 2,

    "restart_events": 5,

    "status_changes": 14

}
"""


def get_service_statistics():

    try:

        running = get_running_services()

        failed = get_failed_services()

        restarted = get_service_restart_events()

        changes = get_service_status_changes()

        return {

            "running_services":

                len(running),

            "failed_services":

                len(failed),

            "restart_events":

                len(restarted),

            "status_changes":

                len(changes)

        }

    except Exception as e:

        logger.error(

            f"Service statistics failed: {e}"

        )

        return {}
    
    # ============================================================
# Boot Logs
# ============================================================

"""
Collect logs from the current system boot.

Uses

journalctl -b

Returns

[
    {
        "timestamp":"...",
        "source":"boot",
        "message":"Reached target Multi-User System."
    }
]
"""


def get_boot_logs(lines=DEFAULT_LOG_LINES):

    try:

        command = [

            "journalctl",

            "-b",

            "-n",

            str(lines),

            "--no-pager"

        ]

        result = run_command(command)

        if not result["success"]:

            logger.warning(

                f"Unable to collect boot logs: "

                f"{result['error']}"

            )

            return []

        logs = []

        for line in output_to_list(result["output"]):

            logs.append(

                create_log_entry(

                    source="boot",

                    message=line

                )

            )

        return logs

    except Exception as e:

        logger.error(

            f"Boot log collection failed: {e}"

        )

        return []


# ============================================================
# Previous Boot Logs
# ============================================================

"""
Collect logs from the previous boot.

Uses

journalctl -b -1

Returns

[
    {
        "timestamp":"...",
        "source":"previous_boot",
        "message":"Previous boot log..."
    }
]
"""


def get_previous_boot_logs(lines=DEFAULT_LOG_LINES):

    try:

        command = [

            "journalctl",

            "-b",

            "-1",

            "-n",

            str(lines),

            "--no-pager"

        ]

        result = run_command(command)

        if not result["success"]:

            return []

        logs = []

        for line in output_to_list(result["output"]):

            logs.append(

                create_log_entry(

                    source="previous_boot",

                    message=line

                )

            )

        return logs

    except Exception as e:

        logger.error(

            f"Previous boot log collection failed: {e}"

        )

        return []


# ============================================================
# Boot Errors
# ============================================================

"""
Collect boot errors.

Searches for

error
failed
panic
dependency failed

Returns

[
    {
        "timestamp":"...",
        "source":"boot_error",
        "message":"Dependency failed..."
    }
]
"""


def get_boot_errors(lines=DEFAULT_LOG_LINES):

    keywords = [

        "error",

        "failed",

        "panic",

        "dependency",

        "emergency"

    ]

    try:

        boot_logs = get_boot_logs(lines * 5)

        errors = []

        for log in boot_logs:

            message = log["message"].lower()

            if any(

                keyword in message

                for keyword in keywords

            ):

                errors.append(

                    create_log_entry(

                        source="boot_error",

                        message=log["message"],

                        timestamp=log["timestamp"]

                    )

                )

        return errors[-lines:]

    except Exception as e:

        logger.error(

            f"Boot error collection failed: {e}"

        )

        return []


# ============================================================
# Reboot History
# ============================================================

"""
Collect reboot history.

Uses

last reboot

Returns

[
    {
        "timestamp":"...",
        "source":"reboot",
        "message":"reboot system boot ..."
    }
]
"""


def get_reboot_history(lines=DEFAULT_LOG_LINES):

    try:

        command = [

            "last",

            "reboot"

        ]

        result = run_command(command)

        if not result["success"]:

            return []

        logs = []

        entries = output_to_list(result["output"])

        for line in entries[:lines]:

            logs.append(

                create_log_entry(

                    source="reboot",

                    message=line

                )

            )

        return logs

    except Exception as e:

        logger.error(

            f"Reboot history collection failed: {e}"

        )

        return []


# ============================================================
# Shutdown Events
# ============================================================

"""
Collect shutdown events.

Searches boot journal for shutdown messages.

Returns

[
    {
        "timestamp":"...",
        "source":"shutdown",
        "message":"Reached target Shutdown."
    }
]
"""


def get_shutdown_events(lines=DEFAULT_LOG_LINES):

    keywords = [

        "shutdown",

        "power-off",

        "halt",

        "stopped",

        "reached target shutdown"

    ]

    try:

        boot_logs = get_boot_logs(lines * 5)

        shutdowns = []

        for log in boot_logs:

            message = log["message"].lower()

            if any(

                keyword in message

                for keyword in keywords

            ):

                shutdowns.append(

                    create_log_entry(

                        source="shutdown",

                        message=log["message"],

                        timestamp=log["timestamp"]

                    )

                )

        return shutdowns[-lines:]

    except Exception as e:

        logger.error(

            f"Shutdown event collection failed: {e}"

        )

        return []


# ============================================================
# Boot Statistics
# ============================================================

"""
Returns

{

    "boot_logs":120,

    "boot_errors":4,

    "reboots":6,

    "shutdown_events":3

}
"""


def get_boot_statistics():

    try:

        boot_logs = get_boot_logs()

        boot_errors = get_boot_errors()

        reboot_history = get_reboot_history()

        shutdown_events = get_shutdown_events()

        return {

            "boot_logs":

                len(boot_logs),

            "boot_errors":

                len(boot_errors),

            "reboots":

                len(reboot_history),

            "shutdown_events":

                len(shutdown_events)

        }

    except Exception as e:

        logger.error(

            f"Boot statistics failed: {e}"

        )

        return {}
    
    # ============================================================
# Cron Logs
# ============================================================

"""
Collect cron daemon logs.

Reads

/var/log/cron

or

journalctl -u cron

Returns

[
    {
        "timestamp":"...",
        "source":"cron",
        "message":"CRON[1234]: (root) CMD (...)"
    }
]
"""


def get_cron_logs(lines=DEFAULT_LOG_LINES):

    try:

        logs = []

        cron_file = COMMON_LOG_FILES.get("cron")

        if cron_file and file_exists(cron_file):

            for line in read_log_file(cron_file, lines):

                logs.append(

                    create_log_entry(

                        source="cron",

                        message=line

                    )

                )

            return logs

        command = [

            "journalctl",

            "-u",

            "cron",

            "-n",

            str(lines),

            "--no-pager"

        ]

        result = run_command(command)

        if not result["success"]:

            return []

        for line in output_to_list(result["output"]):

            logs.append(

                create_log_entry(

                    source="cron",

                    message=line

                )

            )

        return logs

    except Exception as e:

        logger.error(

            f"Cron log collection failed: {e}"

        )

        return []


# ============================================================
# Login Sessions
# ============================================================

"""
Collect login session history.

Uses

last

Returns

[
    {
        "user":"ubuntu",
        "terminal":"pts/0",
        "ip":"192.168.1.100",
        "message":"ubuntu pts/0 ..."
    }
]
"""


def get_login_sessions(lines=DEFAULT_LOG_LINES):

    try:

        command = [

            "last",

            "-n",

            str(lines)

        ]

        result = run_command(command)

        if not result["success"]:

            return []

        sessions = []

        for line in output_to_list(result["output"]):

            if line.startswith("wtmp"):

                continue

            columns = line.split()

            if len(columns) < 4:

                continue

            sessions.append({

                "user": columns[0],

                "terminal": columns[1],

                "ip": columns[2],

                "message": line

            })

        return sessions

    except Exception as e:

        logger.error(

            f"Login session collection failed: {e}"

        )

        return []


# ============================================================
# Logged-in Users
# ============================================================

"""
Collect currently logged-in users.

Uses

who

Returns

[
    {
        "user":"ubuntu",
        "terminal":"pts/0",
        "login_time":"Jul 20 08:30",
        "ip":"192.168.1.10"
    }
]
"""


def get_logged_in_users():

    try:

        command = [

            "who"

        ]

        result = run_command(command)

        if not result["success"]:

            return []

        users = []

        for line in output_to_list(result["output"]):

            columns = line.split()

            if len(columns) < 5:

                continue

            ip = ""

            if "(" in line and ")" in line:

                ip = line.split("(")[-1].replace(")", "")

            users.append({

                "user": columns[0],

                "terminal": columns[1],

                "login_time":

                    " ".join(columns[2:4]),

                "ip": ip

            })

        return users

    except Exception as e:

        logger.error(

            f"Logged-in user collection failed: {e}"

        )

        return []


# ============================================================
# Recently Logged-in Users
# ============================================================

"""
Collect recent login events.

Returns

[
    {
        "timestamp":"...",
        "source":"login",
        "message":"ubuntu pts/0 ..."
    }
]
"""


def get_recent_login_events(lines=DEFAULT_LOG_LINES):

    try:

        sessions = get_login_sessions(lines)

        events = []

        for session in sessions:

            events.append(

                create_log_entry(

                    source="login",

                    message=session["message"]

                )

            )

        return events

    except Exception as e:

        logger.error(

            f"Recent login event collection failed: {e}"

        )

        return []


# ============================================================
# User Session Duration
# ============================================================

"""
Returns

[
    {
        "user":"ubuntu",
        "terminal":"pts/0",
        "login_time":"Jul 20 08:20"
    }
]

Current implementation returns
active session information.
"""


def get_user_session_duration():

    try:

        users = get_logged_in_users()

        durations = []

        for user in users:

            durations.append({

                "user": user["user"],

                "terminal": user["terminal"],

                "login_time": user["login_time"]

            })

        return durations

    except Exception as e:

        logger.error(

            f"User session duration collection failed: {e}"

        )

        return []


# ============================================================
# User Session Statistics
# ============================================================

"""
Returns

{

    "active_users":2,

    "login_history":40,

    "recent_logins":15,

    "cron_entries":25

}
"""


def get_user_session_statistics():

    try:

        active = get_logged_in_users()

        history = get_login_sessions()

        recent = get_recent_login_events()

        cron = get_cron_logs()

        return {

            "active_users":

                len(active),

            "login_history":

                len(history),

            "recent_logins":

                len(recent),

            "cron_entries":

                len(cron)

        }

    except Exception as e:

        logger.error(

            f"User session statistics failed: {e}"

        )

        return {}
    

    # ============================================================
# Security Events
# ============================================================

"""
Collect security-related events from authentication logs.

Searches for

Failed password
authentication failure
invalid user
sudo
permission denied
pam_unix

Returns

[
    {
        "timestamp":"...",
        "source":"security",
        "message":"Failed password for root..."
    }
]
"""


def get_security_events(lines=DEFAULT_LOG_LINES):

    keywords = [

        "failed password",

        "authentication failure",

        "invalid user",

        "permission denied",

        "sudo",

        "pam_unix",

        "authentication",

        "denied"

    ]

    try:

        auth_logs = get_auth_logs(lines * 5)

        events = []

        for log in auth_logs:

            message = log["message"].lower()

            if any(

                keyword in message

                for keyword in keywords

            ):

                events.append(

                    create_log_entry(

                        source="security",

                        message=log["message"],

                        timestamp=log["timestamp"]

                    )

                )

        return events[-lines:]

    except Exception as e:

        logger.error(

            f"Security event collection failed: {e}"

        )

        return []


# ============================================================
# OOM Killer Logs
# ============================================================

"""
Collect Out-Of-Memory killer events.

Searches kernel logs for

Out of memory
Killed process
oom-killer

Returns

[
    {
        "timestamp":"...",
        "source":"oom",
        "message":"Killed process 1234 (python)..."
    }
]
"""


def get_oom_killer_logs(lines=DEFAULT_LOG_LINES):

    keywords = [

        "out of memory",

        "oom",

        "oom-killer",

        "killed process"

    ]

    try:

        kernel_logs = get_kernel_logs(lines * 10)

        events = []

        for log in kernel_logs:

            message = log["message"].lower()

            if any(

                keyword in message

                for keyword in keywords

            ):

                events.append(

                    create_log_entry(

                        source="oom",

                        message=log["message"],

                        timestamp=log["timestamp"]

                    )

                )

        return events[-lines:]

    except Exception as e:

        logger.error(

            f"OOM log collection failed: {e}"

        )

        return []


# ============================================================
# Permission Denied Logs
# ============================================================

"""
Collect permission denied events.

Returns

[
    {
        "timestamp":"...",
        "source":"permission_denied",
        "message":"Permission denied..."
    }
]
"""


def get_permission_denied_logs(lines=DEFAULT_LOG_LINES):

    try:

        auth_logs = get_auth_logs(lines * 5)

        events = []

        for log in auth_logs:

            if "permission denied" in log["message"].lower():

                events.append(

                    create_log_entry(

                        source="permission_denied",

                        message=log["message"],

                        timestamp=log["timestamp"]

                    )

                )

        return events[-lines:]

    except Exception as e:

        logger.error(

            f"Permission denied collection failed: {e}"

        )

        return []


# ============================================================
# Sudo Activity
# ============================================================

"""
Collect sudo command executions.

Returns

[
    {
        "timestamp":"...",
        "source":"sudo",
        "message":"sudo: ubuntu ..."
    }
]
"""


def get_sudo_activity(lines=DEFAULT_LOG_LINES):

    try:

        auth_logs = get_auth_logs(lines * 5)

        sudo_logs = []

        for log in auth_logs:

            if "sudo" in log["message"].lower():

                sudo_logs.append(

                    create_log_entry(

                        source="sudo",

                        message=log["message"],

                        timestamp=log["timestamp"]

                    )

                )

        return sudo_logs[-lines:]

    except Exception as e:

        logger.error(

            f"Sudo activity collection failed: {e}"

        )

        return []


# ============================================================
# Privilege Escalation Events
# ============================================================

"""
Collect privilege escalation attempts.

Searches for

sudo
su:
session opened
session closed

Returns

[
    {
        "timestamp":"...",
        "source":"privilege",
        "message":"sudo: ubuntu ..."
    }
]
"""


def get_privilege_escalation_events(lines=DEFAULT_LOG_LINES):

    keywords = [

        "sudo",

        "su:",

        "session opened",

        "session closed"

    ]

    try:

        auth_logs = get_auth_logs(lines * 5)

        events = []

        for log in auth_logs:

            message = log["message"].lower()

            if any(

                keyword in message

                for keyword in keywords

            ):

                events.append(

                    create_log_entry(

                        source="privilege",

                        message=log["message"],

                        timestamp=log["timestamp"]

                    )

                )

        return events[-lines:]

    except Exception as e:

        logger.error(

            f"Privilege escalation collection failed: {e}"

        )

        return []


# ============================================================
# Authentication Failure Events
# ============================================================

"""
Collect authentication failures only.

Returns

[
    {
        "timestamp":"...",
        "source":"authentication_failure",
        "message":"Failed password..."
    }
]
"""


def get_authentication_failures(lines=DEFAULT_LOG_LINES):

    try:

        failed = get_failed_login_attempts(lines)

        failures = []

        for log in failed:

            failures.append(

                create_log_entry(

                    source="authentication_failure",

                    message=log["message"],

                    timestamp=log["timestamp"]

                )

            )

        return failures

    except Exception as e:

        logger.error(

            f"Authentication failure collection failed: {e}"

        )

        return []


# ============================================================
# Security Statistics
# ============================================================

"""
Returns

{

    "security_events":45,

    "oom_events":2,

    "permission_denied":6,

    "sudo_activity":18,

    "privilege_events":12,

    "authentication_failures":8

}
"""


def get_security_statistics():

    try:

        security = get_security_events()

        oom = get_oom_killer_logs()

        permission = get_permission_denied_logs()

        sudo = get_sudo_activity()

        privilege = get_privilege_escalation_events()

        failures = get_authentication_failures()

        return {

            "security_events":

                len(security),

            "oom_events":

                len(oom),

            "permission_denied":

                len(permission),

            "sudo_activity":

                len(sudo),

            "privilege_events":

                len(privilege),

            "authentication_failures":

                len(failures)

        }

    except Exception as e:

        logger.error(

            f"Security statistics failed: {e}"

        )

        return {}


        # ============================================================
# Filesystem Error Logs
# ============================================================

"""
Collect filesystem-related error logs.

Searches kernel logs for

EXT4
XFS
BTRFS
filesystem
fs error

Returns

[
    {
        "timestamp":"...",
        "source":"filesystem",
        "message":"EXT4-fs error..."
    }
]
"""


def get_filesystem_error_logs(lines=DEFAULT_LOG_LINES):

    keywords = [

        "ext4",

        "xfs",

        "btrfs",

        "filesystem",

        "fs error",

        "superblock",

        "inode",

        "mount failed"

    ]

    try:

        kernel_logs = get_kernel_logs(lines * 10)

        filesystem_logs = []

        for log in kernel_logs:

            message = log["message"].lower()

            if any(

                keyword in message

                for keyword in keywords

            ):

                filesystem_logs.append(

                    create_log_entry(

                        source="filesystem",

                        message=log["message"],

                        timestamp=log["timestamp"]

                    )

                )

        return filesystem_logs[-lines:]

    except Exception as e:

        logger.error(

            f"Filesystem log collection failed: {e}"

        )

        return []


# ============================================================
# Disk Error Logs
# ============================================================

"""
Collect disk I/O related errors.

Searches for

I/O error
Buffer I/O
Read error
Write error

Returns

[
    {
        "timestamp":"...",
        "source":"disk_error",
        "message":"I/O error on nvme0n1..."
    }
]
"""


def get_disk_error_logs(lines=DEFAULT_LOG_LINES):

    keywords = [

        "i/o error",

        "buffer i/o",

        "read error",

        "write error",

        "media error",

        "disk failure"

    ]

    try:

        kernel_logs = get_kernel_logs(lines * 10)

        errors = []

        for log in kernel_logs:

            message = log["message"].lower()

            if any(

                keyword in message

                for keyword in keywords

            ):

                errors.append(

                    create_log_entry(

                        source="disk_error",

                        message=log["message"],

                        timestamp=log["timestamp"]

                    )

                )

        return errors[-lines:]

    except Exception as e:

        logger.error(

            f"Disk error collection failed: {e}"

        )

        return []


# ============================================================
# Hardware Error Logs
# ============================================================

"""
Collect hardware-related error logs.

Searches for

CPU
memory
PCI
hardware
thermal
machine check

Returns

[
    {
        "timestamp":"...",
        "source":"hardware",
        "message":"Machine Check Exception..."
    }
]
"""


def get_hardware_error_logs(lines=DEFAULT_LOG_LINES):

    keywords = [

        "hardware",

        "machine check",

        "mce",

        "thermal",

        "cpu",

        "memory",

        "pci",

        "firmware"

    ]

    try:

        kernel_logs = get_kernel_logs(lines * 10)

        hardware_logs = []

        for log in kernel_logs:

            message = log["message"].lower()

            if any(

                keyword in message

                for keyword in keywords

            ):

                hardware_logs.append(

                    create_log_entry(

                        source="hardware",

                        message=log["message"],

                        timestamp=log["timestamp"]

                    )

                )

        return hardware_logs[-lines:]

    except Exception as e:

        logger.error(

            f"Hardware log collection failed: {e}"

        )

        return []


# ============================================================
# Storage Warning Logs
# ============================================================

"""
Collect storage warning events.

Searches for

warning
degraded
readonly
remount
bad block

Returns

[
    {
        "timestamp":"...",
        "source":"storage_warning",
        "message":"Filesystem remounted read-only..."
    }
]
"""


def get_storage_warning_logs(lines=DEFAULT_LOG_LINES):

    keywords = [

        "warning",

        "degraded",

        "readonly",

        "read-only",

        "remount",

        "bad block",

        "smart"

    ]

    try:

        kernel_logs = get_kernel_logs(lines * 10)

        warnings = []

        for log in kernel_logs:

            message = log["message"].lower()

            if any(

                keyword in message

                for keyword in keywords

            ):

                warnings.append(

                    create_log_entry(

                        source="storage_warning",

                        message=log["message"],

                        timestamp=log["timestamp"]

                    )

                )

        return warnings[-lines:]

    except Exception as e:

        logger.error(

            f"Storage warning collection failed: {e}"

        )

        return []


# ============================================================
# Mount Events
# ============================================================

"""
Collect mount/unmount events.

Returns

[
    {
        "timestamp":"...",
        "source":"mount",
        "message":"Mounted /dev/sda1..."
    }
]
"""


def get_mount_events(lines=DEFAULT_LOG_LINES):

    keywords = [

        "mounted",

        "unmounted",

        "mount",

        "umount"

    ]

    try:

        journal_logs = get_system_journal_logs(lines * 5)

        events = []

        for log in journal_logs:

            message = log["message"].lower()

            if any(

                keyword in message

                for keyword in keywords

            ):

                events.append(

                    create_log_entry(

                        source="mount",

                        message=log["message"],

                        timestamp=log["timestamp"]

                    )

                )

        return events[-lines:]

    except Exception as e:

        logger.error(

            f"Mount event collection failed: {e}"

        )

        return []


# ============================================================
# Filesystem Statistics
# ============================================================

"""
Returns

{

    "filesystem_errors":4,

    "disk_errors":1,

    "hardware_errors":0,

    "storage_warnings":2,

    "mount_events":12

}
"""


def get_filesystem_statistics():

    try:

        filesystem = get_filesystem_error_logs()

        disk = get_disk_error_logs()

        hardware = get_hardware_error_logs()

        storage = get_storage_warning_logs()

        mounts = get_mount_events()

        return {

            "filesystem_errors":

                len(filesystem),

            "disk_errors":

                len(disk),

            "hardware_errors":

                len(hardware),

            "storage_warnings":

                len(storage),

            "mount_events":

                len(mounts)

        }

    except Exception as e:

        logger.error(

            f"Filesystem statistics failed: {e}"

        )

        return {}


        # ============================================================
# Network Error Logs
# ============================================================

"""
Collect network-related error logs.

Searches kernel and system journal for network failures.

Returns

[
    {
        "timestamp":"...",
        "source":"network",
        "message":"eth0: Link is Down"
    }
]
"""


def get_network_error_logs(lines=DEFAULT_LOG_LINES):

    keywords = [

        "network",

        "link is down",

        "connection refused",

        "connection timed out",

        "network unreachable",

        "dhcp",

        "ethernet",

        "interface",

        "route",

        "packet loss"

    ]

    try:

        logs = get_system_journal_logs(lines * 10)

        network_logs = []

        for log in logs:

            message = log["message"].lower()

            if any(

                keyword in message

                for keyword in keywords

            ):

                network_logs.append(

                    create_log_entry(

                        source="network",

                        message=log["message"],

                        timestamp=log["timestamp"]

                    )

                )

        return network_logs[-lines:]

    except Exception as e:

        logger.error(

            f"Network log collection failed: {e}"

        )

        return []


# ============================================================
# DNS Logs
# ============================================================

"""
Collect DNS-related log messages.

Returns

[
    {
        "timestamp":"...",
        "source":"dns",
        "message":"DNS lookup failed..."
    }
]
"""


def get_dns_logs(lines=DEFAULT_LOG_LINES):

    keywords = [

        "dns",

        "resolve",

        "resolved",

        "resolver",

        "lookup",

        "nameserver"

    ]

    try:

        logs = get_system_journal_logs(lines * 10)

        dns_logs = []

        for log in logs:

            message = log["message"].lower()

            if any(

                keyword in message

                for keyword in keywords

            ):

                dns_logs.append(

                    create_log_entry(

                        source="dns",

                        message=log["message"],

                        timestamp=log["timestamp"]

                    )

                )

        return dns_logs[-lines:]

    except Exception as e:

        logger.error(

            f"DNS log collection failed: {e}"

        )

        return []


# ============================================================
# Firewall Logs
# ============================================================

"""
Collect firewall events.

Searches for

iptables
ufw
firewalld
nftables

Returns

[
    {
        "timestamp":"...",
        "source":"firewall",
        "message":"UFW BLOCK..."
    }
]
"""


def get_firewall_logs(lines=DEFAULT_LOG_LINES):

    keywords = [

        "iptables",

        "ufw",

        "firewalld",

        "nft",

        "firewall",

        "blocked"

    ]

    try:

        logs = get_system_journal_logs(lines * 10)

        firewall_logs = []

        for log in logs:

            message = log["message"].lower()

            if any(

                keyword in message

                for keyword in keywords

            ):

                firewall_logs.append(

                    create_log_entry(

                        source="firewall",

                        message=log["message"],

                        timestamp=log["timestamp"]

                    )

                )

        return firewall_logs[-lines:]

    except Exception as e:

        logger.error(

            f"Firewall log collection failed: {e}"

        )

        return []


# ============================================================
# Application Logs
# ============================================================

"""
Collect common application logs.

Reads

/var/log/syslog

/var/log/messages

Returns

[
    {
        "timestamp":"...",
        "source":"application",
        "message":"Application log..."
    }
]
"""


def get_application_logs(lines=DEFAULT_LOG_LINES):

    logs = []

    try:

        for file_name in [

            "syslog",

            "messages"

        ]:

            log_file = COMMON_LOG_FILES.get(file_name)

            if not log_file:

                continue

            if not file_exists(log_file):

                continue

            for line in read_log_file(

                log_file,

                lines

            ):

                logs.append(

                    create_log_entry(

                        source="application",

                        message=line

                    )

                )

        return logs[-lines:]

    except Exception as e:

        logger.error(

            f"Application log collection failed: {e}"

        )

        return []


# ============================================================
# Application Error Logs
# ============================================================

"""
Collect application errors.

Searches for

error
exception
failed
critical
fatal

Returns

[
    {
        "timestamp":"...",
        "source":"application_error",
        "message":"Python Exception..."
    }
]
"""


def get_application_error_logs(lines=DEFAULT_LOG_LINES):

    keywords = [

        "error",

        "exception",

        "failed",

        "critical",

        "fatal",

        "traceback"

    ]

    try:

        logs = get_application_logs(lines * 10)

        errors = []

        for log in logs:

            message = log["message"].lower()

            if any(

                keyword in message

                for keyword in keywords

            ):

                errors.append(

                    create_log_entry(

                        source="application_error",

                        message=log["message"],

                        timestamp=log["timestamp"]

                    )

                )

        return errors[-lines:]

    except Exception as e:

        logger.error(

            f"Application error collection failed: {e}"

        )

        return []


# ============================================================
# Network Statistics
# ============================================================

"""
Returns

{

    "network_logs":25,

    "dns_logs":4,

    "firewall_logs":3,

    "application_logs":120,

    "application_errors":7

}
"""


def get_network_statistics():

    try:

        network = get_network_error_logs()

        dns = get_dns_logs()

        firewall = get_firewall_logs()

        applications = get_application_logs()

        app_errors = get_application_error_logs()

        return {

            "network_logs":

                len(network),

            "dns_logs":

                len(dns),

            "firewall_logs":

                len(firewall),

            "application_logs":

                len(applications),

            "application_errors":

                len(app_errors)

        }

    except Exception as e:

        logger.error(

            f"Network statistics failed: {e}"

        )

        return {}
    

    # ============================================================
# Log File Statistics
# ============================================================

"""
Collect information about all monitored Linux log files.

Returns

[
    {
        "name":"syslog",
        "path":"/var/log/syslog",
        "exists":True,
        "size_bytes":1048576,
        "size_mb":1.0,
        "modified":"2026-07-21T10:15:42",
        "readable":True
    }
]
"""


def get_log_file_statistics():

    try:

        statistics = []

        for name, path in COMMON_LOG_FILES.items():

            exists = file_exists(path)

            statistics.append({

                "name": name,

                "path": path,

                "exists": exists,

                "size_bytes":
                    get_file_size(path) if exists else 0,

                "size_mb":
                    bytes_to_mb(
                        get_file_size(path)
                    ) if exists else 0,

                "modified":
                    get_last_modified(path) if exists else None,

                "readable":
                    os.access(path, os.R_OK) if exists else False

            })

        return statistics

    except Exception as e:

        logger.error(

            f"Log file statistics collection failed: {e}"

        )

        return []


# ============================================================
# Large Log Files
# ============================================================

"""
Collect log files larger than the given size.

Default

100 MB

Returns

[
    {
        "name":"syslog",
        "size_mb":235.8
    }
]
"""


def get_large_log_files(max_size_mb=100):

    try:

        large_logs = []

        for log_file in get_log_file_statistics():

            if log_file["size_mb"] >= max_size_mb:

                large_logs.append(log_file)

        return large_logs

    except Exception as e:

        logger.error(

            f"Large log file collection failed: {e}"

        )

        return []


# ============================================================
# Missing Log Files
# ============================================================

"""
Collect missing log files.

Returns

[
    {
        "name":"messages",
        "path":"/var/log/messages"
    }
]
"""


def get_missing_log_files():

    try:

        missing = []

        for name, path in COMMON_LOG_FILES.items():

            if not file_exists(path):

                missing.append({

                    "name": name,

                    "path": path

                })

        return missing

    except Exception as e:

        logger.error(

            f"Missing log file collection failed: {e}"

        )

        return []


# ============================================================
# Recently Modified Log Files
# ============================================================

"""
Collect log files modified recently.

Default

Last 24 hours

Returns

[
    {
        "name":"syslog",
        "modified":"..."
    }
]
"""


def get_recently_modified_log_files(hours=24):

    try:

        recent = []

        current_time = time.time()

        for name, path in COMMON_LOG_FILES.items():

            if not file_exists(path):

                continue

            modified = os.path.getmtime(path)

            elapsed = (

                current_time -

                modified

            ) / 3600

            if elapsed <= hours:

                recent.append({

                    "name": name,

                    "path": path,

                    "modified":
                        get_last_modified(path)

                })

        return recent

    except Exception as e:

        logger.error(

            f"Recent log collection failed: {e}"

        )

        return []


# ============================================================
# Empty Log Files
# ============================================================

"""
Collect empty log files.

Returns

[
    {
        "name":"cron",
        "path":"/var/log/cron"
    }
]
"""


def get_empty_log_files():

    try:

        empty = []

        for name, path in COMMON_LOG_FILES.items():

            if not file_exists(path):

                continue

            if get_file_size(path) == 0:

                empty.append({

                    "name": name,

                    "path": path

                })

        return empty

    except Exception as e:

        logger.error(

            f"Empty log collection failed: {e}"

        )

        return []


# ============================================================
# Log Directory Statistics
# ============================================================

"""
Returns

{

    "total_log_files":7,

    "existing_log_files":6,

    "missing_log_files":1,

    "large_log_files":0,

    "empty_log_files":0,

    "recently_modified":5

}
"""


def get_log_directory_statistics():

    try:

        total = len(COMMON_LOG_FILES)

        existing = len(

            get_log_file_statistics()

        ) - len(

            get_missing_log_files()

        )

        missing = len(

            get_missing_log_files()

        )

        large = len(

            get_large_log_files()

        )

        empty = len(

            get_empty_log_files()

        )

        recent = len(

            get_recently_modified_log_files()

        )

        return {

            "total_log_files":

                total,

            "existing_log_files":

                existing,

            "missing_log_files":

                missing,

            "large_log_files":

                large,

            "empty_log_files":

                empty,

            "recently_modified":

                recent

        }

    except Exception as e:

        logger.error(

            f"Log directory statistics failed: {e}"

        )

        return {}
    

    # ============================================================
# Complete Log Snapshot
# ============================================================

"""
Collect a complete snapshot of all Linux logs.

Returns

{

    "timestamp":"...",

    "hostname":"...",

    ...

}
"""


def get_logs_snapshot():

    snapshot = {

        # ====================================================
        # Host Information
        # ====================================================

        "timestamp":

            datetime.now().isoformat(),

        "hostname":

            socket.gethostname(),

        # ====================================================
        # Journal & Kernel
        # ====================================================

        "system_journal":

            get_system_journal_logs(),

        "kernel_logs":

            get_kernel_logs(),

        "kernel_errors":

            get_kernel_error_logs(),

        "journal_warnings":

            get_system_warning_logs(),

        "journal_statistics":

            get_journal_statistics(),

        # ====================================================
        # Authentication
        # ====================================================

        "authentication_logs":

            get_auth_logs(),

        "ssh_logs":

            get_ssh_logs(),

        "failed_login_attempts":

            get_failed_login_attempts(),

        "successful_login_attempts":

            get_successful_login_attempts(),

        "authentication_statistics":

            get_authentication_statistics(),

        # ====================================================
        # Services
        # ====================================================

        "service_logs":

            get_service_logs(),

        "running_services":

            get_running_services(),

        "failed_services":

            get_failed_services(),

        "service_status_changes":

            get_service_status_changes(),

        "service_restart_events":

            get_service_restart_events(),

        "service_statistics":

            get_service_statistics(),

        # ====================================================
        # Boot Information
        # ====================================================

        "boot_logs":

            get_boot_logs(),

        "previous_boot_logs":

            get_previous_boot_logs(),

        "boot_errors":

            get_boot_errors(),

        "reboot_history":

            get_reboot_history(),

        "shutdown_events":

            get_shutdown_events(),

        "boot_statistics":

            get_boot_statistics(),

        # ====================================================
        # User Sessions
        # ====================================================

        "cron_logs":

            get_cron_logs(),

        "login_sessions":

            get_login_sessions(),

        "logged_in_users":

            get_logged_in_users(),

        "recent_login_events":

            get_recent_login_events(),

        "user_session_duration":

            get_user_session_duration(),

        "user_session_statistics":

            get_user_session_statistics(),

        # ====================================================
        # Security
        # ====================================================

        "security_events":

            get_security_events(),

        "oom_killer_logs":

            get_oom_killer_logs(),

        "permission_denied_logs":

            get_permission_denied_logs(),

        "sudo_activity":

            get_sudo_activity(),

        "privilege_escalation_events":

            get_privilege_escalation_events(),

        "authentication_failures":

            get_authentication_failures(),

        "security_statistics":

            get_security_statistics(),

        # ====================================================
        # Filesystem & Hardware
        # ====================================================

        "filesystem_error_logs":

            get_filesystem_error_logs(),

        "disk_error_logs":

            get_disk_error_logs(),

        "hardware_error_logs":

            get_hardware_error_logs(),

        "storage_warning_logs":

            get_storage_warning_logs(),

        "mount_events":

            get_mount_events(),

        "filesystem_statistics":

            get_filesystem_statistics(),

        # ====================================================
        # Network & Applications
        # ====================================================

        "network_error_logs":

            get_network_error_logs(),

        "dns_logs":

            get_dns_logs(),

        "firewall_logs":

            get_firewall_logs(),

        "application_logs":

            get_application_logs(),

        "application_error_logs":

            get_application_error_logs(),

        "network_statistics":

            get_network_statistics(),

        # ====================================================
        # Log Files
        # ====================================================

        "log_file_statistics":

            get_log_file_statistics(),

        "large_log_files":

            get_large_log_files(),

        "missing_log_files":

            get_missing_log_files(),

        "recently_modified_log_files":

            get_recently_modified_log_files(),

        "empty_log_files":

            get_empty_log_files(),

        "log_directory_statistics":

            get_log_directory_statistics()

    }

    return snapshot


# ============================================================
# Continuous Log Monitoring
# ============================================================

"""
Continuously monitor Linux logs.

Every interval seconds:

1. Collect a complete log snapshot.
2. Write the snapshot into app.txt.
3. Repeat until interrupted.
"""


def monitor_logs_continuously(interval=5):

    logger.info(

        f"Linux log monitoring started "

        f"(every {interval} seconds)"

    )

    while True:

        try:

            snapshot = get_logs_snapshot()

            logger.info(

                f"Log snapshot collected at\n%s",

                json.dumps(

                    snapshot,

                    indent=4

                )

            )

            time.sleep(interval)

        except KeyboardInterrupt:

            logger.info(

                "Linux log monitoring stopped."

            )

            break

        except Exception as e:

            logger.error(

                f"Log monitoring failed: {e}"

            )

            time.sleep(interval)


# ============================================================
# Print Snapshot
# ============================================================

"""
Print one snapshot to the terminal.

Useful during development.
"""


def print_logs_snapshot():

    try:

        snapshot = get_logs_snapshot()

        print(

            json.dumps(

                snapshot,

                indent=4

            )

        )

    except Exception as e:

        logger.error(

            f"Snapshot printing failed: {e}"

        )


# ============================================================
# Save Snapshot
# ============================================================

"""
Save one snapshot into a JSON file.

Example

logs_snapshot.json
"""


def save_snapshot_to_json(

        filename="logs_snapshot.json"

):

    try:

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

            f"Snapshot saved to {filename}"

        )

    except Exception as e:

        logger.error(

            f"Unable to save snapshot: {e}"

        )


# ============================================================
# Health Check
# ============================================================

"""
Simple module health check.

Returns

True

if snapshot collection succeeds.
"""


def health_check():

    try:

        snapshot = get_logs_snapshot()

        return snapshot is not None

    except Exception:

        return False


# ============================================================
# Testing
# ============================================================

if __name__ == "__main__":

    logger.info(

        "Starting Linux Log Collector..."

    )

    if health_check():

        logger.info(

            "Health check successful."

        )

    else:

        logger.warning(

            "Health check failed."

        )

    # Print one snapshot to terminal
    print_logs_snapshot()

    # Save snapshot to JSON file
    save_snapshot_to_json()

    # Start continuous monitoring
    monitor_logs_continuously(interval=5)







