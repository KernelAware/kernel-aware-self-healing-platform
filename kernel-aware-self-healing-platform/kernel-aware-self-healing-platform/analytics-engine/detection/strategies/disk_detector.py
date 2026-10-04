from detection.strategies.base_detector import DetectionStrategy
from detection.threshold import check_threshold
from detection.duration import check_target_duration
from load_data.system_metrics.metrics_loader import get_disk_metric
from incident_management.manager import manage_incidents
import json


class DiskDetector(DetectionStrategy):

    def detect(self, rule):
        if rule is None:
            return None

        for rule_target in rule.get("targets", []):
            target = parse_target(rule_target.get("target"))
            for metric in rule.get("metrics", []):
                results = get_disk_metric(target, metric)
                for result in results:
                    current_value = float(result["value"][1])
                    if not check_threshold(current_value, metric["operator"], metric["threshold"]):
                        continue
                    identity = disk_identity(target)
                    if not check_target_duration(rule["rule"]["system_id"], identity, metric["metric"], metric.get("duration_seconds", 0)):
                        continue
                    manage_incidents({
                        "rule_id": rule["rule"]["id"],
                        "system_id": rule["rule"]["system_id"],
                        "incident_severity": rule["rule"]["severity"],
                        "incident_type": rule["rule"]["monitor_type"],
                        "incident_priority": rule["rule"]["priority"],
                        "target": target.get("mountpoint") or target.get("device") or target.get("disk"),
                        "target_type": rule_target.get("target_type"),
                        "disk": target,
                        "violated_metric": metric,
                        "value": current_value,
                    })

        return None


def parse_target(value):
    if isinstance(value, dict):
        return value
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, dict) else {"disk": value}
    except (TypeError, json.JSONDecodeError):
        return {"disk": value}


def disk_identity(target):
    return "|".join(str(target.get(key) or "") for key in ("host", "device", "mountpoint", "filesystem", "disk"))