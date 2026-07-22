# Collect the data from the collectors and then set the data to the prometheus format

import json

from prometheus_client import Gauge
from prometheus_client import generate_latest

from collectors.disk import get_disk_stats_snapshot


# ============================================================
# Partition Information
# ============================================================

disk_partition_info = Gauge(
    "disk_partition_info",
    "Mounted disk partition information",
    ["device", "mountpoint", "filesystem"]
)

disk_partition_total_gb = Gauge(
    "disk_partition_total_gb",
    "Total size of mounted partition in GB",
    ["device", "mountpoint", "filesystem"]
)

disk_usage_percent = Gauge(
    "disk_usage_percent",
    "Disk usage percentage",
    ["device", "mountpoint", "filesystem"]
)


# ============================================================
# Overall Disk IO
# ============================================================

disk_read_bytes = Gauge(
    "disk_read_bytes",
    "Total disk read bytes"
)

disk_write_bytes = Gauge(
    "disk_write_bytes",
    "Total disk write bytes"
)

disk_read_count = Gauge(
    "disk_read_count",
    "Total disk read operations"
)

disk_write_count = Gauge(
    "disk_write_count",
    "Total disk write operations"
)

disk_read_time_ms = Gauge(
    "disk_read_time_ms",
    "Total disk read time"
)

disk_write_time_ms = Gauge(
    "disk_write_time_ms",
    "Total disk write time"
)

disk_busy_time_ms = Gauge(
    "disk_busy_time_ms",
    "Total disk busy time"
)


# ============================================================
# Per Disk IO
# ============================================================

disk_per_read_bytes = Gauge(
    "disk_per_read_bytes",
    "Read bytes per disk",
    ["disk"]
)

disk_per_write_bytes = Gauge(
    "disk_per_write_bytes",
    "Write bytes per disk",
    ["disk"]
)

disk_per_read_count = Gauge(
    "disk_per_read_count",
    "Read count per disk",
    ["disk"]
)

disk_per_write_count = Gauge(
    "disk_per_write_count",
    "Write count per disk",
    ["disk"]
)

disk_per_read_time_ms = Gauge(
    "disk_per_read_time_ms",
    "Read time per disk",
    ["disk"]
)

disk_per_write_time_ms = Gauge(
    "disk_per_write_time_ms",
    "Write time per disk",
    ["disk"]
)

disk_per_busy_time_ms = Gauge(
    "disk_per_busy_time_ms",
    "Busy time per disk",
    ["disk"]
)


# ============================================================
# Throughput
# ============================================================

disk_read_speed_mb = Gauge(
    "disk_read_speed_mb",
    "Overall disk read speed MB/s"
)

disk_write_speed_mb = Gauge(
    "disk_write_speed_mb",
    "Overall disk write speed MB/s"
)


disk_per_read_speed_mb = Gauge(
    "disk_per_read_speed_mb",
    "Read speed MB/s per disk",
    ["disk"]
)

disk_per_write_speed_mb = Gauge(
    "disk_per_write_speed_mb",
    "Write speed MB/s per disk",
    ["disk"]
)


# ============================================================
# IOPS
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


disk_per_read_iops = Gauge(
    "disk_per_read_iops",
    "Per disk read IOPS",
    ["disk"]
)

disk_per_write_iops = Gauge(
    "disk_per_write_iops",
    "Per disk write IOPS",
    ["disk"]
)

disk_per_total_iops = Gauge(
    "disk_per_total_iops",
    "Per disk total IOPS",
    ["disk"]
)


# ============================================================
# Latency
# ============================================================

disk_read_latency_ms = Gauge(
    "disk_read_latency_ms",
    "Overall read latency"
)

disk_write_latency_ms = Gauge(
    "disk_write_latency_ms",
    "Overall write latency"
)


disk_per_read_latency_ms = Gauge(
    "disk_per_read_latency_ms",
    "Per disk read latency",
    ["disk"]
)

disk_per_write_latency_ms = Gauge(
    "disk_per_write_latency_ms",
    "Per disk write latency",
    ["disk"]
)


# ============================================================
# Busy Percentage
# ============================================================

disk_busy_percentage = Gauge(
    "disk_busy_percentage",
    "Overall busy percentage"
)

disk_per_busy_percentage = Gauge(
    "disk_per_busy_percentage",
    "Per disk busy percentage",
    ["disk"]
)

def update_disk_metrics():

    disk = get_disk_stats_snapshot()

    print(
        json.dumps(disk, indent=4)
    )

    # ============================================================
    # Partition Information
    # ============================================================

    usage_map = {}

    for partition in disk["disk_usage"]:
        usage_map[partition["mountpoint"]] = partition

    for partition in disk["mounted_partitions"]:

        mountpoint = partition["mountpoint"]

        if mountpoint not in usage_map:
            continue

        usage = usage_map[mountpoint]

        disk_partition_info.labels(
            device=partition["device"],
            mountpoint=partition["mountpoint"],
            filesystem=partition["filesystem"]
        ).set(1)

        disk_partition_total_gb.labels(
            device=partition["device"],
            mountpoint=partition["mountpoint"],
            filesystem=partition["filesystem"]
        ).set(
            usage["total_gb"]
        )

        disk_usage_percent.labels(
            device=partition["device"],
            mountpoint=partition["mountpoint"],
            filesystem=partition["filesystem"]
        ).set(
            usage["usage_percent"]
        )



    # ============================================================
    # Overall Disk IO
    # ============================================================

    disk_read_bytes.set(
        disk["io_counters"]["read_bytes"]
    )

    disk_write_bytes.set(
        disk["io_counters"]["write_bytes"]
    )

    disk_read_count.set(
        disk["io_counters"]["read_count"]
    )

    disk_write_count.set(
        disk["io_counters"]["write_count"]
    )

    disk_read_time_ms.set(
        disk["io_counters"]["read_time_ms"]
    )

    disk_write_time_ms.set(
        disk["io_counters"]["write_time_ms"]
    )

    disk_busy_time_ms.set(
        disk["io_counters"]["busy_time_ms"]
    )



    # ============================================================
    # Overall Throughput
    # ============================================================

    disk_read_speed_mb.set(
        disk["throughput"]["read_speed_mb"]
    )

    disk_write_speed_mb.set(
        disk["throughput"]["write_speed_mb"]
    )

        # ============================================================
    # Per Disk IO
    # ============================================================

    for disk_name, data in disk["io_counters perdisk"].items():

        disk_per_read_bytes.labels(
            disk=disk_name
        ).set(
            data["read_bytes"]
        )

        disk_per_write_bytes.labels(
            disk=disk_name
        ).set(
            data["write_bytes"]
        )

        disk_per_read_count.labels(
            disk=disk_name
        ).set(
            data["read_count"]
        )

        disk_per_write_count.labels(
            disk=disk_name
        ).set(
            data["write_count"]
        )

        disk_per_read_time_ms.labels(
            disk=disk_name
        ).set(
            data["read_time_ms"]
        )

        disk_per_write_time_ms.labels(
            disk=disk_name
        ).set(
            data["write_time_ms"]
        )

        disk_per_busy_time_ms.labels(
            disk=disk_name
        ).set(
            data["busy_time_ms"]
        )


    # ============================================================
    # Per Disk Throughput
    # ============================================================

    for disk_name, data in disk["throughput perdisk"].items():

        disk_per_read_speed_mb.labels(
            disk=disk_name
        ).set(
            data["read_speed_mb"]
        )

        disk_per_write_speed_mb.labels(
            disk=disk_name
        ).set(
            data["write_speed_mb"]
        )


    # ============================================================
    # Overall IOPS
    # ============================================================

    disk_read_iops.set(
        disk["iops"]["read_iops"]
    )

    disk_write_iops.set(
        disk["iops"]["write_iops"]
    )

    disk_total_iops.set(
        disk["iops"]["total_iops"]
    )


    # ============================================================
    # Per Disk IOPS
    # ============================================================

    for disk_name, data in disk["iops perdisk"].items():

        disk_per_read_iops.labels(
            disk=disk_name
        ).set(
            data["read_iops"]
        )

        disk_per_write_iops.labels(
            disk=disk_name
        ).set(
            data["write_iops"]
        )

        disk_per_total_iops.labels(
            disk=disk_name
        ).set(
            data["total_iops"]
        )

            # ============================================================
    # Overall Latency
    # ============================================================

    disk_read_latency_ms.set(
        disk["latency"]["read_latency_ms"]
    )

    disk_write_latency_ms.set(
        disk["latency"]["write_latency_ms"]
    )


    # ============================================================
    # Per Disk Latency
    # ============================================================

    for disk_name, data in disk["latency perdisk"].items():

        disk_per_read_latency_ms.labels(
            disk=disk_name
        ).set(
            data["read_latency_ms"]
        )

        disk_per_write_latency_ms.labels(
            disk=disk_name
        ).set(
            data["write_latency_ms"]
        )


    # ============================================================
    # Overall Busy Percentage
    # ============================================================

    disk_busy_percentage.set(
        disk["busy_time"]["busy_percentage"]
    )


    # ============================================================
    # Per Disk Busy Percentage
    # ============================================================

    for disk_name, data in disk["busy_time perdisk"].items():

        disk_per_busy_percentage.labels(
            disk=disk_name
        ).set(
            data["busy_percentage"]
        )


    return generate_latest().decode("utf-8")


if __name__ == "__main__":

    update_disk_metrics()

    metrics = generate_latest()

    print(metrics.decode("utf-8"))