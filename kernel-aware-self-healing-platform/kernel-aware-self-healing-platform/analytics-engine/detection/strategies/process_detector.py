from detection.base_detector import DetectionStrategy
from detection.threshold import check_threshold
from detection.duration import check_duration


class ProcessDetector(DetectionStrategy):

    def detect(self, rule, metrics):

        value = metrics.get(rule["metric"])

        if value is None:
            return None

        threshold_match = check_threshold(
            value=value,
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