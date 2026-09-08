from prometheus_client import Gauge, generate_latest
from collectors.process import collect_processes, get_process_summary


process_total = Gauge("process_total", "Total processes")
process_idle = Gauge("process_idle", "idle processes")
process_running = Gauge("process_running", "Running processes")
process_sleeping = Gauge("process_sleeping", "Sleeping processes")
process_stopped = Gauge("process_stopped", "Stopped processes")
process_zombie = Gauge("process_zombie", "Zombie processes")

process_cpu = Gauge(
    "process_cpu_percent",
    "Process CPU usage percentage",
    ["pid", "name", "username"]
)

from prometheus_client import Gauge

process_status = Gauge(
    "process_status",
    "Individual process status (1 = process has this status)",
    ["pid", "name", "status"]
)

process_status_total = Gauge(
    "process_status_total",
    "Number of processes by status",
    ["status"]
)

process_memory_percent = Gauge(
    "process_memory_percent",
    "Process memory usage percentage",
    ["pid", "name"]
)


process_memory_rss = Gauge(
    "process_memory_rss_bytes",
    "Process resident memory usage",
    ["pid", "name"]
)


process_memory_vms = Gauge(
    "process_memory_vms_bytes",
    "Process virtual memory usage",
    ["pid", "name"]
)


process_uptime = Gauge(
    "process_uptime_seconds",
    "Process running time",
    ["pid", "name"]
)


process_threads = Gauge(
    "process_threads",
    "Number of threads used by process",
    ["pid", "name"]
)


process_disk_read = Gauge(
    "process_disk_read_bytes",
    "Process disk read bytes",
    ["pid", "name"]
)


process_disk_write = Gauge(
    "process_disk_write_bytes",
    "Process disk write bytes",
    ["pid", "name"]
)

process_disk_total = Gauge(
    "process_disk_total_rate_bytes_per_second",
    "Process total disk I/O rate",
    ["pid", "name"]
)

process_network_connections = Gauge(
    "process_network_connections",
    "Number of network send_decisions used by process",
    ["pid", "name"]
)


process_open_files = Gauge(
    "process_open_files",
    "Number of open files",
    ["pid", "name"]
)

previous_processes = {}

def update_process_metrics():
    global previous_processes

    processes = collect_processes()
    current_processes = {}


    for process in processes:

        pid = str(process["pid"])
        name = process["name"] or "unknown"

        current_processes[pid] = {
            "name": name,
            "username": process["username"],
            "status": process["status"]
        }

        process_cpu.labels(
            pid=pid,
            name=name,
            username=process["username"]
        ).set(
            process["cpu_percent"]
        )

        process_memory_percent.labels(
            pid=pid,
            name=name
        ).set(
            process["memory_percent"]
        )

        process_memory_rss.labels(
            pid=pid,
            name=name
        ).set(
            process["memory_rss_bytes"]
        )

        process_disk_total.labels(
            pid=pid,
            name=name
        ).set(
            process["disk_read_bytes"] + process["disk_write_bytes"]
        )

        process_memory_vms.labels(
            pid=pid,
            name=name
        ).set(
            process["memory_vms_bytes"]
        )

        process_uptime.labels(
            pid=pid,
            name=name
        ).set(
            process["uptime_seconds"]
        )

        process_threads.labels(
            pid=pid,
            name=name
        ).set(
            process["num_threads"]
        )

        process_disk_read.labels(
            pid=pid,
            name=name
        ).set(
            process["disk_read_bytes"]
        )

        process_disk_write.labels(
            pid=pid,
            name=name
        ).set(
            process["disk_write_bytes"]
        )

        process_network_connections.labels(
            pid=pid,
            name=name
        ).set(
            process["network_connections"]
        )

        process_open_files.labels(
            pid=pid,
            name=name
        ).set(
            process["open_files"]
        )

        process_status.labels(
            pid=pid,
            name=name,
            status=process["status"]
        ).set(1)

    disappeared = set(previous_processes.keys()) - set(current_processes.keys())

    for pid in disappeared:
        old = previous_processes[pid]

        process_cpu.remove(
            pid,
            old["name"],
            old["username"]
        )

        process_memory_percent.remove(
            pid,
            old["name"]
        )

        process_memory_rss.remove(
            pid,
            old["name"]
        )

        process_memory_vms.remove(
            pid,
            old["name"]
        )

        process_uptime.remove(
            pid,
            old["name"]
        )

        process_threads.remove(
            pid,
            old["name"]
        )

        process_disk_read.remove(
            pid,
            old["name"]
        )

        process_disk_write.remove(
            pid,
            old["name"]
        )

        process_disk_total.remove(
            pid,
            old["name"]
        )

        process_network_connections.remove(
            pid,
            old["name"]
        )

        process_open_files.remove(
            pid,
            old["name"]
        )

        process_status.remove(
            pid,
            old["name"],
            old["status"]
        )

    previous_processes = current_processes

    summary = get_process_summary()

    process_total.set(summary["total"])
    process_idle.set(summary["idle"])
    process_running.set(summary["running"])
    process_sleeping.set(summary["sleeping"])
    process_stopped.set(summary["stopped"])
    process_zombie.set(summary["zombie"])

    for status, value in summary.items():

        if status != "total":
            process_status_total.labels(
                status=status
            ).set(value)

    return generate_latest().decode("utf-8")

