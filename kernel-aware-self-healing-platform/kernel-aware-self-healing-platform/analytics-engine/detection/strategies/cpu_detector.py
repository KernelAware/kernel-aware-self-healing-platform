from detection.strategies.base_detector import DetectionStrategy
from detection.threshold import check_threshold
from detection.duration import check_duration, clear_duration
from load_data.system_metrics.metrics_loader import get_cpu_metric
from incident_management.manager import manage_incidents, recover_incident


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

                labels = result.get("metric", {})
                target = (
                    labels.get("hostname")
                    or labels.get("instance")
                    or rule["rule"].get("target")
                    or rule["rule"].get("server_name")
                    or rule["rule"].get("hostname")
                    or rule["rule"].get("system_name")
                    or rule.get("target")
                    or "host"
                )

                incident = {
                    "rule_id": rule["rule"]["id"],
                    "system_id": system_id,
                    "incident_type": "cpu",
                    "severity": rule["rule"]["severity"],
                    "priority": rule["rule"]["priority"],
                    "target": target,
                    "pid": None,
                    "violated_metric": metric,
                    "value": current_value,
                }

                if not threshold_match:
                    clear_duration(
                        system_id=system_id,
                        target=target,
                        metric_name=metric["metric"],
                    )
                    recover_incident(incident)
                    continue

                duration_match = check_duration(
                    system_id=system_id,
                    target=target,
                    metric_name=metric["metric"],
                    duration_seconds=metric["duration_seconds"],
                )
                if not duration_match:
                    continue

                manage_incidents(incident)

        return None