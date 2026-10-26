import logging
import math
import re
import time

from detection.disk_duration import (
    DiskDurationStateError,
    clear_disk_violation,
    disk_condition_key,
    get_disk_violation_state,
    mark_disk_incident_active,
    mark_disk_resolution_pending,
    observe_disk_violation,
)
from detection.strategies.base_detector import DetectionStrategy
from detection.threshold import check_threshold, is_supported_operator
from incident_management.manager import manage_disk_incident
from load_data.system_metrics.metrics_loader import get_disk_metric


logger = logging.getLogger(__name__)

# Intrinsic label sets declared by monitoring-agent/sender/exporter_disk.py.
# Prometheus adds system_id through the scrape configuration.
DISK_EXPORTER_METRIC_LABELS = {
    "disk_partition_info": frozenset({"device", "mountpoint", "filesystem"}),
    "disk_partition_total_gb": frozenset({"device", "mountpoint", "filesystem"}),
    "disk_usage_percent": frozenset({"device", "mountpoint", "filesystem"}),
    "disk_read_bytes": frozenset(),
    "disk_write_bytes": frozenset(),
    "disk_read_count": frozenset(),
    "disk_write_count": frozenset(),
    "disk_read_time_ms": frozenset(),
    "disk_write_time_ms": frozenset(),
    "disk_busy_time_ms": frozenset(),
    "disk_per_read_bytes": frozenset({"disk"}),
    "disk_per_write_bytes": frozenset({"disk"}),
    "disk_per_read_count": frozenset({"disk"}),
    "disk_per_write_count": frozenset({"disk"}),
    "disk_per_read_time_ms": frozenset({"disk"}),
    "disk_per_write_time_ms": frozenset({"disk"}),
    "disk_per_busy_time_ms": frozenset({"disk"}),
    "disk_read_speed_mb": frozenset(),
    "disk_write_speed_mb": frozenset(),
    "disk_per_read_speed_mb": frozenset({"disk"}),
    "disk_per_write_speed_mb": frozenset({"disk"}),
    "disk_read_iops": frozenset(),
    "disk_write_iops": frozenset(),
    "disk_total_iops": frozenset(),
    "disk_per_read_iops": frozenset({"disk"}),
    "disk_per_write_iops": frozenset({"disk"}),
    "disk_per_total_iops": frozenset({"disk"}),
    "disk_read_latency_ms": frozenset(),
    "disk_write_latency_ms": frozenset(),
    "disk_per_read_latency_ms": frozenset({"disk"}),
    "disk_per_write_latency_ms": frozenset({"disk"}),
    "disk_busy_percentage": frozenset(),
    "disk_per_busy_percentage": frozenset({"disk"}),
}

WHOLE_SYSTEM_SCOPE = "whole_system"
PARTITION_SCOPE = "partition"
PER_DISK_SCOPE = "per_disk"
PARTITION_LABELS = frozenset({"device", "mountpoint", "filesystem"})
PER_DISK_LABELS = frozenset({"disk"})
HOST_TARGET_TYPES = {"host", "system", "whole system"}
PARTITION_TARGET_TYPES = {"partition", "filesystem"}
SUPPORTED_TARGET_TYPES = HOST_TARGET_TYPES | PARTITION_TARGET_TYPES | {"disk", "device"}
PARTITION_DEVICE_PATTERN = re.compile(
    r"^(?P<disk>(?:nvme\d+n\d+|mmcblk\d+|(?:sd|vd|xvd|hd)[a-z]+|loop\d+|md\d+|dm-\d+))p?\d+$"
)


def normalize_disk_metric_name(metric_name) -> str:
    return str(metric_name or "").strip().lower()


def classify_disk_metric_scope(metric_name) -> str | None:
    """Return the target scope from the label layout exposed by the exporter."""
    labels = DISK_EXPORTER_METRIC_LABELS.get(normalize_disk_metric_name(metric_name))
    if labels == PARTITION_LABELS:
        return PARTITION_SCOPE
    if labels == PER_DISK_LABELS:
        return PER_DISK_SCOPE
    if labels == frozenset():
        return WHOLE_SYSTEM_SCOPE
    return None


def _metric_target_error(metric_name: str, target_type: str) -> str | None:
    metric_name = normalize_disk_metric_name(metric_name)
    scope = classify_disk_metric_scope(metric_name)
    if scope is None:
        return f"{metric_name or '<empty>'} is not declared by the Disk exporter"
    if target_type in HOST_TARGET_TYPES:
        if scope != WHOLE_SYSTEM_SCOPE:
            return "partition and per-disk metrics require a specific Disk target"
        return None
    if target_type in PARTITION_TARGET_TYPES:
        if scope not in {PARTITION_SCOPE, PER_DISK_SCOPE}:
            return "whole-system metrics cannot be evaluated against a partition target"
        return None
    if target_type in {"disk", "device"}:
        if scope != PER_DISK_SCOPE:
            return "only per-disk metrics can be evaluated against a disk target"
        return None
    return f"target type {target_type!r} cannot be matched to Disk metric labels"


def _target_type(target: dict) -> str:
    return str(target.get("target_type") or target.get("type") or "host").strip().lower()


def _target_name(target: dict, target_type: str) -> str:
    raw_name = target.get("target") if target.get("target") is not None else target.get("name")
    name = str(raw_name or "").strip()
    if target_type in HOST_TARGET_TYPES and (not name or " ".join(name.split()).casefold() == "whole system"):
        return "Whole System"
    return name


def _disk_label_name(target_name: str) -> str:
    device_name = str(target_name).strip().rstrip("/").rsplit("/", 1)[-1]
    match = PARTITION_DEVICE_PATTERN.fullmatch(device_name)
    return match.group("disk") if match else device_name


def _partition_selector(target_type: str, target_name: str) -> dict:
    name = str(target_name or "").strip()
    if target_type == "filesystem" or (name.startswith("/") and not name.startswith("/dev/")):
        return {"mountpoint": name}
    return {"device": name if name.startswith("/dev/") else f"/dev/{name}"}


def _resolve_partition_disk_label(system_id, target_type: str, target_name: str) -> tuple[str | None, str | None]:
    """Map a selected partition or mountpoint to the collector's block-device label."""
    selector = _partition_selector(target_type, target_name)
    rows = get_disk_metric(system_id, "disk_partition_info", selector, require_freshness=True)
    devices = {
        str((row.get("metric") or {}).get("device") or "").strip()
        for row in rows
        if (row.get("metric") or {}).get("device")
    }
    if not devices:
        return None, f"no fresh disk_partition_info series matches {selector}"
    if len(devices) != 1:
        return None, f"partition target {target_name!r} resolves to multiple devices"
    return _disk_label_name(next(iter(devices))), None


def _effective_target(
    metric_name: str,
    target_type: str,
    target_name: str,
    labels: dict,
    partition_disk_label: str | None = None,
) -> tuple[str, str] | None:
    metric_name = normalize_disk_metric_name(metric_name)
    if _metric_target_error(metric_name, target_type):
        return None
    scope = classify_disk_metric_scope(metric_name)
    metric_labels = DISK_EXPORTER_METRIC_LABELS[metric_name]
    if not all(label in labels for label in metric_labels):
        return None

    if target_type in HOST_TARGET_TYPES:
        if any(label in labels for label in PARTITION_LABELS | PER_DISK_LABELS):
            return None
        return ("host", target_name or "Whole System") if scope == WHOLE_SYSTEM_SCOPE else None

    if target_type in PARTITION_TARGET_TYPES:
        if scope == PARTITION_SCOPE:
            if target_type == "filesystem":
                matches = str(labels.get("mountpoint") or "") == target_name
            else:
                expected = target_name if target_name.startswith("/dev/") else f"/dev/{target_name}"
                matches = str(labels.get("device") or "") == expected
            return (target_type, target_name) if matches else None
        observed_disk = labels.get("disk")
        matches = partition_disk_label and str(observed_disk or "") == partition_disk_label
        return (target_type, target_name) if matches else None

    if target_type in {"disk", "device"}:
        matches = str(labels.get("disk") or "") == _disk_label_name(target_name)
        return (target_type, target_name) if scope == PER_DISK_SCOPE and matches else None
    return None


def _query_metric(
    system_id,
    metric_name: str,
    target_type: str,
    target_name: str,
    partition_disk_label: str | None = None,
):
    metric_name = normalize_disk_metric_name(metric_name)
    if _metric_target_error(metric_name, target_type):
        return []

    scope = classify_disk_metric_scope(metric_name)
    if scope == WHOLE_SYSTEM_SCOPE:
        return get_disk_metric(system_id, metric_name, require_freshness=True)
    if scope == PARTITION_SCOPE:
        return get_disk_metric(
            system_id,
            metric_name,
            _partition_selector(target_type, target_name),
            require_freshness=True,
        )
    if target_type in PARTITION_TARGET_TYPES:
        if not partition_disk_label:
            return []
        labels = {"disk": partition_disk_label}
    else:
        labels = {"disk": _disk_label_name(target_name)}
    return get_disk_metric(system_id, metric_name, labels, require_freshness=True)


def _series_identity(metric_name: str, labels: dict) -> tuple:
    declared_labels = DISK_EXPORTER_METRIC_LABELS[normalize_disk_metric_name(metric_name)]
    return tuple((label, str(labels.get(label))) for label in sorted(declared_labels))


def _unique_samples(results, metric_name, target_type, target_name, partition_disk_label=None):
    """Keep the newest sample per exporter-defined series without aggregation."""
    latest = {}
    for result in results:
        labels = result.get("metric") or {}
        scoped_target = _effective_target(
            metric_name, target_type, target_name, labels, partition_disk_label
        )
        if scoped_target is None:
            continue
        try:
            timestamp = float((result.get("value") or [0])[0])
        except (TypeError, ValueError, IndexError):
            timestamp = 0
        key = (scoped_target, _series_identity(metric_name, labels))
        if key not in latest or timestamp > latest[key][0]:
            latest[key] = (timestamp, (scoped_target, result))
    return [sample for _, sample in latest.values()]


def _condition_identity(
    system_id,
    rule_id,
    target_index,
    target_type,
    target_name,
    metric_index,
    metric,
    metric_name,
    target_series,
    duration_seconds,
):
    return {
        "system_id": str(system_id),
        "rule_id": str(rule_id),
        "target_index": target_index,
        "target_type": target_type,
        "target": target_name,
        "metric_index": metric_index,
        "metric_id": metric.get("id") or metric.get("metric_id"),
        "metric": metric_name,
        "series": list(target_series),
        "operator": metric.get("operator"),
        "threshold": float(metric["threshold"]),
        "duration_seconds": duration_seconds,
    }


def _incident(rule, target_type, target, metric, metric_name, value, identity, labels):
    rule_info = rule.get("rule", {})
    duration_seconds = int(metric.get("duration_seconds") or 0)
    return {
        "rule_id": rule_info.get("id"),
        "system_id": rule_info.get("system_id"),
        "monitor_type": "disk",
        "incident_type": "disk",
        "incident_severity": rule_info.get("severity"),
        "incident_priority": rule_info.get("priority"),
        "target_type": target_type,
        "target": target,
        "series_labels": {
            key: str(labels[key]) for key in sorted(DISK_EXPORTER_METRIC_LABELS[metric_name])
            if key in labels
        },
        "disk_condition_key": disk_condition_key(identity),
        "violated_metric": {
            "id": metric.get("id"),
            "metric": metric_name,
            "operator": metric.get("operator"),
            "threshold": float(metric["threshold"]),
            "duration_seconds": duration_seconds,
        },
        "metric": metric_name,
        "value": value,
    }


def _rule_result(rule_id, system_id, outcome, reason=None, **details):
    detail_text = ", ".join(f"{key}={value}" for key, value in details.items()) or "none"
    logger.info(
        "Disk rule evaluation result: system_id=%s rule_id=%s outcome=%s reason=%s details=%s",
        system_id,
        rule_id,
        outcome,
        reason or "none",
        detail_text,
    )
    return {"system_id": system_id, "rule_id": rule_id, "outcome": outcome, "reason": reason, **details}


def _log_metric_start(system_id, rule_id, metric, target_type, target_name):
    metric_name = normalize_disk_metric_name(
        metric.get("metric") or metric.get("name") if isinstance(metric, dict) else ""
    ) or "<malformed>"
    logger.warning(
        "[DISK_RULE] START system_id=%s rule_id=%s metric=%s target_type=%s target=%s operator=%s threshold=%s duration_seconds=%s",
        system_id,
        rule_id,
        metric_name,
        target_type,
        target_name,
        metric.get("operator") if isinstance(metric, dict) else "<malformed>",
        metric.get("threshold") if isinstance(metric, dict) else "<malformed>",
        metric.get("duration_seconds", 0) if isinstance(metric, dict) else "<malformed>",
    )
    return metric_name


def _log_metric_final(system_id, rule_id, metric_name, target_type, target_name, outcome, reason=None):
    logger.warning(
        "[DISK_RULE] FINAL system_id=%s rule_id=%s metric=%s target_type=%s target=%s outcome=%s reason=%s",
        system_id,
        rule_id,
        metric_name,
        target_type,
        target_name,
        outcome,
        reason or "none",
    )


class DiskDetector(DetectionStrategy):
    def detect(self, rule):
        if not isinstance(rule, dict) or not isinstance(rule.get("rule"), dict):
            return _rule_result(None, None, "skipped", "malformed rule payload")
        rule_info = rule["rule"]
        rule_id = rule_info.get("id")
        system_id = rule_info.get("system_id")
        if str(rule_info.get("monitor_type") or "").strip().lower() != "disk":
            return _rule_result(rule_id, system_id, "skipped", "rule monitor_type is not disk")
        if str(rule_info.get("status") or "").strip().upper() != "ENABLED":
            return _rule_result(rule_id, system_id, "skipped", "rule status is not ENABLED")
        if system_id is None or rule_id is None:
            return _rule_result(rule_id, system_id, "skipped", "rule is missing system_id or rule_id")

        targets = rule.get("targets") or []
        metrics = rule.get("metrics") or []
        if not targets or not metrics:
            missing = "targets" if not targets else "metrics"
            return _rule_result(rule_id, system_id, "skipped", f"rule has no {missing}")

        summary = {
            "eligible_metrics": 0,
            "matched_samples": 0,
            "violations_confirmed": 0,
            "duration_pending": 0,
            "recoveries_confirmed": 0,
            "recoveries_pending": 0,
        }
        skipped_reasons = []
        seen_targets = set()

        for target_index, target in enumerate(targets):
            if not isinstance(target, dict):
                skipped_reasons.append("target entry is malformed")
                continue
            target_type = _target_type(target)
            target_name = _target_name(target, target_type)
            if target_type == "process":
                skipped_reasons.append("Process targets are unsupported by Disk evaluation")
                continue
            if target_type not in SUPPORTED_TARGET_TYPES:
                skipped_reasons.append(f"unsupported target type {target_type!r}")
                continue
            target_key = (target_type, target_name)
            if target_key in seen_targets:
                skipped_reasons.append("duplicate target entry")
                continue
            seen_targets.add(target_key)

            partition_disk_label = None
            partition_label_resolution_attempted = False
            partition_resolution_error = None
            for metric_index, metric in enumerate(metrics):
                metric_name = _log_metric_start(system_id, rule_id, metric, target_type, target_name)
                metric_outcomes = []
                metric_reason = None
                try:
                    if not isinstance(metric, dict):
                        raise ValueError("metric entry is malformed")
                    metric_name = normalize_disk_metric_name(metric.get("metric") or metric.get("name"))
                    scope = classify_disk_metric_scope(metric_name)
                    if scope is None:
                        raise ValueError(f"metric {metric_name or '<empty>'!r} is not declared by the Disk exporter")
                    if metric_name == "disk_partition_info":
                        raise ValueError("disk_partition_info is a presence gauge, not a threshold measurement")
                    scope_error = _metric_target_error(metric_name, target_type)
                    if scope_error:
                        raise ValueError(scope_error)
                    if not is_supported_operator(metric.get("operator")):
                        raise ValueError(f"metric {metric_name!r} has an unsupported operator")
                    threshold = float(metric["threshold"])
                    duration_seconds = float(metric.get("duration_seconds") or 0)
                    if not math.isfinite(threshold) or not math.isfinite(duration_seconds) or duration_seconds < 0:
                        raise ValueError(f"metric {metric_name!r} has an invalid threshold or duration")
                    duration_seconds = int(duration_seconds)

                    if target_type in PARTITION_TARGET_TYPES and scope == PER_DISK_SCOPE:
                        if not partition_label_resolution_attempted:
                            partition_label_resolution_attempted = True
                            try:
                                partition_disk_label, partition_resolution_error = _resolve_partition_disk_label(
                                    system_id, target_type, target_name
                                )
                            except Exception:
                                logger.exception(
                                    "Disk partition mapping failed: rule_id=%s target=%s",
                                    rule_id,
                                    target_name,
                                )
                                partition_resolution_error = "partition target could not be mapped to an exported disk label"
                        if partition_resolution_error or not partition_disk_label:
                            raise ValueError(partition_resolution_error or "partition target has no disk label")

                    summary["eligible_metrics"] += 1
                    try:
                        results = _query_metric(
                            system_id,
                            metric_name,
                            target_type,
                            target_name,
                            partition_disk_label,
                        )
                    except Exception as error:
                        logger.exception(
                            "Disk Prometheus query failed: system_id=%s rule_id=%s metric=%s target=%s",
                            system_id,
                            rule_id,
                            metric_name,
                            target_name,
                        )
                        raise RuntimeError("Prometheus query failed") from error

                    samples = _unique_samples(
                        results,
                        metric_name,
                        target_type,
                        target_name,
                        partition_disk_label,
                    )
                    if not samples:
                        reason = "no matching fresh Prometheus series"
                        if results:
                            reason = "Prometheus series labels do not match the configured Disk target"
                        logger.warning(
                            "Disk evaluation is uncertain: rule_id=%s metric=%s target_type=%s target=%s reason=%s",
                            rule_id,
                            metric_name,
                            target_type,
                            target_name,
                            reason,
                        )
                        skipped_reasons.append(reason)
                        metric_outcomes.append("EVALUATION_UNVERIFIED")
                        metric_reason = reason
                        continue

                    for scoped_target, result in samples:
                        labels = result.get("metric") or {}
                        try:
                            value = float(result["value"][1])
                        except (KeyError, TypeError, ValueError, IndexError):
                            reason = "Prometheus returned an invalid sample"
                            skipped_reasons.append(reason)
                            metric_outcomes.append("EVALUATION_UNVERIFIED")
                            metric_reason = reason
                            continue
                        if not math.isfinite(value):
                            reason = "Prometheus returned a non-finite sample"
                            skipped_reasons.append(reason)
                            metric_outcomes.append("EVALUATION_UNVERIFIED")
                            metric_reason = reason
                            continue

                        summary["matched_samples"] += 1
                        violated = check_threshold(value, metric.get("operator"), threshold)
                        identity = _condition_identity(
                            system_id,
                            rule_id,
                            target_index,
                            target_type,
                            target_name,
                            metric_index,
                            metric,
                            metric_name,
                            _series_identity(metric_name, labels),
                            duration_seconds,
                        )
                        active = _incident(
                            rule,
                            scoped_target[0],
                            scoped_target[1],
                            metric,
                            metric_name,
                            value,
                            identity,
                            labels,
                        )

                        if violated:
                            observation_time = time.time()
                            try:
                                state = get_disk_violation_state(identity)
                            except DiskDurationStateError as error:
                                reason = f"Redis violation state unavailable: {error}"
                                skipped_reasons.append(reason)
                                metric_outcomes.append("DURATION_UNVERIFIED")
                                metric_reason = reason
                                summary["duration_pending"] += 1
                                continue

                            if state and state.get("status") == "resolution_pending":
                                managed = manage_disk_incident(active, True, fallback_state=state)
                                if managed.get("outcome") != "recovered":
                                    pending_incident = managed.get("incident")
                                    if pending_incident and pending_incident.get("incident_id"):
                                        try:
                                            mark_disk_resolution_pending(
                                                identity,
                                                mark_disk_incident_active(identity, state, pending_incident),
                                            )
                                        except DiskDurationStateError:
                                            logger.exception("Unable to retain pending Disk incident resolution state")
                                    summary["recoveries_pending"] += 1
                                    metric_outcomes.append("RECOVERY_UNVERIFIED")
                                    metric_reason = managed.get("reason") or "incident resolution is pending"
                                    continue
                                if not clear_disk_violation(identity, state):
                                    reason = "Redis could not clear the recovered Disk condition state"
                                    skipped_reasons.append(reason)
                                    metric_outcomes.append("DURATION_UNVERIFIED")
                                    metric_reason = reason
                                    summary["duration_pending"] += 1
                                    continue
                                state = None

                            try:
                                sustained, state = observe_disk_violation(
                                    identity,
                                    duration_seconds,
                                    now=observation_time,
                                )
                            except DiskDurationStateError as error:
                                reason = f"Redis violation state unavailable: {error}"
                                skipped_reasons.append(reason)
                                metric_outcomes.append("DURATION_UNVERIFIED")
                                metric_reason = reason
                                summary["duration_pending"] += 1
                                continue

                            if not sustained:
                                summary["duration_pending"] += 1
                                metric_outcomes.append("DURATION_PENDING")
                                metric_reason = "violation duration has not elapsed"
                                continue

                            managed = manage_disk_incident(active, True, fallback_state=state)
                            if managed.get("outcome") == "active":
                                incident_state = managed.get("incident") or active
                                try:
                                    state = mark_disk_incident_active(identity, state, incident_state)
                                except DiskDurationStateError:
                                    # The incident manager has already retained its own active record.
                                    logger.exception(
                                        "Disk incident is active but its duration state could not be updated: rule_id=%s incident_id=%s",
                                        rule_id,
                                        incident_state.get("incident_id"),
                                    )
                                summary["violations_confirmed"] += 1
                                metric_outcomes.append("VIOLATED")
                                continue

                            if managed.get("outcome") == "recovered":
                                try:
                                    if not clear_disk_violation(identity, state):
                                        raise DiskDurationStateError("Redis could not clear the recovered condition")
                                    sustained, state = observe_disk_violation(
                                        identity, duration_seconds, now=observation_time
                                    )
                                except DiskDurationStateError as error:
                                    reason = f"Redis violation state unavailable after recovery: {error}"
                                    skipped_reasons.append(reason)
                                    metric_outcomes.append("DURATION_UNVERIFIED")
                                    metric_reason = reason
                                    summary["duration_pending"] += 1
                                    continue
                                if not sustained:
                                    summary["duration_pending"] += 1
                                    metric_outcomes.append("DURATION_PENDING")
                                    metric_reason = "new violation timer started after recovery"
                                    continue
                                managed = manage_disk_incident(active, True)
                                if managed.get("outcome") == "active":
                                    incident_state = managed.get("incident") or active
                                    try:
                                        mark_disk_incident_active(identity, state, incident_state)
                                    except DiskDurationStateError:
                                        logger.exception(
                                            "Disk incident is active but its duration state could not be updated: incident_id=%s",
                                            incident_state.get("incident_id"),
                                        )
                                    summary["violations_confirmed"] += 1
                                    metric_outcomes.append("VIOLATED")
                                    continue

                            if managed.get("phase") == "resolution":
                                try:
                                    pending_state = mark_disk_incident_active(
                                        identity,
                                        state,
                                        managed.get("incident") or active,
                                    )
                                    mark_disk_resolution_pending(identity, pending_state)
                                except DiskDurationStateError:
                                    logger.exception("Unable to retain pending Disk incident resolution state")
                            reason = managed.get("reason") or "incident handoff is pending"
                            skipped_reasons.append(reason)
                            metric_outcomes.append("EVALUATION_UNVERIFIED")
                            metric_reason = reason

                        else:
                            try:
                                state = get_disk_violation_state(identity)
                            except DiskDurationStateError as error:
                                reason = f"Redis violation state unavailable: {error}"
                                skipped_reasons.append(reason)
                                metric_outcomes.append("RECOVERY_UNVERIFIED")
                                metric_reason = reason
                                summary["recoveries_pending"] += 1
                                continue

                            managed = manage_disk_incident(
                                active,
                                False,
                                fallback_state=state,
                            )
                            if managed.get("outcome") == "resolved":
                                try:
                                    if not clear_disk_violation(identity, state):
                                        raise DiskDurationStateError("Redis could not clear the recovered condition")
                                except DiskDurationStateError:
                                    logger.exception("Unable to clear recovered Disk violation timer")
                                    summary["recoveries_pending"] += 1
                                    metric_outcomes.append("RECOVERY_UNVERIFIED")
                                    metric_reason = "Redis violation state could not be cleared"
                                    continue
                                if managed.get("incident"):
                                    summary["recoveries_confirmed"] += 1
                                    metric_outcomes.append("RECOVERED")
                                else:
                                    metric_outcomes.append("NOT_VIOLATED")
                            else:
                                pending_incident = managed.get("incident")
                                if pending_incident and pending_incident.get("incident_id"):
                                    try:
                                        pending_state = mark_disk_incident_active(
                                            identity,
                                            state,
                                            pending_incident,
                                        )
                                        mark_disk_resolution_pending(identity, pending_state)
                                    except DiskDurationStateError:
                                        logger.exception("Unable to retain pending Disk incident resolution state")
                                summary["recoveries_pending"] += 1
                                metric_outcomes.append("RECOVERY_UNVERIFIED")
                                metric_reason = managed.get("reason") or "incident resolution is pending"

                except (TypeError, ValueError, RuntimeError) as error:
                    reason = str(error) or "metric evaluation failed"
                    skipped_reasons.append(reason)
                    metric_outcomes.append("SKIPPED")
                    metric_reason = reason
                    logger.warning(
                        "Disk metric skipped or unverified: system_id=%s rule_id=%s metric=%s target_type=%s target=%s reason=%s",
                        system_id,
                        rule_id,
                        metric_name,
                        target_type,
                        target_name,
                        reason,
                    )
                except Exception as error:
                    reason = f"{type(error).__name__}: {error}"
                    skipped_reasons.append(reason)
                    metric_outcomes.append("EVALUATION_FAILED")
                    metric_reason = reason
                    logger.exception(
                        "Disk metric evaluation failed: system_id=%s rule_id=%s metric=%s target_type=%s target=%s",
                        system_id,
                        rule_id,
                        metric_name,
                        target_type,
                        target_name,
                    )
                finally:
                    outcome = "VIOLATED" if "VIOLATED" in metric_outcomes else (
                        metric_outcomes[-1] if metric_outcomes else "SKIPPED"
                    )
                    _log_metric_final(
                        system_id,
                        rule_id,
                        metric_name or "<empty>",
                        target_type,
                        target_name,
                        outcome,
                        metric_reason,
                    )

        if summary["violations_confirmed"]:
            outcome, reason = "violation_confirmed", None
        elif summary["recoveries_confirmed"]:
            outcome, reason = "recovery_confirmed", None
        elif summary["recoveries_pending"]:
            outcome, reason = "recovery_not_confirmed", None
        elif summary["duration_pending"]:
            outcome, reason = "duration_not_confirmed", None
        elif summary["matched_samples"] and skipped_reasons:
            outcome, reason = "partially_skipped", "; ".join(dict.fromkeys(skipped_reasons))
        elif summary["matched_samples"]:
            outcome, reason = "condition_not_violated", None
        elif skipped_reasons:
            outcome, reason = "skipped", "; ".join(dict.fromkeys(skipped_reasons))
        else:
            outcome, reason = "skipped", "no eligible targets or metrics"

        return _rule_result(
            rule_id,
            system_id,
            outcome,
            reason,
            **summary,
            skipped_reason_count=len(set(skipped_reasons)),
        )
