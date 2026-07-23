from prometheus_client import Gauge

from collectors.memory import get_memory_metrics


# RAM metrics
memory_total = Gauge(
    "system_memory_total_bytes",
    "Total physical memory in bytes"
)

memory_available = Gauge(
    "system_memory_available_bytes",
    "Available physical memory in bytes"
)

memory_used = Gauge(
    "system_memory_used_bytes",
    "Used physical memory in bytes"
)

memory_free = Gauge(
    "system_memory_free_bytes",
    "Free physical memory in bytes"
)

memory_usage_percent = Gauge(
    "system_memory_usage_percent",
    "Current physical memory usage percentage"
)


# Swap metrics
swap_total = Gauge(
    "system_swap_total_bytes",
    "Total swap memory in bytes"
)

swap_used = Gauge(
    "system_swap_used_bytes",
    "Used swap memory in bytes"
)

swap_free = Gauge(
    "system_swap_free_bytes",
    "Free swap memory in bytes"
)

swap_usage_percent = Gauge(
    "system_swap_usage_percent",
    "Current swap usage percentage"
)


def update_memory_metrics():

    data = get_memory_metrics()

    print(data)

    # RAM
    memory_total.set(data["memory"]["total_bytes"])
    memory_available.set(data["memory"]["available_bytes"])
    memory_used.set(data["memory"]["used_bytes"])
    memory_free.set(data["memory"]["free_bytes"])
    memory_usage_percent.set(data["memory"]["usage_percent"])

    # Swap
    swap_total.set(data["swap"]["total_bytes"])
    swap_used.set(data["swap"]["used_bytes"])
    swap_free.set(data["swap"]["free_bytes"])
    swap_usage_percent.set(data["swap"]["usage_percent"])

if __name__ == "__main__":
    update_memory_metrics()