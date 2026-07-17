
from prometheus_client import Gauge, generate_latest

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
cpu_load_1min = Gauge("cpu_load_1min", "System load average - 1 minute")
cpu_load_5min = Gauge("cpu_load_5min", "System load average - 5 minutes")
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
        cpu_core_usage_percent.labels(core=f"core_{index}").set(usage)

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

    return generate_latest().decode("utf-8")


if __name__ == "__main__":
    update_cpu_metrics()
    metrics = generate_latest()
    print(metrics.decode("utf-8"))