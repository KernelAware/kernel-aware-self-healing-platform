from detection.strategies.cpu_detector import CpuDetector
from detection.strategies.memeory_detecter import MemoryDetector
from detection.strategies.disk_detector import DiskDetector
from detection.strategies.process_detector import ProcessDetector
from detection.strategies.network_detector import NetworkDetector


strategies = {
    "cpu": CpuDetector(),
    "memory": MemoryDetector(),
    "disk": DiskDetector(),
    "process": ProcessDetector(),
    "network": NetworkDetector(),
}


def detect(rule, *, allow_incident_creation=True):
    if not isinstance(rule, dict) or not isinstance(rule.get("rule"), dict):
        return None

    if str(rule["rule"].get("status", "ENABLED")).upper() != "ENABLED":
        return None

    monitor_type = str(rule["rule"].get("monitor_type", "")).lower()
    strategy = strategies.get(monitor_type)

    if strategy is None:
        raise ValueError(
            f"Unsupported monitor type: {monitor_type}"
        )

    if monitor_type == "disk":
        return strategy.detect(rule, allow_incident_creation=allow_incident_creation)

    return strategy.detect(rule)
