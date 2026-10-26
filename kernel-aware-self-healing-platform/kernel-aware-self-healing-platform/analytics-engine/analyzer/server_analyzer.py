import logging
from contextlib import contextmanager
from contextvars import ContextVar

from load_data.user_rules.rule_loader import load_rules
from detection.detector import detect


logger = logging.getLogger(__name__)
_suppress_disk_detail_output = ContextVar("suppress_disk_detail_output", default=False)
_DISK_DETAIL_LOGGER_NAMES = (
    "load_data.user_rules.rule_loader",
    "detection.strategies.disk_detector",
    "detection.duration",
    "load_data.system_metrics.metrics_loader",
    "incident_management.manager",
    "httpx",
    "httpcore",
    "httpcore.connection",
    "httpcore.http11",
    "urllib3",
    "urllib3.connectionpool",
)


class _DiskDetailLogFilter(logging.Filter):
    def filter(self, record):
        return not _suppress_disk_detail_output.get()


for _logger_name in _DISK_DETAIL_LOGGER_NAMES:
    _detail_logger = logging.getLogger(_logger_name)
    if not getattr(_detail_logger, "_disk_detail_filter_installed", False):
        _detail_logger.addFilter(_DiskDetailLogFilter())
        _detail_logger._disk_detail_filter_installed = True


@contextmanager
def _suppress_disk_detail_logs():
    token = _suppress_disk_detail_output.set(True)
    try:
        yield
    finally:
        _suppress_disk_detail_output.reset(token)


def _disk_skip_reason(reason):
    text = str(reason or "evaluation incomplete").split(";", 1)[0].strip()
    normalized = text.lower()
    if "process" in normalized and "target" in normalized:
        return "Process target"
    if "disk_partition_info" in normalized or "incompatible" in normalized:
        return "incompatible metric and target"
    if "cannot be evaluated against" in normalized or "require a partition" in normalized:
        return "incompatible metric and target"
    if "prometheus query failed" in normalized:
        return "Prometheus query failed"
    if "no series" in normalized:
        return "no Prometheus series"
    if "duration" in normalized:
        return "duration unverified"
    if "recovery" in normalized:
        return "recovery unverified"
    if "operator" in normalized:
        return "unsupported operator"
    if "not declared" in normalized or "unsupported metric" in normalized:
        return "unsupported metric"
    if "no targets" in normalized or "without targets" in normalized:
        return "missing target"
    if "no metrics" in normalized or "without metrics" in normalized:
        return "missing metric"
    if len(text) > 64:
        return f"{text[:61].rstrip()}..."
    return text


def _disk_terminal_result(rule_id, result):
    if not isinstance(result, dict):
        return f"Disk Rule {rule_id}: SKIPPED — evaluation failed"

    detail_outcome = str(result.get("outcome") or "").lower()
    violations_confirmed = result.get("violations_confirmed", 0)
    if violations_confirmed or detail_outcome == "violation_confirmed":
        return f"Disk Rule {rule_id}: VIOLATED"
    if detail_outcome in {"recovery_not_confirmed", "resolution_pending_retry"} or result.get("recoveries_pending"):
        return f"Disk Rule {rule_id}: VIOLATED"
    if detail_outcome in {"condition_not_violated", "recovery_confirmed"}:
        return f"Disk Rule {rule_id}: NOT VIOLATED"
    if detail_outcome == "duration_not_confirmed":
        reason = result.get("reason") or "configured duration was not confirmed"
        return f"Disk Rule {rule_id}: SKIPPED — {_disk_skip_reason(reason)}"
    if result.get("matched_samples") and detail_outcome != "partially_skipped":
        return f"Disk Rule {rule_id}: NOT VIOLATED"

    reason = result.get("reason")
    if detail_outcome == "partially_skipped":
        reason = reason or "one or more metrics could not be evaluated"
    return f"Disk Rule {rule_id}: SKIPPED — {_disk_skip_reason(reason)}"


def _system_id_value(value):
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, int):
        return value
    text = str(value).strip()
    if not text:
        return None
    try:
        return int(text)
    except ValueError:
        return None


def _disk_rule_filter_reason(rule, system_id):
    if not isinstance(rule, dict) or not isinstance(rule.get("rule"), dict):
        return "malformed rule payload"

    rule_info = rule["rule"]
    requested_system_id = _system_id_value(system_id)
    if (
        requested_system_id is None
        or _system_id_value(rule_info.get("system_id")) != requested_system_id
    ):
        return "system_id does not match requested system"

    if str(rule_info.get("status") or "").strip().upper() != "ENABLED":
        return "rule status is not ENABLED"

    if str(rule_info.get("monitor_type") or "").strip().lower() != "disk":
        return "normalized monitor_type is not disk"
    return None


def _is_disk_rule_for_system(rule, system_id):
    return _disk_rule_filter_reason(rule, system_id) is None


def _canonical_disk_rule(rule):
    return {
        **rule,
        "rule": {**rule["rule"], "monitor_type": "disk", "status": "ENABLED"},
    }


def _dispatch_rules(system_id, rules, *, disk_only=False):
    for rule in rules:
        rule_id = None
        if isinstance(rule, dict) and isinstance(rule.get("rule"), dict):
            rule_id = rule["rule"].get("id")
        try:
            if disk_only:
                with _suppress_disk_detail_logs():
                    result = detect(rule)
                logger.warning("%s", _disk_terminal_result(rule_id, result))
            else:
                detect(rule)
        except Exception:
            # A malformed or unavailable rule must not block later rules.
            if disk_only:
                logger.warning("Disk Rule %s: SKIPPED — evaluation failed", rule_id)
            else:
                logger.exception(
                    "Rule evaluation failed for system %s rule %s; continuing with remaining rules",
                    system_id,
                    rule_id,
                )


def analyze_server(system):
    """Dispatch loaded rules, filtering only Disk rules against this system."""
    rules = load_rules(system)
    if not rules:
        return
    selected = []
    for rule in rules:
        rule_info = rule.get("rule") if isinstance(rule, dict) else None
        if isinstance(rule_info, dict) and str(rule_info.get("monitor_type") or "").strip().lower() == "disk":
            if _disk_rule_filter_reason(rule, system) is not None:
                continue
            selected.append(_canonical_disk_rule(rule))
        else:
            selected.append(rule)
    _dispatch_rules(system, selected)


def analyze_disk_server(system):
    """Run the Disk alert workflow without passing unrelated rules to dispatch."""
    with _suppress_disk_detail_logs():
        rules = load_rules(system)
    if not isinstance(rules, list):
        logger.error(
            "Disk rule loading returned an invalid payload: system_id=%s payload_type=%s",
            system,
            type(rules).__name__,
        )
        return

    selected = []
    for rule in rules:
        reason = _disk_rule_filter_reason(rule, system)
        if reason is None:
            selected.append(_canonical_disk_rule(rule))
        else:
            continue
    _dispatch_rules(system, selected, disk_only=True)
