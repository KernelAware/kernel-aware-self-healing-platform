import logging
import math

from detection.duration import check_duration, clear_duration
from detection.strategies.base_detector import DetectionStrategy
from detection.threshold import check_threshold
from incident_management.manager import manage_incidents
from load_data.system_metrics.metrics_loader import get_process_metric


logger = logging.getLogger(__name__)


class ProcessDetector(DetectionStrategy):
    def detect(self, rule):
        if not isinstance(rule, dict) or not isinstance(rule.get("rule"), dict):
            return None
        rule_info = rule["rule"]
        if str(rule_info.get("status", "ENABLED")).upper() != "ENABLED":
            return None

        system_id = rule_info.get("system_id")
        if system_id is None:
            logger.warning("Skipping Process rule %s without a system_id", rule_info.get("id"))
            return None

        for rule_target in rule.get("targets") or []:
            target_name = str(rule_target.get("target") or "")
            for metric in rule.get("metrics") or []:
                metric_name = str(metric.get("metric") or "")
                identity = {
                    "category": "process",
                    "system_id": system_id,
                    "rule_id": rule_info.get("id"),
                    "target": target_name,
                    "metric": metric_name,
                }
                try:
                    results = get_process_metric(system_id, target_name, metric)
                except Exception:
                    logger.exception(
                        "Prometheus query failed for Process rule %s metric %s",
                        rule_info.get("id"), metric_name,
                    )
                    continue

                for result in results:
                    labels = result.get("metric") or {}
                    try:
                        pid = str(labels["pid"])
                        current_value = float(result["value"][1])
                        threshold = float(metric["threshold"])
                    except (KeyError, TypeError, ValueError, IndexError):
                        continue
                    if not math.isfinite(current_value) or not math.isfinite(threshold):
                        continue

                    scoped_identity = {**identity, "pid": pid}
                    if check_threshold(current_value, metric.get("operator"), threshold):
                        if not check_duration(
                            scoped_identity,
                            metric.get("duration_seconds") or 0,
                        ):
                            continue
                        incident = {
                            "rule_id": rule_info.get("id"),
                            "system_id": system_id,
                            "monitor_type": "process",
                            "incident_type": "process",
                            "incident_severity": rule_info.get("severity"),
                            "incident_priority": rule_info.get("priority"),
                            "target_type": "process",
                            "target": target_name,
                            "pid": pid,
                            "actions": rule.get("actions") or [],
                            "violated_metric": {
                                **metric,
                                "id": metric.get("id"),
                                "metric": metric_name,
                                "threshold": threshold,
                            },
                            "metric": metric_name,
                            "value": current_value,
                        }
                        manage_incidents(incident, condition_violated=True)
                    else:
                        clear_duration(scoped_identity, phase="trigger")
                        manage_incidents(
                            {
                                "rule_id": rule_info.get("id"),
                                "system_id": system_id,
                                "monitor_type": "process",
                                "incident_type": "process",
                                "target_type": "process",
                                "target": target_name,
                                "pid": pid,
                                "violated_metric": {
                                    **metric,
                                    "metric": metric_name,
                                    "threshold": threshold,
                                },
                                "metric": metric_name,
                                "value": current_value,
                            },
                            condition_violated=False,
                        )

        return None
