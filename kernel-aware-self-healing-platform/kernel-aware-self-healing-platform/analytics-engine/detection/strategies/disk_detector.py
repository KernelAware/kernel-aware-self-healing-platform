import logging
import math
import re

from detection.duration import verify_prometheus_duration
from detection.strategies.base_detector import DetectionStrategy
from detection.threshold import check_threshold, is_supported_operator
from incident_management.manager import manage_incidents
from load_data.system_metrics.metrics_loader import get_disk_metric


logger = logging.getLogger(__name__)
PARTITION_METRICS = {
    "disk_partition_info",
    "disk_partition_total_gb",
    "disk_usage_percent",
}
PER_DISK_METRICS = {
    "disk_per_read_bytes",
    "disk_per_write_bytes",
    "disk_per_read_count",
    "disk_per_write_count",
    "disk_per_read_time_ms",
    "disk_per_write_time_ms",
    "disk_per_busy_time_ms",
    "disk_per_read_speed_mb",
    "disk_per_write_speed_mb",
    "disk_per_read_iops",
    "disk_per_write_iops",
    "disk_per_total_iops",
    "disk_per_read_latency_ms",
    "disk_per_write_latency_ms",
    "disk_per_busy_percentage",
}
HOST_METRICS = {
    "disk_read_bytes",
    "disk_write_bytes",
    "disk_read_count",
    "disk_write_count",
    "disk_read_time_ms",
    "disk_write_time_ms",
    "disk_busy_time_ms",
    "disk_read_speed_mb",
    "disk_write_speed_mb",
    "disk_read_iops",
    "disk_write_iops",
    "disk_total_iops",
    "disk_read_latency_ms",
    "disk_write_latency_ms",
    "disk_busy_percentage",
}
SUPPORTED_DISK_METRICS = PARTITION_METRICS | PER_DISK_METRICS | HOST_METRICS
HOST_TARGET_TYPES = {"host", "system", "whole system"}
SUPPORTED_TARGET_TYPES = HOST_TARGET_TYPES | {"partition", "filesystem", "disk", "device"}
PARTITION_DEVICE_PATTERN = re.compile(
    r"^(?P<disk>(?:nvme\d+n\d+|mmcblk\d+|(?:sd|vd|xvd|hd)[a-z]+|loop\d+|md\d+|dm-\d+))p?\d+$"
)


def _target_type(target: dict) -> str:
    return str(target.get("target_type") or target.get("type") or "host").lower()


def _target_name(target: dict) -> str:
    return str(target.get("target") or target.get("name") or "Whole System")


def _partition_disk_name(target_name: str) -> str:
    """Map common Linux partition device names to the exporter disk label."""
    device_name = str(target_name).rstrip("/").rsplit("/", 1)[-1]
    match = PARTITION_DEVICE_PATTERN.fullmatch(device_name)
    return match.group("disk") if match else device_name


def _effective_target(target_type: str, target_name: str, labels: dict) -> tuple[str, str] | None:
    if target_type in {"host", "system", "whole system"}:
        # A host rule must resolve to the host-level series it selected.
        # Partition and per-disk series need an explicit partition target.
        if any(label in labels for label in ("disk", "device", "mountpoint", "filesystem")):
            return None
        return "host", target_name or "Whole System"

    if target_type == "filesystem":
        mountpoint = labels.get("mountpoint")
        if mountpoint is not None and str(mountpoint) == target_name:
            return "filesystem", str(mountpoint)
        return None

    if target_type == "partition":
        device = labels.get("device")
        if device is not None and str(device) == target_name:
            return "partition", str(device)
        disk = labels.get("disk")
        if disk is not None and str(disk) == _partition_disk_name(target_name):
            return "partition", target_name
        return None

    if target_type in {"disk", "device"}:
        observed_disk = labels.get("disk") or labels.get("device")
        if observed_disk is not None and str(observed_disk) == target_name:
            return "disk", str(observed_disk)
        return None

    return None


def _query_metric(system_id, metric_name: str, target_type: str, target_name: str):
    # All Disk metrics come from the Disk collector and use their actual
    # Prometheus metric names and label sets.
    # Metrics such as disk_busy_time_ms are exposed as gauges whose values are
    # cumulative milliseconds; the configured threshold is kept in that raw
    # unit and duration is checked over the complete Prometheus sample range.
    if target_type in HOST_TARGET_TYPES:
        # Host rules use aggregate series; per-disk and per-partition families
        # require a specific target.
        if metric_name not in HOST_METRICS:
            return []
        return get_disk_metric(system_id, metric_name, require_freshness=True)

    if target_type == "partition":
        if metric_name in PER_DISK_METRICS:
            return get_disk_metric(
                system_id, metric_name, {"disk": _partition_disk_name(target_name)},
                require_freshness=True,
            )
        if metric_name not in PARTITION_METRICS:
            return []
        return get_disk_metric(
            system_id, metric_name, {"device": target_name}, require_freshness=True
        )

    if target_type == "filesystem":
        if metric_name not in PARTITION_METRICS:
            return []
        return get_disk_metric(
            system_id, metric_name, {"mountpoint": target_name}, require_freshness=True
        )

    if target_type in {"disk", "device"}:
        if metric_name in PER_DISK_METRICS:
            return get_disk_metric(
                system_id, metric_name, {"disk": target_name}, require_freshness=True
            )
        if metric_name in PARTITION_METRICS:
            return get_disk_metric(
                system_id, metric_name, {"device": target_name}, require_freshness=True
            )
        return []

    return []


def _unique_samples(results, target_type: str, target_name: str):
    """Collapse duplicate Prometheus series to one latest sample per rule target."""
    latest = {}
    for result in results:
        scoped_target = _effective_target(target_type, target_name, result.get("metric") or {})
        if scoped_target is None:
            continue
        try:
            timestamp = float((result.get("value") or [0])[0])
        except (TypeError, ValueError, IndexError):
            timestamp = 0
        previous = latest.get(scoped_target)
        if previous is None or timestamp > previous[0]:
            latest[scoped_target] = (timestamp, result)
    return [(target, sample) for target, (_, sample) in latest.items()]


def _incident(rule: dict, target_type: str, target: str, metric: dict, value: float) -> dict:
    rule_info = rule.get("rule", {})
    metric_name = str(metric.get("metric") or metric.get("name") or "")
    return {
        "rule_id": rule_info.get("id"),
        "system_id": rule_info.get("system_id"),
        "monitor_type": "disk",
        "incident_type": "disk",
        "incident_severity": rule_info.get("severity"),
        "incident_priority": rule_info.get("priority"),
        "target_type": target_type,
        "target": target,
        "violated_metric": {
            "id": metric.get("id"),
            "metric": metric_name,
            "operator": metric.get("operator"),
            "threshold": float(metric.get("threshold")),
            "duration_seconds": int(metric.get("duration_seconds") or 0),
        },
        "metric": metric_name,
        "value": value,
    }


class DiskDetector(DetectionStrategy):
    def detect(self, rule):
        if not isinstance(rule, dict) or not isinstance(rule.get("rule"), dict):
            return None
        rule_info = rule["rule"]
        if str(rule_info.get("status", "ENABLED")).upper() != "ENABLED":
            return None

        system_id = rule_info.get("system_id")
        if system_id is None:
            logger.warning("Skipping Disk rule %s without a system_id", rule_info.get("id"))
            return None

        targets = rule.get("targets") or []
        metrics = rule.get("metrics") or []
        if not targets:
            logger.warning("Skipping Disk rule %s without targets", rule_info.get("id"))
            return None
        if not metrics:
            logger.warning("Skipping Disk rule %s without metrics", rule_info.get("id"))
            return None

        seen_targets = set()
        for target in targets:
            if not isinstance(target, dict):
                logger.warning("Skipping malformed target in Disk rule %s", rule_info.get("id"))
                continue
            target_type = _target_type(target)
            target_name = _target_name(target)
            if target_type == "process":
                logger.warning(
                    "Ignoring Process target in Disk rule %s; Disk rules support host or partition targets",
                    rule_info.get("id"),
                )
                continue
            if target_type not in SUPPORTED_TARGET_TYPES:
                logger.warning(
                    "Skipping Disk rule %s target %s: unsupported target type %r",
                    rule_info.get("id"), target_name, target_type,
                )
                continue
            target_key = (target_type, target_name)
            if target_key in seen_targets:
                continue
            seen_targets.add(target_key)
            for metric in metrics:
                if not isinstance(metric, dict):
                    logger.warning("Skipping malformed metric in Disk rule %s", rule_info.get("id"))
                    continue
                metric_name = str(metric.get("metric") or "")
                if metric_name not in SUPPORTED_DISK_METRICS:
                    logger.warning(
                        "Skipping Disk rule %s metric %r for target %s (%s): metric is not exported by the Disk collector",
                        rule_info.get("id"), metric_name, target_name, target_type,
                    )
                    continue
                if not is_supported_operator(metric.get("operator")):
                    logger.warning(
                        "Skipping Disk rule %s metric %r with unsupported operator %r",
                        rule_info.get("id"), metric_name, metric.get("operator"),
                    )
                    continue
                if target_type in HOST_TARGET_TYPES and metric_name not in HOST_METRICS:
                    logger.warning(
                        "Skipping Disk rule %s metric %r: %s metrics cannot be used with a whole-system target",
                        rule_info.get("id"), metric_name,
                        "Per-disk" if metric_name in PER_DISK_METRICS else "Per-partition",
                    )
                    continue
                if target_type in {"partition", "filesystem", "disk", "device"} and metric_name in HOST_METRICS:
                    logger.warning(
                        "Skipping Disk rule %s metric %r for target %s (%s): metric has no per-target labels",
                        rule_info.get("id"), metric_name, target_name, target_type,
                    )
                    continue
                try:
                    results = _query_metric(system_id, metric_name, target_type, target_name)
                except Exception:
                    logger.exception(
                        "Prometheus query failed for Disk rule %s metric %s",
                        rule_info.get("id"), metric_name,
                    )
                    # A query failure is unknown state, not evidence of recovery.
                    continue

                if not results:
                    logger.warning(
                        "Prometheus returned no series for Disk rule %s metric %s target %s (%s)",
                        rule_info.get("id"), metric_name, target_name, target_type,
                    )
                    continue

                samples = _unique_samples(results, target_type, target_name)
                matched_target = bool(samples)
                for scoped_target, result in samples:
                    try:
                        value = float(result["value"][1])
                        threshold = float(metric["threshold"])
                    except (KeyError, TypeError, ValueError, IndexError):
                        logger.warning("Ignoring invalid Prometheus sample for %s", metric_name)
                        continue
                    if not math.isfinite(value) or not math.isfinite(threshold):
                        continue

                    effective_type, effective_name = scoped_target
                    violated = check_threshold(value, metric.get("operator"), threshold)
                    if violated:
                        try:
                            sustained, reason = verify_prometheus_duration(
                                metric_name,
                                result.get("metric") or {},
                                metric.get("operator"),
                                threshold,
                                metric.get("duration_seconds") or 0,
                            )
                        except Exception:
                            logger.exception(
                                "Prometheus duration query failed for Disk rule %s metric %s",
                                rule_info.get("id"), metric_name,
                            )
                            continue
                        if reason:
                            logger.warning(
                                "Cannot verify duration for Disk rule %s metric %s target %s: %s",
                                rule_info.get("id"), metric_name, effective_name, reason,
                            )
                        if not sustained:
                            continue
                        severity = rule_info.get("severity")
                        logger.info(
                            "Confirmed Disk rule violation: rule_id=%s metric=%s target=%s target_type=%s value=%s operator=%s threshold=%s severity=%s duration_seconds=%s",
                            rule_info.get("id"),
                            metric_name,
                            effective_name,
                            effective_type,
                            value,
                            metric.get("operator"),
                            threshold,
                            severity,
                            metric.get("duration_seconds") or 0,
                        )
                        manage_incidents(
                            _incident(rule, effective_type, effective_name, metric, value),
                            condition_violated=True,
                        )
                        continue

                    active = _incident(rule, effective_type, effective_name, metric, value)
                    recovery_rows = rule.get("recovery") or []
                    if any(not isinstance(item, dict) for item in recovery_rows):
                        logger.warning("Skipping malformed recovery configuration for Disk rule %s", rule_info.get("id"))
                        continue
                    recoveries = [item for item in recovery_rows if item.get("verification_required", True)]
                    if not recoveries:
                        manage_incidents(active, condition_violated=False)
                        continue

                    recovery_satisfied = True
                    recovery_value = None
                    for recovery in recoveries:
                        if not is_supported_operator(recovery.get("operator")):
                            logger.warning(
                                "Invalid recovery operator for Disk rule %s metric %s",
                                rule_info.get("id"), recovery.get("metric"),
                            )
                            recovery_satisfied = False
                            break
                        recovery_metric = str(recovery.get("metric") or metric_name)
                        try:
                            recovery_results = _query_metric(
                                system_id, recovery_metric, target_type, target_name
                            )
                        except Exception:
                            logger.exception(
                                "Prometheus recovery query failed for Disk rule %s metric %s",
                                rule_info.get("id"), recovery_metric,
                            )
                            recovery_satisfied = False
                            break
                        recovery_result = next(
                            (
                                sample for sample in recovery_results
                                if _effective_target(
                                    target_type, target_name, sample.get("metric") or {}
                                ) == scoped_target
                            ),
                            None,
                        )
                        if recovery_result is None:
                            logger.warning(
                                "No Prometheus recovery series for Disk rule %s metric %s target %s",
                                rule_info.get("id"), recovery_metric, effective_name,
                            )
                            recovery_satisfied = False
                            break
                        try:
                            recovery_value = float(recovery_result["value"][1])
                            recovery_threshold = float(recovery["recovery_threshold"])
                        except (KeyError, TypeError, ValueError, IndexError):
                            logger.warning(
                                "Invalid recovery configuration/sample for Disk rule %s metric %s",
                                rule_info.get("id"), recovery_metric,
                            )
                            recovery_satisfied = False
                            break
                        if not math.isfinite(recovery_value) or not math.isfinite(recovery_threshold):
                            recovery_satisfied = False
                            break
                        if not check_threshold(
                            recovery_value,
                            recovery.get("operator"),
                            recovery_threshold,
                        ):
                            recovery_satisfied = False
                            break
                        try:
                            sustained, reason = verify_prometheus_duration(
                                recovery_metric,
                                recovery_result.get("metric") or {},
                                recovery.get("operator"),
                                recovery_threshold,
                                recovery.get("recovery_duration_seconds") or 0,
                            )
                        except Exception:
                            logger.exception(
                                "Prometheus recovery duration query failed for Disk rule %s metric %s",
                                rule_info.get("id"), recovery_metric,
                            )
                            recovery_satisfied = False
                            break
                        if reason:
                            logger.warning(
                                "Cannot verify recovery duration for Disk rule %s metric %s target %s: %s",
                                rule_info.get("id"), recovery_metric, effective_name, reason,
                            )
                        if not sustained:
                            recovery_satisfied = False
                            break

                    if recovery_satisfied:
                        if recovery_value is not None:
                            active["value"] = recovery_value
                        manage_incidents(active, condition_violated=False)

                if results and not matched_target:
                    logger.warning(
                        "Prometheus metric %s has no series matching Disk target %s (%s)",
                        metric_name, target_name, target_type,
                    )

        return None
