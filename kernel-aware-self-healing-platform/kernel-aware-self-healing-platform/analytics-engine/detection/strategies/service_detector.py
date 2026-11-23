import logging

from detection.strategies.base_detector import DetectionStrategy
from detection.threshold import check_threshold
from detection.duration import check_duration, clear_duration, duration_snapshot
from load_data.system_metrics.metrics_loader import get_service_metric
from incident_management.manager import manage_incidents


logger = logging.getLogger(__name__)


class ServiceDetector(DetectionStrategy):

    def detect(self, rule):
        if rule is None:
            return None

        rule_info = rule["rule"]
        details = []
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
                        identity = {
                            "category": "service",
                            "system_id": rule["rule"]["system_id"],
                            "rule_id": rule["rule"].get("id"),
                            "target": result.get("metric", {}).get("name"),
                            "metric": metric.get("metric"),
                            "operator": metric.get("operator"),
                            "threshold": metric.get("threshold"),
                        }
                        reset = clear_duration(identity)
                        if reset:
                            monitor_type = rule["rule"].get("monitor_type") or "service"
                            manage_incidents(
                                {
                                    "rule_id": rule["rule"].get("id"),
                                    "system_id": rule["rule"].get("system_id"),
                                    "monitor_type": monitor_type,
                                    "incident_type": monitor_type,
                                    "target": f"{rule_target['target'].split('@pid=')[0]}.service",
                                    "metric": metric.get("metric"),
                                },
                                condition_violated=False,
                            )
                        details.append(
                            f"metric={metric.get('metric')} target_type=service "
                            f"target={service_name} value={current_value:g} "
                            f"operator={metric.get('operator')} threshold={metric.get('threshold')} "
                            f"instant=NOT_VIOLATED redis_timer={'RESET' if reset else 'ERROR'} elapsed=0s "
                            f"required={metric.get('duration_seconds', 0):g}s outcome=NOT_VIOLATED"
                        )
                        continue

                    duration_match = check_duration(
                        {
                            "category": "service",
                            "system_id": rule["rule"]["system_id"],
                            "rule_id": rule["rule"].get("id"),
                            "target": result.get("metric", {}).get("name"),
                            "metric": metric.get("metric"),
                            "operator": metric.get("operator"),
                            "threshold": metric.get("threshold"),
                        },
                        duration_seconds=metric["duration_seconds"]
                    )
                    timer_identity = {
                        "category": "service",
                        "system_id": rule["rule"]["system_id"],
                        "rule_id": rule["rule"].get("id"),
                        "target": result.get("metric", {}).get("name"),
                        "metric": metric.get("metric"),
                        "operator": metric.get("operator"),
                        "threshold": metric.get("threshold"),
                    }
                    timer_status, elapsed, remaining = duration_snapshot(
                        timer_identity,
                        metric["duration_seconds"],
                    )

                    if not duration_match:
                        details.append(
                            f"metric={metric.get('metric')} target_type=service "
                            f"target={service_name} value={current_value:g} "
                            f"operator={metric.get('operator')} threshold={metric.get('threshold')} "
                            f"instant=VIOLATED redis_timer={timer_status} elapsed={elapsed:.0f}s "
                            f"required={metric.get('duration_seconds', 0):g}s "
                            f"remaining={remaining if remaining is not None else 'unknown'}s outcome=PENDING_DURATION"
                        )
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
                    details.append(
                        f"metric={metric.get('metric')} target_type=service "
                        f"target={service_name} value={current_value:g} "
                        f"operator={metric.get('operator')} threshold={metric.get('threshold')} "
                        f"instant=VIOLATED redis_timer=COMPLETED "
                        f"elapsed={elapsed:.0f}s "
                        f"required={metric.get('duration_seconds', 0):g}s remaining=0s "
                        "outcome=INCIDENT_CREATED"
                    )

        logger.info(
            "[RULE_EVAL] system_id=%s rule_id=%s monitor_type=service %s",
            rule_info.get("system_id"),
            rule_info.get("id"),
            " ; ".join(details) if details else "outcome=DATA_UNAVAILABLE reason=no_prometheus_series",
        )
        return None
