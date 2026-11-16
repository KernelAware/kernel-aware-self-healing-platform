import logging
import math

from detection.duration import check_duration, clear_duration
from detection.strategies.base_detector import DetectionStrategy
from detection.threshold import check_threshold
from incident_management.manager import manage_incidents
from load_data.system_metrics.metrics_loader import (
    PROMETHEUS_SCRAPE_INTERVAL_SECONDS,
    PROCESS_METRIC_REFRESH_INTERVAL_SECONDS,
    build_metric_selector,
    query_prometheus,
)


logger = logging.getLogger(__name__)

METRIC_ALIASES = {
    "Network Error Rate (Incoming)": "network_errors_in_total",
    "Network Throughput": "network_byte_sent_total",
    "Packet Loss": "network_drops_in_total",
}


class GenericDetector(DetectionStrategy):
    def __init__(self, monitor_type):
        self.monitor_type = monitor_type

    def detect(self, rule):
        rule_info = rule["rule"]
        system_id = rule_info.get("system_id")
        rule_id = rule_info.get("id")
        details = []

        for target in rule.get("targets") or [{"target": "host"}]:
            target_name = str(
                target.get("target")
                or target.get("name")
                or "host"
            )

            for metric in rule.get("metrics") or []:
                configured_name = str(metric.get("metric") or "")
                metric_name = METRIC_ALIASES.get(
                    configured_name,
                    configured_name,
                )
                labels = {"system_id": str(system_id)}
                if target.get("interface"):
                    labels["interface"] = str(target["interface"])

                identity = {
                    "category": self.monitor_type,
                    "system_id": system_id,
                    "rule_id": rule_id,
                    "target": target_name,
                    "metric": configured_name,
                    "operator": metric.get("operator"),
                    "threshold": metric.get("threshold"),
                }

                try:
                    selector = build_metric_selector(metric_name, labels)
                    freshness = max(
                        PROMETHEUS_SCRAPE_INTERVAL_SECONDS,
                        PROCESS_METRIC_REFRESH_INTERVAL_SECONDS,
                    ) * 1.25
                    results = query_prometheus(
                        f"({selector}) and "
                        f"((time() - timestamp({selector})) <= {freshness:g})"
                    )
                except Exception:
                    logger.exception(
                        "Prometheus query failed: system_id=%s rule_id=%s metric=%s",
                        system_id,
                        rule_id,
                        configured_name,
                    )
                    details.append(
                        f"metric={configured_name} target={target_name} "
                        "instant=DATA_UNAVAILABLE reason=prometheus_query_failed"
                    )
                    continue

                if not results:
                    details.append(
                        f"metric={configured_name} target={target_name} "
                        "instant=DATA_UNAVAILABLE reason=no_fresh_series"
                    )
                    continue

                for result in results:
                    try:
                        value = float(result["value"][1])
                        threshold = float(metric["threshold"])
                    except (KeyError, TypeError, ValueError, IndexError):
                        details.append(
                            f"metric={configured_name} target={target_name} "
                            "instant=ERROR reason=invalid_prometheus_sample"
                        )
                        continue

                    if not math.isfinite(value) or not math.isfinite(threshold):
                        details.append(
                            f"metric={configured_name} target={target_name} "
                            "instant=DATA_UNAVAILABLE reason=non_finite_sample"
                        )
                        continue

                    series_identity = {
                        **identity,
                        "series": result.get("metric") or {},
                    }
                    violated = check_threshold(
                        value,
                        metric.get("operator"),
                        threshold,
                    )
                    if not violated:
                        reset = clear_duration(series_identity)
                        if reset:
                            manage_incidents(
                                {
                                    "rule_id": rule_id,
                                    "system_id": system_id,
                                    "monitor_type": self.monitor_type,
                                    "incident_type": self.monitor_type,
                                    "target": target_name,
                                    "metric": configured_name,
                                },
                                condition_violated=False,
                            )
                        outcome = "NOT_VIOLATED"
                        timer = "RESET" if reset else "ERROR"
                    elif check_duration(
                        series_identity,
                        duration_seconds=metric.get("duration_seconds") or 0,
                    ):
                        manage_incidents(
                            {
                                "rule_id": rule_id,
                                "system_id": system_id,
                                "monitor_type": self.monitor_type,
                                "incident_type": self.monitor_type,
                                "incident_severity": rule_info.get("severity"),
                                "incident_priority": rule_info.get("priority"),
                                "target": target_name,
                                "violated_metric": metric,
                                "metric": configured_name,
                                "value": value,
                            },
                            condition_violated=True,
                        )
                        outcome = "INCIDENT_CREATED"
                        timer = "COMPLETED"
                    else:
                        outcome = "PENDING_DURATION"
                        timer = "STARTED_OR_RUNNING"

                    details.append(
                        f"metric={configured_name} target={target_name} "
                        f"value={value:g} operator={metric.get('operator')} "
                        f"threshold={threshold:g} instant="
                        f"{'VIOLATED' if violated else 'NOT_VIOLATED'} "
                        f"redis_timer={timer} outcome={outcome}"
                    )

        logger.info(
            "[RULE_EVAL] system_id=%s rule_id=%s monitor_type=%s %s",
            system_id,
            rule_id,
            self.monitor_type,
            " ; ".join(details) if details else "outcome=NO_DATA",
        )
        return None
