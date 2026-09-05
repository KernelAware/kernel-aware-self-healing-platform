from time import sleep

from detection.strategies.base_detector import DetectionStrategy
from detection.threshold import check_threshold
from detection.duration import check_duration
from load_data.system_metrics.metrics_loader import get_process_metric


class ProcessDetector(DetectionStrategy):

    def detect(self, rule):
        if rule is None:
            return None

        for rule_target in rule["targets"]:
            for metric in rule["metrics"]:

                results = get_process_metric(
                    system_id=rule["rule"]["system_id"],
                    process_name=rule_target["target"],
                    metric=metric
                )

                for result in results:
                    print(result)
                    sleep(5)

                    pid = result["metric"]["pid"]
                    current_value = float(
                        result["value"][1]
                    )

                    threshold_match = check_threshold(
                        value=current_value,
                        operator=metric["operator"],
                        threshold=metric["threshold"]
                    )

                    print(threshold_match)

                    if not threshold_match:
                        continue

                    duration_match = check_duration(
                        started_at=rule.get("started_at"),
                        duration_seconds=metric["duration_seconds"]
                    )

                    if not duration_match:
                        continue

                    return {
                        "rule_id": rule["rule"]["id"],
                        "process": rule_target["target"],
                        "pid": pid,
                        "metric": metric["metric"],
                        "value": current_value,
                        "status": "violation"
                    }

        return None