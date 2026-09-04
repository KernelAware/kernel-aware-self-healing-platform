from detection.strategies.base_detector import DetectionStrategy
from detection.threshold import check_threshold
from detection.duration import check_duration
from database.rules.rule_loader import get_process_metric


class ProcessDetector(DetectionStrategy):

    def detect(self, rule, metrics):

        if rule is None:
            return None

        for rule_target in rule["targets"]:
            for metric in rule["metrics"]:

                current_metrix_vlue = get_process_metric(
                    system_id=rule["system_id"],
                    process_name = rule_target["target"],
                    metric = metric

                )

                threshold_match = check_threshold(
                    value=current_metrix_vlue,
                    operator=rule["operator"],
                    threshold=rule["threshold"]
                )

                if not threshold_match:
                    return None

                duration_match = check_duration(
                    started_at=rule.get("started_at"),
                    duration_seconds=rule["duration_seconds"]
                )

                if not duration_match:
                    return None

                return {
                    "rule_id": rule["id"],
                    "status": "violation"
            }