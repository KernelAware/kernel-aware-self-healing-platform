import subprocess
import psutil
import time


def collect_services():

    services = []

    try:
        result = subprocess.run(
            [
                "systemctl",
                "list-units",
                "--type=service",
                "--all",
                "--no-legend",
                "--no-pager"
            ],
            capture_output=True,
            text=True
        )

        for line in result.stdout.splitlines():

            if not line.strip():
                continue

            service_name = line.split()[0]

            try:
                show = subprocess.run(
                    [
                        "systemctl",
                        "show",
                        service_name,
                        "--property=MainPID",
                        "--property=ActiveState",
                        "--property=UnitFileState"
                    ],
                    capture_output=True,
                    text=True
                )

                properties = {}

                for item in show.stdout.splitlines():
                    key, value = item.split("=", 1)
                    properties[key] = value


                pid = int(properties.get("MainPID", "0"))

                status = properties.get(
                    "ActiveState",
                    "unknown"
                ).capitalize()

                startup = properties.get(
                    "UnitFileState",
                    "unknown"
                ).capitalize()


                username = "-"
                cpu = 0.0
                memory = 0
                uptime = 0


                if pid > 0:

                    process = psutil.Process(pid)

                    username = process.username()

                    cpu = process.cpu_percent(None) / psutil.cpu_count()

                    memory = process.memory_info().rss

                    uptime = time.time() - process.create_time()


                services.append(
                    {
                        "service_name": service_name.replace(".service", ""),
                        "status": status,
                        "startup_type": startup,
                        "main_pid": pid,
                        "user": username,
                        "cpu_percent": cpu,
                        "memory_rss_bytes": memory,
                        "uptime_seconds": uptime,
                    }
                )

            except Exception as e:
                print("systemctl error:", e)

    except Exception as e:
        print("systemctl error:", e)

    print(services)
    return services

def get_service_summary(services):

    summary = {
        "total": 0,
        "active": 0,
        "inactive": 0,
        "failed": 0,
        "unknown": 0
    }

    summary["total"] = len(services)

    for service in services:

        status = service["status"].lower()

        if status == "active":
            summary["active"] += 1

        elif status == "inactive":
            summary["inactive"] += 1

        elif status == "failed":
            summary["failed"] += 1

        else:
            summary["unknown"] += 1

    return summary