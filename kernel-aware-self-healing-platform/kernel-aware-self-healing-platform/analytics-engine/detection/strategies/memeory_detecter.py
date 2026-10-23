from detection.strategies.base_detector import DetectionStrategy
from detection.threshold import check_threshold
from detection.duration import check_duration
from load_data.system_metrics.metrics_loader import get_memory_metrics
from incident_management.manager import manage_incidents


class MemoryDetector(DetectionStrategy):

    def detect(self, rule):
        if rule is None:
            return None

        rule_details = rule["rule"]

        # Ignore disabled rules.
        if str(rule_details.get("status", "")).upper() != "ENABLED":
            return None

        system_id = rule_details["system_id"]

        for metric in rule.get("metrics", []):

            if metric["metric"] != "system_memory_usage_percent":
                continue

            results = get_memory_metrics(system_id)

            for result in results:
                current_value = float(result["value"][1])

                threshold_match = check_threshold(
                    value=current_value,
                    operator=metric["operator"],
                    threshold=metric["threshold"],
                )

                if not threshold_match:
                    continue


                labels = result.get("metric", {})

                target = (
                    labels.get("hostname")
                    or labels.get("instance")
                    or "host"
                )

                # Use the existing duration function signature.
                duration_match = check_duration(
                    system_id=system_id,
                    pid=target,
                    metric_name=metric["metric"],
                    duration_seconds=metric["duration_seconds"],
                )

                if not duration_match:
                    continue

                incident = {
                    "rule_id": rule_details["id"],
                    "system_id": system_id,
                    "incident_type": "memory",
                    "severity": rule_details["severity"],
                    "priority": rule_details["priority"],
                    "target": target,
                    "pid": None,
                    "violated_metric": metric,
                    "value": current_value,
                }

                manage_incidents(incident)

        return None
