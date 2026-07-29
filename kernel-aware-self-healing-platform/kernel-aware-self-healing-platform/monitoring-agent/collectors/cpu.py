
import psutil
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)


# ─── 1. CPU Usage ─────────────────────────────────────────────

def get_cpu_usage():
    """
    Collect overall CPU usage percentage from Linux kernel.
    Reads raw data from /proc/stat via psutil.
    interval=1 means measure for 1 second for accuracy.
    Returns: float (e.g. 45.2)
    """
    try:
        usage = psutil.cpu_percent(interval=1)
        logger.info(f"CPU Usage collected: {usage}%")
        return usage
    except Exception as e:
        logger.error(f"CPU usage collection failed: {e}")
        return None


# ─── 2. CPU Cores ─────────────────────────────────────────────

def get_cpu_cores():
    """
    Collect CPU core information from Linux kernel.
    Reads raw data from /proc/cpuinfo via psutil.

    physical_cores = actual hardware cores on the chip
    logical_cores  = physical x 2 due to hyper-threading
    per_core_usage = usage % of each individual core
    Returns: dict
    """
    try:
        data = {
            "physical_cores": psutil.cpu_count(logical=False),
            "logical_cores":  psutil.cpu_count(logical=True),
            "per_core_usage": psutil.cpu_percent(
                interval=1,
                percpu=True
            )
        }
        logger.info(f"CPU Cores collected: {data}")
        return data
    except Exception as e:
        logger.error(f"CPU cores collection failed: {e}")
        return {}


# ─── 3. CPU Load ──────────────────────────────────────────────

def get_cpu_load():
    """
    Collect system load average from Linux kernel.
    Reads raw data from /proc/loadavg via psutil.

    1min  = average number of processes in last 1 minute
    5min  = average number of processes in last 5 minutes
    15min = average number of processes in last 15 minutes

    If load > number of cores = system is overloaded
    Returns: dict
    """
    try:
        load = psutil.getloadavg()
        data = {
            "1min":  round(load[0], 2),
            "5min":  round(load[1], 2),
            "15min": round(load[2], 2)
        }
        logger.info(f"CPU Load collected: {data}")
        return data
    except Exception as e:
        logger.error(f"CPU load collection failed: {e}")
        return {}


# ─── 4. CPU Frequency ─────────────────────────────────────────

def get_cpu_frequency():
    """
    Collect CPU clock speed from Linux kernel.
    Reads raw data from /sys/devices/system/cpu via psutil.

    current_mhz = current running speed
    min_mhz     = minimum possible speed
    max_mhz     = maximum possible speed

    If current << max = CPU may be thermally throttled
    Returns: dict
    """
    try:
        freq = psutil.cpu_freq()
        if freq:
            data = {
                "current_mhz": round(freq.current, 2),
                "min_mhz":     round(freq.min, 2),
                "max_mhz":     round(freq.max, 2)
            }
            logger.info(f"CPU Frequency collected: {data}")
            return data
        logger.warning("CPU frequency data not available")
        return {}
    except Exception as e:
        logger.error(f"CPU frequency collection failed: {e}")
        return {}

# ─── 5. CPU Times ─────────────────────────────────────────────

def get_cpu_times():
    try:
        times = psutil.cpu_times_percent(interval=1)
        data = {
            "user":   times.user,
            "system": times.system,
            "idle":   times.idle,
            "iowait": getattr(times, 'iowait', 0.0),
            "steal":  getattr(times, 'steal', 0.0)
        }
        logger.info(f"CPU Times collected: {data}")
        return data
    except Exception as e:
        logger.error(f"CPU times collection failed: {e}")
        return {}


# ─── 6. CPU Stats ─────────────────────────────────────────────

def get_cpu_stats():
    try:
        stats = psutil.cpu_stats()
        data = {
            "ctx_switches":    stats.ctx_switches,
            "interrupts":      stats.interrupts,
            "soft_interrupts": stats.soft_interrupts
        }
        logger.info(f"CPU Stats collected: {data}")
        return data
    except Exception as e:
        logger.error(f"CPU stats collection failed: {e}")
        return {}


# ─── 7. Top CPU Processes ─────────────────────────────────────

def get_top_cpu_processes(limit=5):
    try:
        processes = []
        for proc in psutil.process_iter([
            'pid', 'name', 'memory_percent', 'status'
        ]):
            try:
                cpu = proc.cpu_percent(interval=0.1)
                if cpu > 0:
                    processes.append({
                        'pid':            proc.pid,
                        'name':           proc.name(),
                        'cpu_percent':    cpu,
                        'memory_percent': proc.memory_percent(),
                        'status':         proc.status()
                    })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        processes.sort(
            key=lambda x: x['cpu_percent'],
            reverse=True
        )
        logger.info(f"Top processes collected: {len(processes)}")
        return processes[:limit]
    except Exception as e:
        logger.error(f"Top processes collection failed: {e}")
        return []


# ───── collect() ─────────────────────────────────────────────

def collect():

    try:
        logger.info("Starting CPU data collection...")

        data = {
            "timestamp": datetime.now().isoformat(),
            "usage":     get_cpu_usage(),
            "cores":     get_cpu_cores(),
            "load":      get_cpu_load(),
            "frequency": get_cpu_frequency(),
            "times": get_cpu_times(),
            "stats": get_cpu_stats(),
            "processes": get_top_cpu_processes()
        }

        logger.info(
            f"CPU collection complete | "
            f"Usage: {data['usage']}% | "
            f"Load(1m): {data['load'].get('1min', 'N/A')} | "
            f"Freq: {data['frequency'].get('current_mhz', 'N/A')} MHz"
        )

        return data

    except Exception as e:
        logger.error(f"CPU collection failed: {e}")
        return {}


# ─── Run directly for testing ─────────────────────────────────

if __name__ == "__main__":

    print("=" * 55)
    print("  DATA COLLECTION LAYER - CPU Metrics Test")
    print("=" * 55)

    print(f"\n[1] CPU Usage:     {get_cpu_usage()}%")

    cores = get_cpu_cores()
    print(f"\n[2] CPU Cores:")
    print(f"    Physical : {cores.get('physical_cores')}")
    print(f"    Logical  : {cores.get('logical_cores')}")
    print(f"    Per Core : {cores.get('per_core_usage')}")

    load = get_cpu_load()
    print(f"\n[3] CPU Load Average:")
    print(f"    1  min : {load.get('1min')}")
    print(f"    5  min : {load.get('5min')}")
    print(f"    15 min : {load.get('15min')}")

    freq = get_cpu_frequency()
    print(f"\n[4] CPU Frequency:")
    print(f"    Current : {freq.get('current_mhz')} MHz")
    print(f"    Min     : {freq.get('min_mhz')} MHz")
    print(f"    Max     : {freq.get('max_mhz')} MHz")

    print(f"\n[5] Full collect() Snapshot:")
    result = collect()
    print(f"    Timestamp : {result.get('timestamp')}")
    print(f"    Keys      : {list(result.keys())}")
    print(f"    Usage     : {result.get('usage')}%")