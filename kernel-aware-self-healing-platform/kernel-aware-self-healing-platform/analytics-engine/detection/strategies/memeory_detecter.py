
import logging
import math

from detection.strategies.base_detector import DetectionStrategy
from detection.threshold import check_threshold
from detection.duration import (
    check_duration,
    clear_duration,
    duration_snapshot,
)
from load_data.system_metrics.metrics_loader import (
    get_memory_metrics,
    MEMORY_METRICS_MAP,
)
from incident_management.manager import manage_incidents


logger = logging.getLogger(__name__)


class MemoryDetector(DetectionStrategy):

    def detect(self, rule):

        if not isinstance(rule, dict):
            logger.error("[MEMORY] Invalid rule structure")
            return None

        rule_details = rule.get("rule")

        if not isinstance(rule_details, dict):
            logger.error("[MEMORY] Missing rule details")
            return None

        if rule_details.get("status") != "ENABLED":
            return None

        system_id = rule_details.get("system_id")
        rule_id = rule_details.get("id")

        if system_id is None or rule_id is None:
            logger.error("[MEMORY] Missing system_id or rule_id")
            return None

        for metric in rule.get("metrics", []):

            metric_name = metric.get("metric")
            operator = metric.get("operator")
            threshold = metric.get("threshold")
            duration_seconds = metric.get("duration_seconds", 0)

            if metric_name not in MEMORY_METRICS_MAP:
                continue

            if operator is None or threshold is None:
                logger.warning(
                    "[MEMORY] Rule %s has incomplete metric configuration",
                    rule_id,
                )
                continue

            try:
                threshold = float(threshold)
                duration_seconds = int(duration_seconds)

                if not math.isfinite(threshold) or duration_seconds < 0:
                    raise ValueError("Invalid threshold or duration")

            except (TypeError, ValueError):
                logger.exception(
                    "[MEMORY] Invalid configuration for rule %s",
                    rule_id,
                )
                continue

            # Fetch the actual metric values from Prometheus.
            try:
                results = get_memory_metrics(
                    system_id=system_id,
                    metric_name=metric_name,
                )

            except Exception:
                logger.exception(
                    "[MEMORY] Failed to fetch metric %s for system %s",
                    metric_name,
                    system_id,
                )
                continue

            for result in results:

                labels = result.get("metric", {})
                value_data = result.get("value", [])

                if len(value_data) < 2:
                    logger.warning(
                        "[MEMORY] Invalid Prometheus result for %s",
                        metric_name,
                    )
                    continue

                try:
                    current_value = float(value_data[1])

                    if not math.isfinite(current_value):
                        raise ValueError("Metric value is not finite")

                except (TypeError, ValueError):
                    logger.warning(
                        "[MEMORY] Invalid value for metric %s",
                        metric_name,
                    )
                    continue

                target = (
                    labels.get("hostname")
                    or labels.get("instance")
                    or "host"
                )

                # Each rule, target and metric gets an independent timer.
                identity = {
                    "category": "memory",
                    "system_id": system_id,
                    "rule_id": rule_id,
                    "target": target,
                    "metric": metric_name,
                    "operator": operator,
                    "threshold": threshold,
                    "duration_seconds": duration_seconds,
                }

                try:
                    threshold_match = check_threshold(
                        current_value,
                        operator,
                        threshold,
                    )

                except Exception:
                    logger.exception(
                        "[MEMORY] Threshold evaluation failed for rule %s",
                        rule_id,
                    )
                    continue

                # Condition is no longer violated: clear its timer
                # and resolve any existing incident.
                if not threshold_match:

                    timer_cleared = clear_duration(identity)

                    if timer_cleared:
                        incident_metadata = {
                            "rule_id": rule_id,
                            "system_id": system_id,
                            "monitor_type": "memory",
                            "incident_type": "memory",
                            "severity": rule_details.get("severity"),
                            "priority": rule_details.get("priority"),
                            "target_type": (
                                    rule_details.get("target_type")
                                    or "Host"
                            ),
                            "target": target,
                            "pid": None,
                            "metric": metric_name,
                            "violated_metric": metric,
                        }

                        try:
                            manage_incidents(
                                incident_metadata,
                                condition_violated=False,
                            )

                        except Exception:
                            logger.exception(
                                "[MEMORY] Failed to resolve incident "
                                "for rule %s",
                                rule_id,
                            )

                    logger.info(
                        "[MEMORY] Rule %s: %s = %s; condition not violated",
                        rule_id,
                        metric_name,
                        current_value,
                    )

                    continue

                # Condition is violated: check whether it has persisted.
                try:
                    duration_match = check_duration(
                        identity,
                        duration_seconds=duration_seconds,
                    )

                except Exception:
                    logger.exception(
                        "[MEMORY] Duration evaluation failed for rule %s",
                        rule_id,
                    )
                    continue

                try:
                    snapshot = duration_snapshot(
                        identity,
                        duration_seconds,
                    )

                except Exception:
                    logger.exception(
                        "[MEMORY] Duration snapshot failed for rule %s",
                        rule_id,
                    )
                    snapshot = None

                logger.info(
                    "[MEMORY] Rule %s: %s = %s; "
                    "threshold violated; duration_match=%s; snapshot=%s",
                    rule_id,
                    metric_name,
                    current_value,
                    duration_match,
                    snapshot,
                )

                if not duration_match:
                    continue

                incident = {
                    "rule_id": rule_id,
                    "system_id": system_id,
                    "monitor_type": "memory",
                    "incident_type": "memory",
                    "severity": rule_details.get("severity"),
                    "priority": rule_details.get("priority"),
                    "target_type": (
                        rule_details.get("target_type")
                        or "Host"
                    ),
                    "target": target,
                    "pid": None,
                    "actions": rule.get("actions", []),
                    "violated_metric": metric,
                    "metric": metric_name,
                    "value": current_value,
                }

                try:
                    manage_incidents(
                        incident,
                        condition_violated=True,
                    )

                except Exception:
                    logger.exception(
                        "[MEMORY] Failed to manage incident for rule %s",
                        rule_id,
                    )

        return None
