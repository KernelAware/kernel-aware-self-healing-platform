import psutil
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 1. Network IO Statistics
def get_network_io():

    try:
        io = psutil.net_io_counters()
        return {
            "bytes_sent": io.bytes_sent,
            "bytes_received": io.bytes_recv,
            "packets_sent": io.packets_sent,
            "packets_received": io.packets_recv,
            "errors_in": io.errin,
            "errors_out": io.errout,
            "drops_in": io.dropin,
            "drops_out": io.dropout
        }

    except Exception as e:
        logger.error(
            f"Network IO collection failed: {e}"
        )
        return {}

# 2. Network Interface Information
def get_network_interfaces():

    try:
        interfaces = {}
        stats = psutil.net_if_stats()
        for name, info in stats.items():
            interfaces[name] = {
                "is_up": info.isup,
                "speed_mbps": info.speed,
                "mtu": info.mtu
            }
        return interfaces

    except Exception as e:
        logger.error(
            f"Network interface collection failed: {e}"
        )
        return {}

# 3. Network Address Information
def get_network_addresses():

    try:
        addresses = {}
        interfaces = psutil.net_if_addrs()
        for interface, addr_list in interfaces.items():
            addresses[interface] = []
            for addr in addr_list:
                addresses[interface].append({
                    "family": str(addr.family),
                    "address": addr.address,
                    "netmask": addr.netmask
                })
        return addresses

    except Exception as e:
        logger.error(
            f"Network address collection failed: {e}"
        )
        return {}

# 4. Active Network Connections
def get_active_connections():

    try:
        connections = []
        for conn in psutil.net_connections():
            connections.append({
                "fd": conn.fd,
                "family": str(conn.family),
                "type": str(conn.type),
                "local_address": str(conn.laddr),
                "remote_address": str(conn.raddr),
                "status": conn.status,
                "pid": conn.pid
            })
        return connections

    except Exception as e:
        logger.error(
            f"Active connection collection failed: {e}"
        )
        return []

# ─── 5. Network Using Processes ──────────────────────
def get_network_processes():

    try:
        processes = []
        connections = psutil.net_connections()
        pids = set()
        for conn in connections:
            if conn.pid:
                pids.add(conn.pid)
        for pid in pids:
            try:
                process = psutil.Process(pid)
                processes.append({
                    "pid": pid,
                    "name": process.name(),
                    "status": process.status()
                })

            except (
                psutil.NoSuchProcess,
                psutil.AccessDenied
            ):
                pass
        return processes

    except Exception as e:
        logger.error(
            f"Network process collection failed: {e}"
        )
        return []

# 6. Complete Network Snapshot
def get_network_stats_snapshot():

    try:
        return {
            "network_io":
                get_network_io(),
            "interfaces":
                get_network_interfaces(),
            "addresses":
                get_network_addresses(),
            "connections":
                get_active_connections(),
            "network_processes":
                get_network_processes()
        }

    except Exception as e:
        logger.error(
            f"Network snapshot collection failed: {e}"
        )
        return {}

# Run Directly For Testing
if __name__ == "__main__":

    print("=== Network Metrics Test ===\n")
    print("Network IO:")
    print(get_network_io())
    print("\nNetwork Interfaces:")
    print(get_network_interfaces())
    print("\nNetwork Addresses:")
    print(get_network_addresses())
    print("\nActive Connections:")

    connections = get_active_connections()
    print(f"{len(connections)} connections found")

    print("\nNetwork Processes:")
    for process in get_network_processes():
        print(process)

    print("\nComplete Snapshot:")
    snapshot = get_network_stats_snapshot()
    print(snapshot)