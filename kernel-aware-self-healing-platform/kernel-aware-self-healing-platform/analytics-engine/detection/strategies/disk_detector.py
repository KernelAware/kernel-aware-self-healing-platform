import logging
import math
import re

from detection.duration import check_duration, clear_duration
from detection.strategies.base_detector import DetectionStrategy
from detection.threshold import check_threshold
from incident_management.manager import manage_incidents
from load_data.system_metrics.metrics_loader import get_disk_metric, get_process_metric


logger = logging.getLogger(__name__)


def _target_type(target: dict) -> str:
    return str(target.get("target_type") or target.get("type") or "host").lower()


def _target_name(target: dict) -> str:
    return str(target.get("target") or target.get("name") or "Whole System")


def _effective_target(target_type: str, target_name: str, labels: dict) -> tuple[str, str] | None:
    if target_type in {"host", "system", "whole system"}:
        if labels.get("mountpoint"):
            return "filesystem", str(labels["mountpoint"])
        if labels.get("disk"):
            return "disk", str(labels["disk"])
        if labels.get("device"):
            return "disk", str(labels["device"])
        return "host", target_name or "Whole System"

    if target_type == "filesystem":
        mountpoint = labels.get("mountpoint")
        if mountpoint is not None and str(mountpoint) == target_name:
            return "filesystem", str(mountpoint)
        return None

    if target_type in {"disk", "device"}:
        observed_disk = labels.get("disk") or labels.get("device")
        if observed_disk is not None and str(observed_disk) == target_name:
            return "disk", str(observed_disk)
        return None

    if target_type == "process":
        process_name, pid = _process_target(target_name)
        if str(labels.get("name") or "") != process_name:
            return None
        if pid and str(labels.get("pid") or "") != pid:
            return None
        return "process", target_name

    return None


def _process_target(target: str) -> tuple[str, str | None]:
    match = re.match(r"^(.*?)\s+\(PID\s+(\d+)\)$", target)
    return (match.group(1), match.group(2)) if match else (target, None)


def _query_metric(system_id, metric_name: str, target_type: str, target_name: str):
    # Process-scoped disk I/O is exported separately by the Process collector.
    # All other Disk metrics, including disk_usage_percent, come from the Disk
    # collector and must be queried by their actual Prometheus metric name.
    if target_type == "process" and metric_name in {"disk_read_bytes", "disk_write_bytes"}:
        process_name, pid = _process_target(target_name)
        samples = get_process_metric(system_id, process_name, {"metric": metric_name})
        if pid:
            samples = [sample for sample in samples if str((sample.get("metric") or {}).get("pid")) == pid]
        return samples
    return get_disk_metric(system_id, metric_name)


def _duration_identity(rule: dict, target_type: str, target: str, metric: str) -> dict:
    return {
        "category": "disk",
        "system_id": rule.get("system_id"),
        "rule_id": rule.get("id"),
        "target_type": target_type,
        "target": target,
        "pid": _process_target(target)[1] if target_type == "process" else None,
        "metric": metric,
    }


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
        "pid": _process_target(target)[1] if target_type == "process" else None,
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

        for target in rule.get("targets") or []:
            target_type = _target_type(target)
            target_name = _target_name(target)
            for metric in rule.get("metrics") or []:
                metric_name = str(metric.get("metric") or "")
                if not metric_name.startswith("disk_"):
                    logger.warning("Skipping unsupported Disk metric %r", metric_name)
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

                matched_target = False
                for result in results:
                    labels = result.get("metric") or {}
                    scoped_target = _effective_target(target_type, target_name, labels)
                    if scoped_target is None:
                        continue
                    matched_target = True
                    try:
                        value = float(result["value"][1])
                        threshold = float(metric["threshold"])
                    except (KeyError, TypeError, ValueError, IndexError):
                        logger.warning("Ignoring invalid Prometheus sample for %s", metric_name)
                        continue
                    if not math.isfinite(value) or not math.isfinite(threshold):
                        continue

                    effective_type, effective_name = scoped_target
                    scoped_identity = _duration_identity(
                        rule_info, effective_type, effective_name, metric_name
                    )
                    violated = check_threshold(value, metric.get("operator"), threshold)
                    if violated:
                        clear_duration(scoped_identity, phase="recovery")
                        if not check_duration(
                            scoped_identity,
                            metric.get("duration_seconds") or 0,
                        ):
                            continue
                        manage_incidents(
                            _incident(rule, effective_type, effective_name, metric, value),
                            condition_violated=True,
                        )
                        continue

                    clear_duration(scoped_identity, phase="trigger")
                    active = _incident(rule, effective_type, effective_name, metric, value)
                    recovery = next(
                        (
                            item for item in (rule.get("recovery") or [])
                            if item.get("verification_required", True)
                        ),
                        None,
                    )
                    if recovery is None:
                        manage_incidents(active, condition_violated=False)
                        continue

                    recovery_metric = str(recovery.get("metric") or metric_name)
                    recovery_identity = _duration_identity(
                        rule_info, effective_type, effective_name, recovery_metric
                    )
                    try:
                        recovery_results = _query_metric(system_id, recovery_metric, target_type, target_name)
                    except Exception:
                        logger.exception(
                            "Prometheus recovery query failed for Disk rule %s metric %s",
                            rule_info.get("id"), recovery_metric,
                        )
                        continue

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
                        continue
                    try:
                        recovery_value = float(recovery_result["value"][1])
                        recovery_threshold = float(recovery["recovery_threshold"])
                    except (KeyError, TypeError, ValueError, IndexError):
                        continue
                    if not math.isfinite(recovery_value) or not math.isfinite(recovery_threshold):
                        continue

                    if check_threshold(
                        recovery_value,
                        recovery.get("operator"),
                        recovery_threshold,
                    ):
                        if check_duration(
                            recovery_identity,
                            recovery.get("recovery_duration_seconds") or 0,
                            phase="recovery",
                        ):
                            active["value"] = recovery_value
                            manage_incidents(active, condition_violated=False)
                    else:
                        clear_duration(recovery_identity, phase="recovery")

                if results and not matched_target:
                    logger.warning(
                        "Prometheus metric %s has no series matching Disk target %s (%s)",
                        metric_name, target_name, target_type,
                    )

        return None
