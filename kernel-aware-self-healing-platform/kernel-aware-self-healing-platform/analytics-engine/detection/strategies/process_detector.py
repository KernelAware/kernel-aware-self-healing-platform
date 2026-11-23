import logging
import math

from detection.duration import (
    check_duration,
    clear_duration,
    duration_snapshot,
    verify_prometheus_duration,
)
from detection.strategies.base_detector import DetectionStrategy
from detection.threshold import check_threshold
from incident_management.manager import manage_incidents
from load_data.system_metrics.metrics_loader import (
    get_process_metric,
    get_process_metric_selector,
)


logger = logging.getLogger(__name__)


def _format_value(value):
    if value is None:
        return "missing"
    return str(value)


class ProcessDetector(DetectionStrategy):
    def detect(self, rule):
        if not isinstance(rule, dict) or not isinstance(rule.get("rule"), dict):
            return None

        rule_info = rule["rule"]
        if str(rule_info.get("status", "ENABLED")).upper() != "ENABLED":
            return None

        system_id = rule_info.get("system_id")
        rule_id = rule_info.get("id")
        details = []

        for rule_target in rule.get("targets") or []:
            target_name = str(rule_target.get("target") or "")

            for metric in rule.get("metrics") or []:
                metric_name = str(metric.get("metric") or "")
                operator = metric.get("operator")
                threshold = metric.get("threshold")
                duration = float(metric.get("duration_seconds") or 0)

                identity = {
                    "category": "process",
                    "system_id": system_id,
                    "rule_id": rule_id,
                    "target": target_name,
                    "metric": metric_name,
                    "operator": operator,
                    "threshold": threshold,
                    "duration_seconds": duration,
                }

                try:
                    canonical_metric, _selector = get_process_metric_selector(
                        system_id,
                        target_name,
                        metric,
                        require_freshness=True,
                    )
                    results = get_process_metric(
                        system_id,
                        target_name,
                        metric,
                        require_freshness=True,
                    )
                except ValueError as error:
                    details.append(
                        f"metric={metric_name} target={target_name} "
                        f"instant=ERROR reason={error}"
                    )
                    continue
                except Exception:
                    logger.exception(
                        "Process metric query failed: system_id=%s rule_id=%s "
                        "metric=%s target=%s",
                        system_id,
                        rule_id,
                        metric_name,
                        target_name,
                    )
                    details.append(
                        f"metric={metric_name} target={target_name} "
                        "instant=DATA_UNAVAILABLE reason=prometheus_query_failed"
                    )
                    continue

                if not results:
                    details.append(
                        f"metric={canonical_metric} target={target_name} "
                        "instant=DATA_UNAVAILABLE reason=no_fresh_series"
                    )
                    continue

                for result in results:
                    labels = result.get("metric") or {}
                    pid = str(labels.get("pid") or "")
                    series_identity = {**identity, "pid": pid}

                    try:
                        value = float(result["value"][1])
                        numeric_threshold = float(threshold)
                    except (KeyError, TypeError, ValueError, IndexError):
                        details.append(
                            f"metric={canonical_metric} target={target_name} "
                            "instant=ERROR reason=invalid_prometheus_sample"
                        )
                        continue

                    if not math.isfinite(value) or not math.isfinite(numeric_threshold):
                        details.append(
                            f"metric={canonical_metric} target={target_name} "
                            "instant=DATA_UNAVAILABLE reason=non_finite_sample"
                        )
                        continue

                    violated = check_threshold(
                        value,
                        operator,
                        numeric_threshold,
                    )

                    if not violated:
                        reset = clear_duration(series_identity)
                        if reset:
                            manage_incidents(
                                {
                                    "rule_id": rule_id,
                                    "system_id": system_id,
                                    "monitor_type": "process",
                                    "incident_type": "process",
                                    "target_type": "process",
                                    "target": target_name,
                                    "pid": pid,
                                    "metric": metric_name,
                                },
                                condition_violated=False,
                            )
                        details.append(
                            f"metric={canonical_metric} target={target_name} "
                            f"value={_format_value(value)} operator={operator} "
                            f"threshold={numeric_threshold} instant=NOT_VIOLATED "
                            f"redis_timer={'RESET' if reset else 'ERROR'} "
                            "elapsed=0s outcome=NOT_VIOLATED"
                        )
                        continue

                    completed = check_duration(
                        series_identity,
                        duration_seconds=duration,
                    )
                    timer_status, elapsed, remaining = duration_snapshot(
                        series_identity,
                        duration,
                    )

                    if completed:
                        incident = {
                            "rule_id": rule_id,
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
                                "metric": metric_name,
                                "threshold": numeric_threshold,
                            },
                            "metric": metric_name,
                            "value": value,
                        }
                        manage_incidents(incident, condition_violated=True)
                        timer_status = "COMPLETED"
                        outcome = "INCIDENT_CREATED"
                    else:
                        timer_status = timer_status
                        outcome = "PENDING_DURATION"

                    details.append(
                        f"metric={canonical_metric} target={target_name} "
                        f"pid={pid} value={_format_value(value)} operator={operator} "
                        f"threshold={numeric_threshold} instant=VIOLATED "
                        f"redis_timer={timer_status} elapsed={elapsed:.0f}s "
                        f"required={duration:g}s "
                        f"remaining={remaining if remaining is not None else 'unknown'}s "
                        f"outcome={outcome}"
                    )

        logger.info(
            "[RULE_EVAL] system_id=%s rule_id=%s monitor_type=process %s",
            system_id,
            rule_id,
            " ; ".join(details) if details else "outcome=NO_DATA",
        )
        return None
