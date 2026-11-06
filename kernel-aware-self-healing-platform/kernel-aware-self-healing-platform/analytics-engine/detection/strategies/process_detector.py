import logging
import math

from detection.duration import check_duration, clear_duration, verify_prometheus_duration
from detection.strategies.base_detector import DetectionStrategy
from detection.threshold import check_threshold
from incident_management.manager import manage_incidents
from load_data.system_metrics.metrics_loader import (
    canonical_process_metric,
    get_process_metric,
    get_process_metric_selector,
)


logger = logging.getLogger(__name__)
_unsupported_metrics_logged = set()


def _process_log_start(system_id, rule_id, metric_name, target, metric):
    logger.warning(
        "[PROCESS_RULE] START system_id=%s rule_id=%s metric=%s target_type=process target=%s operator=%s threshold=%s duration_seconds=%s",
        system_id, rule_id, metric_name or "<missing>", target,
        metric.get("operator", "<missing>"), metric.get("threshold", "<missing>"),
        metric.get("duration_seconds", "<missing>"),
    )


def _process_log_final(system_id, rule_id, metric_name, target, metric, outcome, reason):
    logger.warning(
        "[PROCESS_RULE] FINAL system_id=%s rule_id=%s metric=%s target_type=process target=%s operator=%s threshold=%s duration_seconds=%s outcome=%s reason=%s",
        system_id, rule_id, metric_name or "<missing>", target,
        metric.get("operator", "<missing>"), metric.get("threshold", "<missing>"),
        metric.get("duration_seconds", "<missing>"), outcome, reason,
    )


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
                _process_log_start(system_id, rule_info.get("id"), metric_name, target_name, metric)
                identity = {
                    "category": "process",
                    "system_id": system_id,
                    "rule_id": rule_info.get("id"),
                    "target": target_name,
                    "metric": metric_name,
                }
                try:
                    canonical_metric, selector = get_process_metric_selector(
                        system_id, target_name, metric, require_freshness=True
                    )
                    results = get_process_metric(system_id, target_name, metric, require_freshness=True)
                except ValueError as error:
                    if str(error).startswith("Unsupported Process metric:"):
                        key = (str(rule_info.get("id")), metric_name)
                        if key not in _unsupported_metrics_logged:
                            logger.warning(
                                "Skipping unsupported Process metric: rule_id=%s metric=%s",
                                rule_info.get("id"), metric_name,
                            )
                            _unsupported_metrics_logged.add(key)
                        _process_log_final(system_id, rule_info.get("id"), metric_name, target_name, metric, "ERROR", "unsupported_metric")
                        continue
                    logger.exception(
                        "Prometheus query failed for Process rule %s metric %s",
                        rule_info.get("id"), metric_name,
                    )
                    _process_log_final(system_id, rule_info.get("id"), metric_name, target_name, metric, "DATA_UNAVAILABLE", "prometheus_query_failed")
                    continue
                except Exception:
                    logger.exception(
                        "Prometheus query failed for Process rule %s metric %s",
                        rule_info.get("id"), metric_name,
                    )
                    _process_log_final(system_id, rule_info.get("id"), metric_name, target_name, metric, "DATA_UNAVAILABLE", "prometheus_query_failed")
                    continue

                if not results:
                    logger.warning(
                        "Process metric unavailable: rule_id=%s target=%s canonical_metric=%s selector=%s matching_series=0 reason=no_fresh_series",
                        rule_info.get("id"), target_name, canonical_metric, selector,
                    )
                    _process_log_final(
                        system_id, rule_info.get("id"), metric_name, target_name,
                        metric, "DATA_UNAVAILABLE", "no_fresh_series",
                    )
                else:
                    logger.debug(
                        "Process metric accepted: rule_id=%s target=%s canonical_metric=%s selector=%s matching_series=%s",
                        rule_info.get("id"), target_name, canonical_metric, selector, len(results),
                    )
                for result in results:
                    labels = result.get("metric") or {}
                    try:
                        pid = str(labels["pid"])
                        current_value = float(result["value"][1])
                        threshold = float(metric["threshold"])
                    except (KeyError, TypeError, ValueError, IndexError):
                        _process_log_final(system_id, rule_info.get("id"), metric_name, target_name, metric, "ERROR", "invalid_prometheus_sample")
                        continue
                    if not math.isfinite(current_value) or not math.isfinite(threshold):
                        _process_log_final(system_id, rule_info.get("id"), metric_name, target_name, metric, "DATA_UNAVAILABLE", "non_finite_prometheus_sample")
                        continue

                    duration_seconds = float(metric.get("duration_seconds") or 0)
                    operator = metric.get("operator")
                    scoped_identity = {
                        **identity,
                        "pid": pid,
                        "series": {key: str(value) for key, value in sorted(labels.items()) if key != "__name__"},
                        "operator": operator,
                        "threshold": threshold,
                        "duration_seconds": duration_seconds,
                    }
                    if check_threshold(current_value, metric.get("operator"), threshold):
                        if not check_duration(
                            scoped_identity,
                            duration_seconds,
                        ):
                            _process_log_final(system_id, rule_info.get("id"), metric_name, target_name, metric, "DURATION_PENDING", "duration_not_reached")
                            continue
                        try:
                            duration_verified, _reason = verify_prometheus_duration(
                                canonical_process_metric(metric_name),
                                labels,
                                operator,
                                threshold,
                                duration_seconds,
                            )
                        except Exception:
                            logger.exception("Unable to verify Process metric history for rule %s", rule_info.get("id"))
                            _process_log_final(system_id, rule_info.get("id"), metric_name, target_name, metric, "DURATION_UNVERIFIED", "prometheus_history_query_failed")
                            continue
                        if not duration_verified:
                            _process_log_final(system_id, rule_info.get("id"), metric_name, target_name, metric, "DURATION_UNVERIFIED", _reason or "prometheus_history_not_continuous")
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
                        managed = manage_incidents(incident, condition_violated=True) or {}
                        publication_outcome = managed.get("_decision_publication_outcome")
                        if managed.get("_backend_pending_event"):
                            publication_status, publication_reason = "PUBLICATION_PENDING", "backend_event_pending"
                        elif publication_outcome == "PUBLISH":
                            publication_status, publication_reason = "PUBLISHED", "publication_succeeded"
                        else:
                            publication_status, publication_reason = "PUBLICATION_REJECTED", "decision_engine_rejected"
                        _process_log_final(
                            system_id, rule_info.get("id"), metric_name, target_name,
                            metric, publication_status, publication_reason,
                        )
                    else:
                        if not clear_duration(scoped_identity, phase="trigger"):
                            _process_log_final(system_id, rule_info.get("id"), metric_name, target_name, metric, "ERROR", "redis_reset_failed")
                            continue
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
                        _process_log_final(system_id, rule_info.get("id"), metric_name, target_name, metric, "NOT_VIOLATED", "threshold_not_violated")

        return None
