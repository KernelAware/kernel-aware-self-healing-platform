from prometheus_client import Gauge
from prometheus_client import generate_latest

from collectors.disk import get_disk_stats_snapshot


# ============================================================
# Storage Usage
# ============================================================

disk_total_bytes = Gauge(
    "disk_total_bytes",
    "Total size of mounted partition in bytes",
    ["device", "mountpoint", "filesystem"]
)

disk_used_bytes = Gauge(
    "disk_used_bytes",
    "Used space of mounted partition in bytes",
    ["device", "mountpoint", "filesystem"]
)

disk_free_bytes = Gauge(
    "disk_free_bytes",
    "Free space of mounted partition in bytes",
    ["device", "mountpoint", "filesystem"]
)

disk_usage_percent = Gauge(
    "disk_usage_percent",
    "Disk usage percentage",
    ["device", "mountpoint", "filesystem"]
)


# ============================================================
# Mounted Partition Information
# ============================================================

disk_partition_info = Gauge(
    "disk_partition_info",
    "Mounted partition information",
    ["device", "mountpoint", "filesystem", "options"]
)


# ============================================================
# Overall IO Counters
# ============================================================

disk_read_bytes_total = Gauge(
    "disk_read_bytes_total",
    "Total bytes read since boot"
)

disk_write_bytes_total = Gauge(
    "disk_write_bytes_total",
    "Total bytes written since boot"
)

disk_read_operations_total = Gauge(
    "disk_read_operations_total",
    "Total read operations since boot"
)

disk_write_operations_total = Gauge(
    "disk_write_operations_total",
    "Total write operations since boot"
)

disk_read_time_ms_total = Gauge(
    "disk_read_time_ms_total",
    "Total read time in milliseconds"
)

disk_write_time_ms_total = Gauge(
    "disk_write_time_ms_total",
    "Total write time in milliseconds"
)

disk_busy_time_ms_total = Gauge(
    "disk_busy_time_ms_total",
    "Total busy time in milliseconds"
)


# ============================================================
# Per Disk IO Counters
# ============================================================

disk_perdisk_read_bytes_total = Gauge(
    "disk_perdisk_read_bytes_total",
    "Per disk read bytes",
    ["disk"]
)

disk_perdisk_write_bytes_total = Gauge(
    "disk_perdisk_write_bytes_total",
    "Per disk write bytes",
    ["disk"]
)

disk_perdisk_read_operations_total = Gauge(
    "disk_perdisk_read_operations_total",
    "Per disk read operations",
    ["disk"]
)

disk_perdisk_write_operations_total = Gauge(
    "disk_perdisk_write_operations_total",
    "Per disk write operations",
    ["disk"]
)

disk_perdisk_read_time_ms_total = Gauge(
    "disk_perdisk_read_time_ms_total",
    "Per disk read time",
    ["disk"]
)

disk_perdisk_write_time_ms_total = Gauge(
    "disk_perdisk_write_time_ms_total",
    "Per disk write time",
    ["disk"]
)

disk_perdisk_busy_time_ms_total = Gauge(
    "disk_perdisk_busy_time_ms_total",
    "Per disk busy time",
    ["disk"]
)


# ============================================================
# Throughput
# ============================================================

disk_read_speed_bps = Gauge(
    "disk_read_speed_bps",
    "Overall read speed in Bytes/s"
)

disk_write_speed_bps = Gauge(
    "disk_write_speed_bps",
    "Overall write speed in Bytes/s"
)

disk_read_speed_mb = Gauge(
    "disk_read_speed_mb",
    "Overall read speed in MB/s"
)

disk_write_speed_mb = Gauge(
    "disk_write_speed_mb",
    "Overall write speed in MB/s"
)


# ============================================================
# Per Disk Throughput
# ============================================================

disk_perdisk_read_speed_bps = Gauge(
    "disk_perdisk_read_speed_bps",
    "Per disk read speed in Bytes/s",
    ["disk"]
)

disk_perdisk_write_speed_bps = Gauge(
    "disk_perdisk_write_speed_bps",
    "Per disk write speed in Bytes/s",
    ["disk"]
)

disk_perdisk_read_speed_mb = Gauge(
    "disk_perdisk_read_speed_mb",
    "Per disk read speed in MB/s",
    ["disk"]
)

disk_perdisk_write_speed_mb = Gauge(
    "disk_perdisk_write_speed_mb",
    "Per disk write speed in MB/s",
    ["disk"]
)


# ============================================================
# Overall IOPS
# ============================================================

disk_read_iops = Gauge(
    "disk_read_iops",
    "Overall read IOPS"
)

disk_write_iops = Gauge(
    "disk_write_iops",
    "Overall write IOPS"
)

disk_total_iops = Gauge(
    "disk_total_iops",
    "Overall total IOPS"
)


# ============================================================
# Per Disk IOPS
# ============================================================

disk_perdisk_read_iops = Gauge(
    "disk_perdisk_read_iops",
    "Per disk read IOPS",
    ["disk"]
)

disk_perdisk_write_iops = Gauge(
    "disk_perdisk_write_iops",
    "Per disk write IOPS",
    ["disk"]
)

disk_perdisk_total_iops = Gauge(
    "disk_perdisk_total_iops",
    "Per disk total IOPS",
    ["disk"]
)


# ============================================================
# Overall Latency
# ============================================================

disk_read_latency_ms = Gauge(
    "disk_read_latency_ms",
    "Average read latency",
)

disk_write_latency_ms = Gauge(
    "disk_write_latency_ms",
    "Average write latency",
)


# ============================================================
# Per Disk Latency
# ============================================================

disk_perdisk_read_latency_ms = Gauge(
    "disk_perdisk_read_latency_ms",
    "Per disk read latency",
    ["disk"]
)

disk_perdisk_write_latency_ms = Gauge(
    "disk_perdisk_write_latency_ms",
    "Per disk write latency",
    ["disk"]
)


# ============================================================
# Overall Busy
# ============================================================

disk_busy_time_ms = Gauge(
    "disk_busy_time_ms",
    "Busy time during interval"
)

disk_busy_percentage = Gauge(
    "disk_busy_percentage",
    "Busy percentage"
)


# ============================================================
# Per Disk Busy
# ============================================================

disk_perdisk_busy_time_ms = Gauge(
    "disk_perdisk_busy_time_ms",
    "Per disk busy time",
    ["disk"]
)

disk_perdisk_busy_percentage = Gauge(
    "disk_perdisk_busy_percentage",
    "Per disk busy percentage",
    ["disk"]
)

def update_disk_metrics():

    disk = get_disk_stats_snapshot()

    # ============================================================
    # Storage Usage
    # ============================================================

    for partition in disk["disk_usage"]:

        labels = {
            "device": partition["device"],
            "mountpoint": partition["mountpoint"],
            "filesystem": partition["filesystem"]
        }

        disk_total_bytes.labels(**labels).set(
            partition["total_bytes"]
        )

        disk_used_bytes.labels(**labels).set(
            partition["used_bytes"]
        )

        disk_free_bytes.labels(**labels).set(
            partition["free_bytes"]
        )

        disk_usage_percent.labels(**labels).set(
            partition["usage_percent"]
        )


    # ============================================================
    # Mounted Partitions
    # ============================================================

    for partition in disk["mounted_partitions"]:

        disk_partition_info.labels(
            device=partition["device"],
            mountpoint=partition["mountpoint"],
            filesystem=partition["filesystem"],
            options=partition["options"]
        ).set(1)


    # ============================================================
    # Overall IO Counters
    # ============================================================

    io = disk["io_counters"]

    if io:

        disk_read_bytes_total.set(
            io["read_bytes"]
        )

        disk_write_bytes_total.set(
            io["write_bytes"]
        )

        disk_read_operations_total.set(
            io["read_count"]
        )

        disk_write_operations_total.set(
            io["write_count"]
        )

        disk_read_time_ms_total.set(
            io["read_time_ms"]
        )

        disk_write_time_ms_total.set(
            io["write_time_ms"]
        )

        disk_busy_time_ms_total.set(
            io["busy_time_ms"]
        )


    # ============================================================
    # Per Disk IO Counters
    # ============================================================

    for disk_name, values in disk["io_counters perdisk"].items():

        disk_perdisk_read_bytes_total.labels(
            disk=disk_name
        ).set(
            values["read_bytes"]
        )

        disk_perdisk_write_bytes_total.labels(
            disk=disk_name
        ).set(
            values["write_bytes"]
        )

        disk_perdisk_read_operations_total.labels(
            disk=disk_name
        ).set(
            values["read_count"]
        )

        disk_perdisk_write_operations_total.labels(
            disk=disk_name
        ).set(
            values["write_count"]
        )

        disk_perdisk_read_time_ms_total.labels(
            disk=disk_name
        ).set(
            values["read_time_ms"]
        )

        disk_perdisk_write_time_ms_total.labels(
            disk=disk_name
        ).set(
            values["write_time_ms"]
        )

        disk_perdisk_busy_time_ms_total.labels(
            disk=disk_name
        ).set(
            values["busy_time_ms"]
        )


    # ============================================================
    # Overall Throughput
    # ============================================================

    throughput = disk["throughput"]

    if throughput:

        disk_read_speed_bps.set(
            throughput["read_speed_bps"]
        )

        disk_write_speed_bps.set(
            throughput["write_speed_bps"]
        )

        disk_read_speed_mb.set(
            throughput["read_speed_mb"]
        )

        disk_write_speed_mb.set(
            throughput["write_speed_mb"]
        )


    # ============================================================
    # Per Disk Throughput
    # ============================================================

    for disk_name, values in disk["throughput perdisk"].items():

        disk_perdisk_read_speed_bps.labels(
            disk=disk_name
        ).set(
            values["read_speed_bps"]
        )

        disk_perdisk_write_speed_bps.labels(
            disk=disk_name
        ).set(
            values["write_speed_bps"]
        )

        disk_perdisk_read_speed_mb.labels(
            disk=disk_name
        ).set(
            values["read_speed_mb"]
        )

        disk_perdisk_write_speed_mb.labels(
            disk=disk_name
        ).set(
            values["write_speed_mb"]
        )


            # ============================================================
    # Overall IOPS
    # ============================================================

    iops = disk["iops"]

    if iops:

        disk_read_iops.set(
            iops["read_iops"]
        )

        disk_write_iops.set(
            iops["write_iops"]
        )

        disk_total_iops.set(
            iops["total_iops"]
        )


    # ============================================================
    # Per Disk IOPS
    # ============================================================

    for disk_name, values in disk["iops perdisk"].items():

        disk_perdisk_read_iops.labels(
            disk=disk_name
        ).set(
            values["read_iops"]
        )

        disk_perdisk_write_iops.labels(
            disk=disk_name
        ).set(
            values["write_iops"]
        )

        disk_perdisk_total_iops.labels(
            disk=disk_name
        ).set(
            values["total_iops"]
        )


    # ============================================================
    # Overall Latency
    # ============================================================

    latency = disk["latency"]

    if latency:

        disk_read_latency_ms.set(
            latency["read_latency_ms"]
        )

        disk_write_latency_ms.set(
            latency["write_latency_ms"]
        )


    # ============================================================
    # Per Disk Latency
    # ============================================================

    for disk_name, values in disk["latency perdisk"].items():

        disk_perdisk_read_latency_ms.labels(
            disk=disk_name
        ).set(
            values["read_latency_ms"]
        )

        disk_perdisk_write_latency_ms.labels(
            disk=disk_name
        ).set(
            values["write_latency_ms"]
        )


    # ============================================================
    # Overall Busy Time
    # ============================================================

    busy = disk["busy_time"]

    if busy:

        disk_busy_time_ms.set(
            busy["busy_time_ms"]
        )

        disk_busy_percentage.set(
            busy["busy_percentage"]
        )


    # ============================================================
    # Per Disk Busy Time
    # ============================================================

    for disk_name, values in disk["busy_time perdisk"].items():

        disk_perdisk_busy_time_ms.labels(
            disk=disk_name
        ).set(
            values["busy_time_ms"]
        )

        disk_perdisk_busy_percentage.labels(
            disk=disk_name
        ).set(
            values["busy_percentage"]
        )


    return generate_latest().decode("utf-8")


if __name__ == "__main__":

    update_disk_metrics()

    metrics = generate_latest()

    print(metrics.decode("utf-8"))