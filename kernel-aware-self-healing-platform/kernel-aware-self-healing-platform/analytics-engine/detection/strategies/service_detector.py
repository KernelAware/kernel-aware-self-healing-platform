from detection.strategies.base_detector import DetectionStrategy
from detection.threshold import check_threshold
from detection.duration import check_duration
from load_data.system_metrics.metrics_loader import get_service_metric
from incident_management.manager import manage_incidents


class ServiceDetector(DetectionStrategy):

    def detect(self, rule):

        if rule is None:
            return None

        for rule_target in rule["targets"]:
            for metric in rule["metrics"]:
                results = get_service_metric(
                    system_id=rule["rule"]["system_id"],
                    service_details=rule_target["target"],
                    metric=metric
                )

                for result in results:
                    service_name = result["metric"]["name"]
                    current_value = float(result["value"][1])

                    threshold_match = check_threshold(
                        value=current_value,
                        operator=metric["operator"],
                        threshold=metric["threshold"]
                    )



                    if not threshold_match:
                        continue

                    duration_match = check_duration(
                        system_id=rule["rule"]["system_id"],
                        metric_name=metric["metric"],
                        duration_seconds=metric["duration_seconds"]
                    )

                    if not duration_match:
                        continue

                    incident = {
                        "rule_id": rule["rule"]["id"],
                        "system_id": rule["rule"]["system_id"],
                        "incident_severity": rule["rule"]["severity"],
                        "incident_type": rule["rule"]["monitor_type"],
                        "incident_priority": rule["rule"]["priority"],
                        "target": f"{rule_target['target'].split('@pid=')[0]}.service",
                        "service_name": service_name,
                        "violated_metric": metric,
                        "value": current_value,
                    }

                    manage_incidents(incident)

        return None