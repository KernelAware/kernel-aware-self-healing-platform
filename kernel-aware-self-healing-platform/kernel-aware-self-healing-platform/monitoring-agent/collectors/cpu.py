import psutil
import time
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ─── Thresholds ───────────────────────────────────────

CPU_WARNING_THRESHOLD  = 75.0
CPU_CRITICAL_THRESHOLD = 90.0
LOAD_WARNING_THRESHOLD = 2.0
LOAD_CRITICAL_THRESHOLD = 4.0


# ─── 1. Basic CPU Usage ───────────────────────────────

def get_cpu_usage_percent():
    """
    Get overall CPU usage percentage
    Returns: float
    """
    try:
        usage = psutil.cpu_percent(interval=1)
        logger.info(f"CPU Usage: {usage}%")
        return usage
    except Exception as e:
        logger.error(f"CPU usage collection failed: {e}")
        return None


# ─── 2. Per Core CPU Usage ────────────────────────────

def get_per_core_usage():
    """
    Get CPU usage percentage for each core separately
    Returns: list of floats
    """
    try:
        per_core = psutil.cpu_percent(interval=1, percpu=True)
        for i, core in enumerate(per_core):
            logger.info(f"Core {i}: {core}%")
        return per_core
    except Exception as e:
        logger.error(f"Per core usage collection failed: {e}")
        return []


# ─── 3. CPU Frequency ─────────────────────────────────

def get_cpu_frequency():
    """
    Get current, min, and max CPU frequency in MHz
    Returns: dict
    """
    try:
        freq = psutil.cpu_freq()
        if freq:
            return {
                "current_mhz": round(freq.current, 2),
                "min_mhz":     round(freq.min, 2),
                "max_mhz":     round(freq.max, 2)
            }
        return {}
    except Exception as e:
        logger.error(f"CPU frequency collection failed: {e}")
        return {}


# ─── 4. CPU Count ─────────────────────────────────────

def get_cpu_count():
    """
    Get number of physical and logical CPU cores
    Returns: dict
    """
    try:
        return {
            "physical_cores": psutil.cpu_count(logical=False),
            "logical_cores":  psutil.cpu_count(logical=True)
        }
    except Exception as e:
        logger.error(f"CPU count collection failed: {e}")
        return {}


# ─── 5. Load Average ──────────────────────────────────

def get_load_average():
    """
    Get system load average for last 1, 5, and 15 minutes
    High load average means system is under heavy load
    Returns: dict
    """
    try:
        load = psutil.getloadavg()
        return {
            "1min":  round(load[0], 2),
            "5min":  round(load[1], 2),
            "15min": round(load[2], 2)
        }
    except Exception as e:
        logger.error(f"Load average collection failed: {e}")
        return {}


# ─── 6. CPU Times ─────────────────────────────────────

def get_cpu_times():
    """
    Get CPU time breakdown as percentages
    user   = time spent running user processes
    system = time spent running kernel processes
    idle   = time CPU was doing nothing
    iowait = time waiting for disk/network I/O
    Returns: dict
    """
    try:
        times = psutil.cpu_times_percent(interval=1)
        return {
            "user":   round(times.user, 2),
            "system": round(times.system, 2),
            "idle":   round(times.idle, 2),
            "iowait": round(getattr(times, 'iowait', 0.0), 2),
            "steal":  round(getattr(times, 'steal', 0.0), 2)
        }
    except Exception as e:
        logger.error(f"CPU times collection failed: {e}")
        return {}


# ─── 7. Top CPU Consuming Processes ──────────────────

def get_top_cpu_processes(limit=5):
    """
    Get the top processes consuming the most CPU
    Useful for identifying misbehaving processes
    Returns: list of dicts
    """
    try:
        processes = []

        for proc in psutil.process_iter([
            'pid', 'name', 'cpu_percent',
            'memory_percent', 'status'
        ]):
            try:
                info = proc.info
                # Only include processes using CPU
                if info['cpu_percent'] > 0:
                    processes.append({
                        "pid":            info['pid'],
                        "name":           info['name'],
                        "cpu_percent":    info['cpu_percent'],
                        "memory_percent": round(
                            info['memory_percent'], 2
                        ),
                        "status":         info['status']
                    })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                # Process may have ended during iteration
                pass

        # Sort by CPU usage - highest first
        processes.sort(
            key=lambda x: x['cpu_percent'],
            reverse=True
        )

        return processes[:limit]

    except Exception as e:
        logger.error(f"Top CPU processes collection failed: {e}")
        return []


# ─── 8. CPU Anomaly Detection ─────────────────────────

def check_cpu_anomaly():
    """
    Check if CPU usage has exceeded defined thresholds
    Determines alert level and whether self-healing is needed
    Returns: dict with status and alert level
    """
    try:
        usage    = get_cpu_usage_percent()
        load     = get_load_average()
        top_proc = get_top_cpu_processes(limit=3)

        # Determine alert level based on thresholds
        if usage >= CPU_CRITICAL_THRESHOLD:
            alert_level = "CRITICAL"
        elif usage >= CPU_WARNING_THRESHOLD:
            alert_level = "WARNING"
        else:
            alert_level = "NORMAL"

        result = {
            "timestamp":     datetime.now().isoformat(),
            "usage":         usage,
            "alert_level":   alert_level,
            "load_avg":      load,
            "top_processes": top_proc,
            # True means self-healing engine should be triggered
            "needs_healing": usage >= CPU_CRITICAL_THRESHOLD
        }

        # Log warning if anomaly detected
        if alert_level != "NORMAL":
            logger.warning(
                f"CPU {alert_level}: {usage}% - "
                f"Top process: "
                f"{top_proc[0]['name'] if top_proc else 'unknown'}"
            )

        return result

    except Exception as e:
        logger.error(f"CPU anomaly check failed: {e}")
        return {}


# ─── 9. Complete CPU Snapshot ─────────────────────────

def get_cpu_stats_snapshot():
    """
    Collect a complete CPU snapshot with all metrics
    This is the main function called by main.py
    All data is sent to Prometheus for storage
    Returns: dict
    """
    try:
        return {
            "timestamp":     datetime.now().isoformat(),
            "usage_percent": get_cpu_usage_percent(),
            "per_core":      get_per_core_usage(),
            "frequency":     get_cpu_frequency(),
            "core_count":    get_cpu_count(),
            "load_average":  get_load_average(),
            "cpu_times":     get_cpu_times(),
            "top_processes": get_top_cpu_processes(),
            "anomaly":       check_cpu_anomaly()
        }
    except Exception as e:
        logger.error(f"CPU snapshot collection failed: {e}")
        return {}


# ─── 10. Continuous CPU Monitor ───────────────────────

def monitor_cpu_continuously(interval=15, callback=None):
    """
    Continuously monitor CPU at a given interval
    If anomaly is detected, callback function is triggered
    This connects the monitoring agent to the self-healing engine
    interval: seconds between each check
    callback: function to call when anomaly is detected
    """
    logger.info(
        f"CPU continuous monitoring started - "
        f"checking every {interval} seconds"
    )

    while True:
        try:
            snapshot = get_cpu_stats_snapshot()
            anomaly  = snapshot.get("anomaly", {})

            # Trigger self-healing if CPU is critical
            if anomaly.get("needs_healing") and callback:
                logger.critical(
                    "CPU CRITICAL - triggering self-healing!"
                )
                callback(anomaly)

            time.sleep(interval)

        except KeyboardInterrupt:
            logger.info("CPU monitoring stopped")
            break
        except Exception as e:
            logger.error(f"CPU monitoring loop error: {e}")
            time.sleep(interval)


# ─── Run directly for testing ─────────────────────────

if __name__ == "__main__":

    print("=== CPU Metrics Test ===\n")

    print(f"Usage:      {get_cpu_usage_percent()}%")
    print(f"Per Core:   {get_per_core_usage()}")
    print(f"Frequency:  {get_cpu_frequency()}")
    print(f"Core Count: {get_cpu_count()}")
    print(f"Load Avg:   {get_load_average()}")
    print(f"CPU Times:  {get_cpu_times()}")

    print("\nTop CPU Processes:")
    for proc in get_top_cpu_processes():
        print(
            f"  {proc['name']} "
            f"(PID:{proc['pid']}) - "
            f"{proc['cpu_percent']}%"
        )

    print("\nAnomaly Check:")
    anomaly = check_cpu_anomaly()
    print(f"  Status:        {anomaly.get('alert_level')}")
    print(f"  Needs Healing: {anomaly.get('needs_healing')}")