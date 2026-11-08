import subprocess
import time
import psutil

from collectors.service_details.service_discovery import (
    recommendation_score
)


def get_services():
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
            text=True,
            check=True
        )

        for line in result.stdout.splitlines():
            parts = line.split(None, 4)

            if len(parts) < 4:
                continue

            service_name = parts[0]

            service = {
                "name": service_name,
                "load_state": parts[1],
                "active_state": parts[2],
                "sub_state": parts[3],
                "main_pid": 0,
                "cpu_percent": 0.0,
                "memory_percent": 0.0,
                "uptime_seconds": 0.0,
                "protected": False
            }

            # Get service main PID
            details = subprocess.run(
                [
                    "systemctl",
                    "show",
                    service_name,
                    "--no-pager",
                    "--property=MainPID",
                ],
                capture_output=True,
                text=True,
                check=False
            )

            for item in details.stdout.splitlines():
                if item.startswith("MainPID="):
                    try:
                        service["main_pid"] = int(
                            item.split("=", 1)[1]
                        )
                    except ValueError:
                        service["main_pid"] = 0

            # Collect metrics from the main process
            main_pid = service["main_pid"]

            if main_pid > 0:
                try:
                    process = psutil.Process(main_pid)

                    # Initialize CPU measurement
                    process.cpu_percent(interval=None)

                    with process.oneshot():
                        service["memory_percent"] = round(
                            process.memory_percent(), 2
                        )

                        service["uptime_seconds"] = round(
                            max(
                                0.0,
                                time.time() - process.create_time()
                            ),
                            2
                        )

                    # Measure CPU usage
                    service["cpu_percent"] = round(
                        process.cpu_percent(interval=0.1), 2
                    )

                except (
                    psutil.NoSuchProcess,
                    psutil.AccessDenied,
                    psutil.ZombieProcess
                ):
                    pass

            score = recommendation_score(service)

            service["recommendation_score"] = score
            service["recommended"] = score >= 3

            services.append(service)

    except (subprocess.SubprocessError, OSError):
        return []

    return services
