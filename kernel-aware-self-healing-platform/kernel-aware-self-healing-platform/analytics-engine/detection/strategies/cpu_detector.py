from detection.strategies.base_detector import DetectionStrategy
from detection.threshold import check_threshold
from detection.duration import check_duration, clear_duration, duration_snapshot
from load_data.system_metrics.metrics_loader import get_cpu_metric
from incident_management.manager import manage_incidents


import logging


logger = logging.getLogger(__name__)


class CpuDetector(DetectionStrategy):

    def detect(self, rule):
        if rule is None:
            return None

        system_id = rule["rule"]["system_id"]
        rule_id = rule["rule"].get("id")
        details = []

        for metric in rule["metrics"]:
            results = get_cpu_metric(
                system_id=system_id,
                metric=metric,
            )

            identity_base = {
                "category": "cpu",
                "system_id": system_id,
                "rule_id": rule["rule"].get("id"),
                "metric": metric.get("metric"),
                "operator": metric.get("operator"),
                "threshold": metric.get("threshold"),
            }

            for result in results:
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
                current_value = float(result["value"][1])
                threshold_match = check_threshold(
                    value=current_value,
                    operator=metric["operator"],
                    threshold=metric["threshold"],
                )
                if not threshold_match:
                    identity = {
                        **identity_base,
                        "target": target,
                    }
                    reset = clear_duration(identity)
                    if reset:
                        manage_incidents({
                            "rule_id": rule_id,
                            "system_id": system_id,
                            "monitor_type": "cpu",
                            "incident_type": "cpu",
                            "target": target,
                            "pid": None,
                            "metric": metric.get("metric"),
                        }, condition_violated=False)
                    details.append(
                        f"metric={metric.get('metric')} target_type=host target={target} "
                        f"value={current_value:g} operator={metric.get('operator')} "
                        f"threshold={metric.get('threshold')} instant=NOT_VIOLATED "
                        f"redis_timer={'RESET' if reset else 'ERROR'} elapsed=0s "
                        f"required={metric.get('duration_seconds', 0):g}s outcome=NOT_VIOLATED"
                    )
                    continue

                duration_match = check_duration(
                    {
                        **identity_base,
                        "target": target,
                    },
                    duration_seconds=metric["duration_seconds"],
                )
                timer_status, elapsed, remaining = duration_snapshot(
                    {
                        **identity_base,
                        "target": target,
                    },
                    metric["duration_seconds"],
                )
                if not duration_match:
                    details.append(
                        f"metric={metric.get('metric')} target_type=host target={target} "
                        f"value={current_value:g} operator={metric.get('operator')} "
                        f"threshold={metric.get('threshold')} instant=VIOLATED "
                        f"redis_timer={timer_status} elapsed={elapsed:.0f}s "
                        f"required={metric.get('duration_seconds', 0):g}s "
                        f"remaining={remaining if remaining is not None else 'unknown'}s outcome=PENDING_DURATION"
                    )
                    continue

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
                manage_incidents(incident)
                details.append(
                    f"metric={metric.get('metric')} target_type=host target={target} "
                    f"value={current_value:g} operator={metric.get('operator')} "
                    f"threshold={metric.get('threshold')} instant=VIOLATED "
                    f"redis_timer=COMPLETED elapsed={elapsed:.0f}s "
                    f"required={metric.get('duration_seconds', 0):g}s remaining=0s "
                    "outcome=INCIDENT_CREATED"
                )

        logger.info(
            "[RULE_EVAL] system_id=%s rule_id=%s monitor_type=cpu %s",
            system_id,
            rule_id,
            " ; ".join(details) if details else "outcome=DATA_UNAVAILABLE reason=no_prometheus_series",
        )
        return None
