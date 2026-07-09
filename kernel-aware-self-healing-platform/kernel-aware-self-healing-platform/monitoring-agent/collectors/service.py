import subprocess


def collect_services():
    services = []

    result = subprocess.run(
        ["systemctl", "list-units", "--type=service", "--all", "--no-pager"],
        capture_output=True,
        text=True
    )

    lines = result.stdout.splitlines()

    for line in lines[1:]:
        parts = line.split()

        if len(parts) >= 4:
            services.append({
                "name": parts[0],
                "load": parts[1],
                "active": parts[2],
                "status": parts[3]
            })

    return services


def get_service(service_name):
    services = collect_services()

    for service in services:
        if service["name"] == service_name:
            return service

    return {"error": "Service not found"}


def get_running_services():
    services = collect_services()

    return [
        service
        for service in services
        if service["active"] == "active"
    ]


def get_failed_services():
    services = collect_services()

    return [
        service
        for service in services
        if service["active"] == "failed"
    ]


def get_inactive_services():
    services = collect_services()

    return [
        service
        for service in services
        if service["active"] == "inactive"
    ]


def print_services():
    services = collect_services()

    for service in services:
        print(
            service["name"] + "\n" +
            service["load"] + "\n" +
            service["active"] + "\n" +
            service["status"] + "\n"
        )


if __name__ == "__main__":
    print_services()