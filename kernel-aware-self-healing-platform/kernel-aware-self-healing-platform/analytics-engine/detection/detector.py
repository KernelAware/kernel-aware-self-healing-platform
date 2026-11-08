import logging

from detection.strategies.cpu_detector import CpuDetector
from detection.strategies.memeory_detecter import MemoryDetector
from detection.strategies.disk_detector import DiskDetector
from detection.strategies.process_detector import ProcessDetector
from detection.strategies.network_detector import NetworkDetector
from detection.strategies.service_detector import ServiceDetector
from detection.strategies.generic_detector import GenericDetector

strategies = {
    "cpu": CpuDetector(),
    "memory": MemoryDetector(),
    "disk": DiskDetector(),
    "process": ProcessDetector(),
    "network": NetworkDetector(),
    "service": ServiceDetector(),
    "health": GenericDetector("health"),
    "logs": GenericDetector("logs"),
}

logger = logging.getLogger(__name__)
_unsupported_rules_logged = set()


def detect(rule, *, allow_incident_creation=True):
    if not isinstance(rule, dict) or not isinstance(rule.get("rule"), dict):
        logger.info(
            "[RULE_EVAL] system_id=unknown rule_id=unknown monitor_type=unknown "
            "instant=DATA_UNAVAILABLE redis_timer=UNCHANGED outcome=DATA_UNAVAILABLE "
            "reason=malformed_rule"
        )
        return None

    if str(rule["rule"].get("status", "ENABLED")).upper() != "ENABLED":
        logger.info(
            "[RULE_EVAL] system_id=%s rule_id=%s monitor_type=%s "
            "instant=DATA_UNAVAILABLE redis_timer=UNCHANGED outcome=SKIPPED "
            "reason=rule_not_enabled",
            rule["rule"].get("system_id"),
            rule["rule"].get("id"),
            rule["rule"].get("monitor_type") or "unknown",
        )
        return None

    monitor_type = str(rule["rule"].get("monitor_type", "")).lower()
    strategy = strategies.get(monitor_type)


    if strategy is None:
        rule_id = rule["rule"].get("id")
        key = (str(rule_id), monitor_type)
        if key not in _unsupported_rules_logged:
            logger.warning(
                "Skipping unsupported rule: rule_id=%s monitor_type=%s",
                rule_id,
                monitor_type or "<missing>",
            )
            _unsupported_rules_logged.add(key)
        logger.info(
            "[RULE_EVAL] system_id=%s rule_id=%s monitor_type=%s "
            "instant=DATA_UNAVAILABLE redis_timer=UNCHANGED outcome=SKIPPED "
            "reason=unsupported_monitor_type",
            rule["rule"].get("system_id"),
            rule["rule"].get("id"),
            monitor_type or "unknown",
        )
        return None

    if monitor_type == "disk":
        return strategy.detect(rule, allow_incident_creation=allow_incident_creation)

    return strategy.detect(rule)
