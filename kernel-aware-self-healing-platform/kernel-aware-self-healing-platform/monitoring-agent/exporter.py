# Collect the data from the collectors and then set the data to the prometheus format

from prometheus_client import Gauge
from prometheus_client import Counter
from prometheus_client import generate_latest

from collectors.network import get_network_stats_snapshot

# Network IO metrics
network_byte_sent = Counter(
    "network_byte_sent_total",
    "Total bytes sent through network interfaces"
)

network_byte_received = Counter(
    "network_byte_received_total",
    "Total bytes received through network interfaces"
)

network_packets_sent = Counter(
    "network_packets_sent_total",
    "Total packets sent through network interfaces"
)

network_packets_received = Counter(
    "network_packets_received_total",
    "Total packets received through network interfaces"
)

# Network errors and drops
network_errors_in = Counter(
    "network_errors_in_total",
    "Total incoming network errors"
)

network_errors_out = Counter(
    "network_errors_out_total",
    "Total outgoing network errors"
)

network_drops_in = Counter(
    "network_drops_in_total",
    "Total incoming network packet drops"
)

network_drops_out = Counter(
    "network_drops_out_total",
    "Total outgoing network packet drops"
)

# Interface metrics
network_interface_up = Gauge(
    "network_interface_up",
    "Network interface status",
    ["interface"]
)

network_interface_speed = Gauge(
    "network_interface_speed_mbps",
    "Network interface speed in Mbps",
    ["interface"]
)

network_interface_mtu = Gauge(
    "network_interface_mtu",
    "Maximum transmission unit size",
    ["interface"]
)

# Connection/process metrics
network_active_connections = Gauge(
    "network_active_connections",
    "Number of active network connections"
)

network_processes = Gauge(
    "network_processes_using_network",
    "Number of processes using network connections"
)

def update_network_metrics():

    network = get_network_stats_snapshot()

    # Update Prometheus metrics
    network_byte_sent.inc(
        network["network_io"]["bytes_sent"]
    )

    network_byte_received.inc(
        network["network_io"]["bytes_received"]
    )

    network_packets_sent.inc(
        network["network_io"]["packets_sent"]
    )

    network_packets_received.inc(
        network["network_io"]["packets_received"]
    )

    # Errors and Drops
    network_errors_in.inc(
        network["network_io"]["errors_in"]
    )

    network_errors_out.inc(
        network["network_io"]["errors_out"]
    )

    network_drops_in.inc(
        network["network_io"]["drops_in"]
    )

    network_drops_out.inc(
        network["network_io"]["drops_out"]
    )

    # Interfaces
    for interface, data in network["interfaces"].items():
        network_interface_up.labels(
            interface=interface
        ).set(
            int(data["is_up"])
        )

        network_interface_speed.labels(
            interface=interface
        ).set(
            data["speed_mbps"]
        )

        network_interface_mtu.labels(
            interface=interface
        ).set(
            data["mtu"]
        )

        # Connections
        network_active_connections.set(
            len(network["connections"])
        )

        # Processes
        network_processes.set(
            len(network["network_processes"])
        )

    return generate_latest().decode("utf-8")

if __name__ == "__main__":

    update_network_metrics()
    metrics = generate_latest()
    print(metrics.decode("utf-8"))