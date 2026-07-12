import psutil
import time
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── Thresholds ───────────────────────────────────────

NETWORK_WARNING_MB = 500
NETWORK_CRITICAL_MB = 1000

PACKET_DROP_WARNING = 100
PACKET_DROP_CRITICAL = 500

ERROR_WARNING = 50
ERROR_CRITICAL = 200


# ─── 1. Network IO Statistics ─────────────────────────

def get_network_io():
    """
    Get overall network IO statistics

    Returns:
        dict
    """

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
        logger.error(f"Network IO collection failed: {e}")
        return {}

# ─── 2. Network Interfaces ────────────────────────────

def get_network_interfaces():
    """
    Get network interface information

    Example:
        eth0
        wlan0
        docker0

    Returns:
        dict
    """

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

# ─── 3. Network Addresses ─────────────────────────────

def get_network_addresses():
    """
    Get IP and MAC addresses of interfaces

    Returns:
        dict
    """

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

# ─── 4. Network Errors and Drops ──────────────────────

def get_network_errors():
    """
    Get packet errors and drops

    Returns:
        dict
    """

    try:

        io = psutil.net_io_counters()

        return {
            "incoming_errors": io.errin,
            "outgoing_errors": io.errout,
            "incoming_drops": io.dropin,
            "outgoing_drops": io.dropout
        }

    except Exception as e:

        logger.error(
            f"Network error collection failed: {e}"
        )

        return {}

# ─── 5. Active Connections ────────────────────────────

def get_active_connections():
    """
    Get active network connections

    Returns:
        list
    """

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



# ─── 6. Network Related Processes ─────────────────────

def get_network_processes():
    """
    Get processes having network connections

    This does not calculate bandwidth usage.
    It identifies processes using network.

    Returns:
        list
    """

    try:

        processes = []
        connections = psutil.net_connections()
        pids = set()

        for conn in connections:
            if conn.pid:
                pids.add(conn.pid)

        for pid in pids:

            try:
                proc = psutil.Process(pid)

                processes.append({
                    "pid": pid,
                    "name": proc.name(),
                    "status": proc.status()
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

# ─── 7. Network Anomaly Detection ────────────────────

def check_network_anomaly():
    """
    Detect abnormal network conditions

    Returns:
        dict
    """

    try:

        io = get_network_io()
        errors = get_network_errors()

        sent_mb = (
            io.get("bytes_sent",0)
            /
            (1024*1024)
        )

        received_mb = (
            io.get("bytes_received",0)
            /
            (1024*1024)
        )

        total_errors = (
            errors["incoming_errors"]
            +
            errors["outgoing_errors"]
        )

        total_drops = (
            errors["incoming_drops"]
            +
            errors["outgoing_drops"]
        )

        alert = "NORMAL"

        if (
            total_errors >= ERROR_CRITICAL
            or
            total_drops >= PACKET_DROP_CRITICAL
        ):

            alert = "CRITICAL"

        elif (
            total_errors >= ERROR_WARNING
            or
            total_drops >= PACKET_DROP_WARNING
        ):

            alert = "WARNING"

        result = {

            "timestamp":
                datetime.now().isoformat(),

            "traffic": {
                "sent_mb":
                    round(sent_mb,2),
                "received_mb":
                    round(received_mb,2)

            },

            "errors":
                total_errors,
            "drops":
                total_drops,
            "alert_level":
                alert,
            "needs_healing":
                alert == "CRITICAL"
        }

        if alert != "NORMAL":

            logger.warning(
                f"NETWORK {alert}: "
                f"errors={total_errors}, "
                f"drops={total_drops}"
            )

        return result

    except Exception as e:

        logger.error(
            f"Network anomaly check failed: {e}"
        )

        return {}



# ─── 8. Complete Network Snapshot ────────────────────

def get_network_stats_snapshot():
    """
    Collect complete network metrics

    Main function called by main.py

    Returns:
        dict
    """

    try:

        return {
            "timestamp":
                datetime.now().isoformat(),
            "network_io":
                get_network_io(),
            "interfaces":
                get_network_interfaces(),
            "addresses":
                get_network_addresses(),
            "errors":
                get_network_errors(),
            "connections":
                get_active_connections(),
            "network_processes":
                get_network_processes(),
            "anomaly":
                check_network_anomaly()
        }


    except Exception as e:

        logger.error(
            f"Network snapshot failed: {e}"
        )

        return {}



# ─── 9. Continuous Network Monitor ───────────────────

def monitor_network_continuously(
        interval=15,
        callback=None
):
    """
    Continuously monitor network

    interval:
        seconds between checks

    callback:
        self-healing trigger
    """


    logger.info(
        f"Network monitoring started "
        f"every {interval} seconds"
    )


    while True:

        try:

            snapshot = (
                get_network_stats_snapshot()
            )

            anomaly = (
                snapshot.get(
                    "anomaly",
                    {}
                )
            )

            if (
                anomaly.get(
                    "needs_healing"
                )
                and callback
            ):

                logger.critical(
                    "Network critical. "
                    "Triggering self-healing!"
                )

                callback(anomaly)

            time.sleep(interval)

        except KeyboardInterrupt:

            logger.info(
                "Network monitoring stopped"
            )

            break

        except Exception as e:

            logger.error(
                f"Network monitoring error: {e}"
            )

            time.sleep(interval)



# ─── Run directly for testing ─────────────────────────

if __name__ == "__main__":

    print(
        "=== Network Metrics Test ===\n"
    )

    print(
        "Network IO:"
    )

    print(
        get_network_io()
    )

    print(
        "\nInterfaces:"
    )

    print(
        get_network_interfaces()
    )

    print(
        "\nErrors:"
    )

    print(
        get_network_errors()
    )

    print(
        "\nActive Connections:"
    )

    print(
        len(
            get_active_connections()
        ),
        "connections"
    )

    print(
        "\nNetwork Processes:"
    )

    for proc in get_network_processes():

        print(
            proc
        )

    print(
        "\nAnomaly Check:"
    )

    anomaly = check_network_anomaly()

    print(
        anomaly
    )