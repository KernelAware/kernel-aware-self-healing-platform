from get_metrics.prometheus_client import Gauge, Counter, generate_latest
from collectors.cpu import collect

# ─── CPU Usage ─────────────────────────────────────────────
cpu_usage_percent = Gauge(
    "cpu_usage_percent",
    "Overall CPU usage percentage"
)

# ─── CPU Cores ─────────────────────────────────────────────
cpu_physical_cores = Gauge(
    "cpu_physical_cores",
    "Number of physical CPU cores"
)

cpu_logical_cores = Gauge(
    "cpu_logical_cores",
    "Number of logical CPU cores"
)

cpu_core_usage_percent = Gauge(
    "cpu_core_usage_percent",
    "Per-core CPU usage percentage",
    ["core"]
)

# ─── CPU Load ──────────────────────────────────────────────
cpu_load_1min  = Gauge("cpu_load_1min",  "System load average - 1 minute")
cpu_load_5min  = Gauge("cpu_load_5min",  "System load average - 5 minutes")
cpu_load_15min = Gauge("cpu_load_15min", "System load average - 15 minutes")

# ─── CPU Frequency ─────────────────────────────────────────
cpu_freq_current_mhz = Gauge(
    "cpu_freq_current_mhz",
    "Current CPU frequency in MHz"
)

cpu_freq_min_mhz = Gauge(
    "cpu_freq_min_mhz",
    "Minimum CPU frequency in MHz"
)

cpu_freq_max_mhz = Gauge(
    "cpu_freq_max_mhz",
    "Maximum CPU frequency in MHz"
)

# ─── CPU Times ─────────────────────────────────────────────
cpu_times_user   = Gauge("cpu_times_user",   "CPU time in user mode %")
cpu_times_system = Gauge("cpu_times_system", "CPU time in system mode %")
cpu_times_idle   = Gauge("cpu_times_idle",   "CPU time idle %")
cpu_times_iowait = Gauge("cpu_times_iowait", "CPU time waiting for IO %")
cpu_times_steal  = Gauge("cpu_times_steal",  "CPU time stolen by hypervisor %")

# ─── CPU Stats ─────────────────────────────────────────────
cpu_ctx_switches    = Gauge("cpu_ctx_switches",    "Total CPU context switches")
cpu_interrupts      = Gauge("cpu_interrupts",      "Total CPU hardware interrupts")
cpu_soft_interrupts = Gauge("cpu_soft_interrupts", "Total CPU software interrupts")

# ─── Top Processes ─────────────────────────────────────────
cpu_top_process_count = Gauge(
    "cpu_top_process_count",
    "Number of processes actively using CPU"
)

cpu_top_process_usage = Gauge(
    "cpu_top_process_usage_percent",
    "CPU usage percent of top processes",
    ["pid", "name"]
)

cpu_top_process_memory_percent = Gauge(
    "cpu_top_process_memory_percent",
    "Memory usage percent of top CPU-consuming processes",
    ["pid", "name"]
)

cpu_top_process_status = Gauge(
    "cpu_top_process_status",
    "Status of top CPU-consuming processes (1 = active state present)",
    ["pid", "name", "status"]
)

def update_cpu_metrics():

    data = collect()

    if not data:
        return generate_latest().decode("utf-8")

    # Usage
    if data.get("usage") is not None:
        cpu_usage_percent.set(data["usage"])

    # Cores
    cores = data.get("cores", {})
    if cores.get("physical_cores") is not None:
        cpu_physical_cores.set(cores["physical_cores"])

    if cores.get("logical_cores") is not None:
        cpu_logical_cores.set(cores["logical_cores"])

    per_core = cores.get("per_core_usage", [])
    for index, usage in enumerate(per_core):
        cpu_core_usage_percent.labels(
            core=f"core_{index}"
        ).set(usage)

    # Load
    load = data.get("load", {})
    if load.get("1min") is not None:
        cpu_load_1min.set(load["1min"])
    if load.get("5min") is not None:
        cpu_load_5min.set(load["5min"])
    if load.get("15min") is not None:
        cpu_load_15min.set(load["15min"])

    # Frequency
    freq = data.get("frequency", {})
    if freq.get("current_mhz") is not None:
        cpu_freq_current_mhz.set(freq["current_mhz"])
    if freq.get("min_mhz") is not None:
        cpu_freq_min_mhz.set(freq["min_mhz"])
    if freq.get("max_mhz") is not None:
        cpu_freq_max_mhz.set(freq["max_mhz"])

    # CPU Times                                                 NEW
    times = data.get("times", {})
    if times.get("user") is not None:
        cpu_times_user.set(times["user"])
    if times.get("system") is not None:
        cpu_times_system.set(times["system"])
    if times.get("idle") is not None:
        cpu_times_idle.set(times["idle"])
    if times.get("iowait") is not None:
        cpu_times_iowait.set(times["iowait"])
    if times.get("steal") is not None:
        cpu_times_steal.set(times["steal"])

    # CPU Stats
    stats = data.get("stats", {})
    if stats.get("ctx_switches") is not None:
        cpu_ctx_switches.set(stats["ctx_switches"])
    if stats.get("interrupts") is not None:
        cpu_interrupts.set(stats["interrupts"])
    if stats.get("soft_interrupts") is not None:
        cpu_soft_interrupts.set(stats["soft_interrupts"])

    # Top Processes
    processes = data.get("processes", [])
    cpu_top_process_count.set(len(processes))

    for proc in processes:
        pid = str(proc.get("pid", 0))
        name = str(proc.get("name", "unknown"))

        cpu_top_process_usage.labels(
            pid=pid,
            name=name
        ).set(proc.get("cpu_percent", 0))

        cpu_top_process_memory_percent.labels(
            pid=pid,
            name=name
        ).set(proc.get("memory_percent", 0))

        cpu_top_process_status.labels(
            pid=pid,
            name=name,
            status=str(proc.get("status", "unknown"))
        ).set(1)

    return generate_latest().decode("utf-8")


if __name__ == "__main__":
    update_cpu_metrics()
    metrics = generate_latest()
    print(metrics.decode("utf-8"))