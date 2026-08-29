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


def detect(rule, metrics):

    monitor_type = rule["monitor_type"]

    strategy = strategies.get(monitor_type)

    if strategy is None:
        raise ValueError(
            f"Unsupported monitor type: {monitor_type}"
        )

    return strategy.detect(
        rule,
        metrics
    )