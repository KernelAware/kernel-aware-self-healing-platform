from detection.strategies.base_detector import DetectionStrategy
from detection.threshold import check_threshold
from detection.duration import check_duration
from load_data.system_metrics.metrics_loader import get_cpu_metric
from incident_management.manager import manage_incidents


class CpuDetector(DetectionStrategy):

    def detect(self, rule):
        if rule is None:
            return None

        system_id = rule["rule"]["system_id"]

        for metric in rule["metrics"]:
            results = get_cpu_metric(
                system_id=system_id,
                metric=metric,
            )

            for result in results:
                current_value = float(result["value"][1])
                threshold_match = check_threshold(
                    value=current_value,
                    operator=metric["operator"],
                    threshold=metric["threshold"],
                )
                if not threshold_match:
                    continue

                core = result.get("metric", {}).get("core")
                target = core or "host"
                duration_match = check_duration(
                    system_id=system_id,
                    target=target,
                    metric_name=metric["metric"],
                    duration_seconds=metric["duration_seconds"],
                )
                if not duration_match:
                    continue

                incident = {
                    "rule_id": rule["rule"]["id"],
                    "system_id": system_id,
                    "incident_severity": rule["rule"]["severity"],
                    "incident_type": rule["rule"]["monitor_type"],
                    "incident_priority": rule["rule"]["priority"],
                    "target": target,
                    "pid": None,
                    "violated_metric": metric,
                    "value": current_value,
                }
                manage_incidents(incident)

        return None