import logging
import math

from detection.strategies.generic_detector import GenericDetector
from detection.duration import check_duration, clear_duration
from detection.threshold import check_threshold, is_supported_operator
from incident_management.manager import manage_incidents
from load_data.system_metrics.metrics_loader import (
    PROMETHEUS_SCRAPE_INTERVAL_SECONDS,
    build_metric_selector,
    query_prometheus,
)

logger = logging.getLogger(__name__)

RATE_WINDOW = "1m"

NETWORK_METRICS = {
    "download bandwidth": "network_interface_bytes_received_total",
    "upload bandwidth": "network_interface_bytes_sent_total",
    "incoming packet drop rate": "network_interface_drops_in_total",
}


def get_prometheus_metric(metric_name):
    """Map configured network metric names to Prometheus counters."""

    name = " ".join(str(metric_name or "").strip().lower().split())

    return NETWORK_METRICS.get(name)


def get_interface(target):
    """Extract the configured network interface from a rule target."""

    interface = (
        target.get("interface")
        or target.get("target")
        or target.get("name")
    )

    if interface is None:
        return None

    interface = str(interface).strip()

    if interface.lower() in {"", "host", "all", "none"}:
        return None

    return interface


class NetworkDetector(GenericDetector):

    def __init__(self):
        super().__init__("network")

    def detect(self, rule):

        if not isinstance(rule, dict) or not isinstance(
            rule.get("rule"), dict
        ):
            logger.warning("Skipping malformed network rule")
            return None

        rule_info = rule["rule"]

        system_id = rule_info.get("system_id")
        rule_id = rule_info.get("id")

        targets = rule.get("targets") or []
        metrics = rule.get("metrics") or []

        if not targets or not metrics:
            logger.warning(
                "Network rule has no targets or metrics: rule_id=%s",
                rule_id,
            )
            return None

        for target in targets:

            interface = get_interface(target)

            if not interface:
                logger.warning(
                    "Network interface missing: rule_id=%s target=%s",
                    rule_id,
                    target,
                )
                continue

            target_type = (
                target.get("target_type")
                or target.get("type")
                or "Network Interface"
            )

            for metric in metrics:

                configured_metric = str(
                    metric.get("metric") or ""
                ).strip()

                prometheus_metric = get_prometheus_metric(
                    configured_metric
                )

                if not prometheus_metric:
                    logger.warning(
                        "Unsupported network metric: rule_id=%s metric=%s",
                        rule_id,
                        configured_metric,
                    )
                    continue

                operator = metric.get("operator")

                if not is_supported_operator(operator):
                    logger.warning(
                        "Unsupported network operator: "
                        "rule_id=%s operator=%s",
                        rule_id,
                        operator,
                    )
                    continue

                try:
                    threshold = float(metric.get("threshold"))

                    duration_seconds = max(
                        0.0,
                        float(metric.get("duration_seconds") or 0),
                    )

                except (TypeError, ValueError):
                    logger.warning(
                        "Invalid network threshold or duration: "
                        "rule_id=%s metric=%s",
                        rule_id,
                        configured_metric,
                    )
                    continue

                # Unique duration identity for each rule, interface and metric.
                identity = {
                    "system_id": system_id,
                    "rule_id": rule_id,
                    "monitor_type": "network",
                    "target_type": target_type,
                    "target": interface,
                    "metric": configured_metric,
                }

                labels = {
                    "system_id": str(system_id),
                    "interface": interface,
                }

                # Query the relevant Prometheus network counter.
                try:
                    selector = build_metric_selector(
                        prometheus_metric,
                        labels,
                    )

                    freshness = (
                        max(
                            float(PROMETHEUS_SCRAPE_INTERVAL_SECONDS),
                            1.0,
                        )
                        * 1.25
                    )

                    # Convert the cumulative counter into a per-second rate.
                    # Only accept fresh Prometheus telemetry.
                    promql = (
                        f"rate({selector}[{RATE_WINDOW}]) "
                        f"and on(system_id, interface) "
                        f"((time() - timestamp({selector})) "
                        f"<= {freshness:g})"
                    )

                    results = query_prometheus(promql)

                except Exception:
                    logger.exception(
                        "Network Prometheus query failed: "
                        "rule_id=%s interface=%s metric=%s",
                        rule_id,
                        interface,
                        configured_metric,
                    )
                    continue

                if not results:
                    # Missing telemetry must not resolve an active incident.
                    logger.warning(
                        "Network metric unavailable: "
                        "rule_id=%s interface=%s metric=%s",
                        rule_id,
                        interface,
                        configured_metric,
                    )
                    continue

                # Ensure that the returned series belongs to this exact
                # system and network interface.
                matching_results = [
                    result
                    for result in results
                    if all(
                        str(
                            (result.get("metric") or {}).get(key)
                        ) == expected_value
                        for key, expected_value in labels.items()
                    )
                ]

                if len(matching_results) != 1:
                    logger.warning(
                        "Expected one Prometheus series but found %s: "
                        "rule_id=%s interface=%s metric=%s",
                        len(matching_results),
                        rule_id,
                        interface,
                        configured_metric,
                    )
                    continue

                try:
                    value = float(
                        matching_results[0]["value"][1]
                    )

                except (KeyError, TypeError, ValueError, IndexError):
                    logger.warning(
                        "Invalid Prometheus network value: rule_id=%s",
                        rule_id,
                    )
                    continue

                if not math.isfinite(value):
                    logger.warning(
                        "Non-finite network metric value: rule_id=%s",
                        rule_id,
                    )
                    continue

                # Use the existing shared threshold implementation.
                try:
                    violated = check_threshold(
                        value,
                        operator,
                        threshold,
                    )

                except Exception:
                    logger.exception(
                        "Network threshold evaluation failed: rule_id=%s",
                        rule_id,
                    )
                    continue

                severity = (
                    metric.get("severity")
                    or rule_info.get("severity")
                    or "Warning"
                )

                priority = (
                    metric.get("priority")
                    or rule_info.get("priority")
                    or "P2"
                )

                # Prepare the incident for the existing incident manager.
                incident = {
                    "rule_id": rule_id,
                    "system_id": system_id,
                    "monitor_type": "network",
                    "incident_type": "network",
                    "target_type": target_type,
                    "target": interface,
                    "metric": configured_metric,
                    "value": value,
                    "severity": severity,
                    "priority": priority,
                    "incident_priority": priority,
                    "violated_metric": {
                        "id": metric.get("id"),
                        "metric": configured_metric,
                        "operator": operator,
                        "threshold": threshold,
                        "duration_seconds": duration_seconds,
                    },
                }

                if violated:

                    # Check whether the violation has persisted long enough.
                    duration_completed = check_duration(
                        identity,
                        duration_seconds=duration_seconds,
                    )

                    if duration_completed:

                        manage_incidents(
                            incident,
                            condition_violated=True,
                        )

                        logger.warning(
                            "NETWORK VIOLATION CONFIRMED: "
                            "system_id=%s rule_id=%s interface=%s "
                            "metric=%s value=%s threshold=%s",
                            system_id,
                            rule_id,
                            interface,
                            configured_metric,
                            value,
                            threshold,
                        )

                    else:

                        logger.info(
                            "NETWORK VIOLATION PENDING: "
                            "rule_id=%s interface=%s metric=%s "
                            "duration=%s seconds",
                            rule_id,
                            interface,
                            configured_metric,
                            duration_seconds,
                        )

                else:

                    # Reset the duration timer and resolve any active incident.
                    if clear_duration(identity):

                        manage_incidents(
                            incident,
                            condition_violated=False,
                        )

                        logger.info(
                            "NETWORK CONDITION RECOVERED: "
                            "rule_id=%s interface=%s metric=%s value=%s",
                            rule_id,
                            interface,
                            configured_metric,
                            value,
                        )

        return None
