from models.user_rules.rule import Rule
from models.user_rules.rule_targets import RuleTarget
from models.user_rules.rule_metric import RuleMetric
from models.user_rules.rule_action import RuleAction
from models.user_rules.rule_notification import RuleNotification
from models.user_rules.rule_recovery import RuleRecovery
from repository.user_rules import (
    save_rules,
    get_rule_by_system_id,
    get_rule_by_id,
    get_rule_details,
    get_all_rules
)

from schemas.user_rules import (
    RuleResponse,
    RuleDetailsResponse,
    RuleTargetResponse,
    RuleMetricResponse,
    RuleActionResponse,
    RuleNotificationResponse,
    RuleRecoveryResponse
)


def user_rules_service(userRules: dict):
    targets = []
    metrics = []
    rule_actions = []
    recovery_actions = []
    notifications_actions = []

    system_id = userRules.get("system_id") or 1

    rule = Rule(
        name=userRules.get("ruleName") or "Untitled Rule",
        system_id=system_id,
        status="ENABLED" if userRules.get("enabled", True) else "DISABLED",
        priority=userRules.get("priority", "MEDIUM"),
        severity=userRules.get("severity", "WARNING"),
        owner=userRules.get("owner", "Admin"),
        environment=userRules.get("environment", "Production"),
        region=userRules.get("region", "US-East-1"),
        monitor_type=userRules.get("monitorSource") or "process",
        target_type=userRules.get("targetType"),
        target=userRules.get("target") or userRules.get("host")
    )

    # 1. Targets & Metrics
    raw_targets = userRules.get("targets", [])
    if isinstance(raw_targets, list) and len(raw_targets) > 0:
        for target in raw_targets:
            if not isinstance(target, dict):
                continue
            rule_target = RuleTarget(
                target_type=target.get("type", "process"),
                target=target.get("name", "unknown"),
                host=target.get("host")
            )
            targets.append(rule_target)

            for metric in target.get("metrics", []):
                metric_name = metric.get("name", "unknown")
                conditions = metric.get("conditions", [])
                for cond in conditions:
                    duration_seconds = 0
                    duration_val = cond.get("duration", 0)
                    try:
                        duration_num = int(duration_val)
                    except (ValueError, TypeError):
                        duration_num = 0

                    duration_unit = str(cond.get("durationUnit", "seconds")).lower()
                    if duration_unit == "minutes":
                        duration_seconds = duration_num * 60
                    elif duration_unit == "hours":
                        duration_seconds = duration_num * 3600
                    else:
                        duration_seconds = duration_num

                    threshold_val = cond.get("threshold")
                    try:
                        threshold_float = float(threshold_val) if threshold_val is not None and str(threshold_val).strip() != "" else None
                    except (ValueError, TypeError):
                        threshold_float = None

                    rule_metric = RuleMetric(
                        metric=cond.get("metric") or metric_name,
                        operator=cond.get("operator", ">"),
                        threshold=threshold_float,
                        duration_seconds=duration_seconds
                    )
                    metrics.append(rule_metric)
    else:
        # Fallback if no targets array (e.g. non-process rules like CPU, Disk, Memory, Network)
        target_name = userRules.get("host") or userRules.get("target") or "default"
        target_type = userRules.get("targetType") or userRules.get("monitorSource") or "host"
        targets.append(RuleTarget(
            target_type=target_type,
            target=target_name,
            host=userRules.get("host")
        ))

        metric_name = userRules.get("condMetric") or userRules.get("metric")
        if metric_name:
            duration_val = userRules.get("condDuration", 0)
            try:
                duration_num = int(duration_val)
            except (ValueError, TypeError):
                duration_num = 0

            threshold_val = userRules.get("condThreshold")
            try:
                threshold_float = float(threshold_val) if threshold_val is not None and str(threshold_val).strip() != "" else None
            except (ValueError, TypeError):
                threshold_float = None

            metrics.append(RuleMetric(
                metric=metric_name,
                operator=userRules.get("condOperator", ">"),
                threshold=threshold_float,
                duration_seconds=duration_num * 60
            ))

    # 2. Actions & Safety & Retry
    safety = userRules.get("safety") or {}
    retry = userRules.get("retry") or {}

    try:
        max_retry = int(retry.get("maxAttempts", 0) or 0)
    except (ValueError, TypeError):
        max_retry = 0

    try:
        cooldown = int(retry.get("cooldownMinutes", 0) or 0) * 60
    except (ValueError, TypeError):
        cooldown = 0

    actions = userRules.get("actions") or userRules.get("actionTypes") or []
    if isinstance(actions, str):
        actions = [actions]

    for action in actions:
        if isinstance(action, dict):
            action_type = action.get("type") or action.get("id") or str(action)
        else:
            action_type = str(action)

        rule_action = RuleAction(
            action_type=action_type,
            automatic_execution=bool(safety.get("autoExec", False)),
            approval_required=str(safety.get("approvalRequired", "ALWAYS")).upper(),
            allowed_during=str(safety.get("allowedDuring", "ALWAYS")),
            max_retry_attempts=max_retry,
            cooldown_seconds=cooldown,
            suppress_duplicates=bool(retry.get("suppressDuplicates", True))
        )
        rule_actions.append(rule_action)

    # 3. Recovery
    recovery = userRules.get("recovery") or {}
    if recovery.get("required"):
        recovery_metrics = recovery.get("metric") or []
        for condition in recovery_metrics:
            try:
                duration = int(condition.get("duration", 0) or 0)
            except (ValueError, TypeError):
                duration = 0

            unit = str(condition.get("durationUnit", "minutes")).lower()
            if unit == "minutes":
                duration_seconds = duration * 60
            elif unit == "hours":
                duration_seconds = duration * 3600
            else:
                duration_seconds = duration

            threshold_val = condition.get("threshold")
            try:
                recovery_thresh = float(threshold_val) if threshold_val is not None and str(threshold_val).strip() != "" else None
            except (ValueError, TypeError):
                recovery_thresh = None

            rule_recovery = RuleRecovery(
                verification_required=True,
                metric=condition.get("metric"),
                operator=condition.get("operator"),
                recovery_threshold=recovery_thresh,
                recovery_duration_seconds=duration_seconds
            )
            recovery_actions.append(rule_recovery)
    elif userRules.get("recoveryThreshold"):
        threshold_val = userRules.get("recoveryThreshold")
        try:
            recovery_thresh = float(threshold_val) if threshold_val is not None and str(threshold_val).strip() != "" else None
        except (ValueError, TypeError):
            recovery_thresh = None

        try:
            recovery_dur = int(userRules.get("recoveryDuration", 0) or 0) * 60
        except (ValueError, TypeError):
            recovery_dur = 0

        rule_recovery = RuleRecovery(
            verification_required=True,
            metric=userRules.get("condMetric"),
            operator=userRules.get("condOperator"),
            recovery_threshold=recovery_thresh,
            recovery_duration_seconds=recovery_dur
        )
        recovery_actions.append(rule_recovery)

    # 4. Notifications
    notifications = userRules.get("notifications") or {}
    events = notifications.get("events") or []
    channels = notifications.get("channels") or []
    recipients = notifications.get("recipients") or []

    for event in events:
        if not channels:
            rule_notification = RuleNotification(
                event_type=str(event),
                channel="NONE",
                recipient=None
            )
            notifications_actions.append(rule_notification)
        else:
            for channel in channels:
                if not recipients:
                    rule_notification = RuleNotification(
                        event_type=str(event),
                        channel=str(channel),
                        recipient=None
                    )
                    notifications_actions.append(rule_notification)
                else:
                    for recipient in recipients:
                        rule_notification = RuleNotification(
                            event_type=str(event),
                            channel=str(channel),
                            recipient=str(recipient)
                        )
                        notifications_actions.append(rule_notification)

    rule_details = {
        "rule": rule,
        "targets": targets,
        "metrics": metrics,
        "actions": rule_actions,
        "notifications": notifications_actions,
        "recovery": recovery_actions
    }

    save_details = save_rules(rule_details)
    return save_details


def get_user_rules(system_id: int | None = None, rule_id: int | None = None):
    rules = []

    if rule_id is not None:
        rule = get_rule_by_id(rule_id)
        if rule is not None:
            rules = [rule]
    elif system_id is not None:
        rules = get_rule_by_system_id(system_id)
    else:
        rules = get_all_rules()

    result = []

    for rule in rules:
        data = get_rule_details(rule.id)

        result.append(
            RuleDetailsResponse(
                rule=RuleResponse(
                    id=rule.id,
                    name=rule.name,
                    status=rule.status,
                    priority=rule.priority,
                    severity=rule.severity,
                    owner=rule.owner,
                    environment=rule.environment,
                    region=rule.region,
                    monitor_type=rule.monitor_type,
                    target_type=rule.target_type,
                    target=rule.target,
                    system_id=rule.system_id,
                    created_at=rule.created_at
                ),
                targets=[
                    RuleTargetResponse(
                        target_type=x.target_type,
                        target=x.target,
                        host=getattr(x, "host", None)
                    )
                    for x in data.get("targets", [])
                ],
                metrics=[
                    RuleMetricResponse(
                        id=x.id,
                        metric=x.metric,
                        operator=x.operator,
                        threshold=x.threshold,
                        duration_seconds=x.duration_seconds
                    )
                    for x in data.get("metrics", [])
                ],
                actions=[
                    RuleActionResponse(
                        action_type=x.action_type,
                        automatic_execution=x.automatic_execution,
                        approval_required=x.approval_required,
                        allowed_during=x.allowed_during,
                        max_retry_attempts=x.max_retry_attempts,
                        cooldown_seconds=x.cooldown_seconds,
                        suppress_duplicates=x.suppress_duplicates
                    )
                    for x in data.get("actions", [])
                ],
                notifications=[
                    RuleNotificationResponse(
                        event_type=x.event_type,
                        channel=x.channel,
                        recipient=x.recipient
                    )
                    for x in data.get("notifications", [])
                ],
                recovery=[
                    RuleRecoveryResponse(
                        verification_required=x.verification_required,
                        metric=x.metric,
                        operator=x.operator,
                        recovery_threshold=x.recovery_threshold,
                        recovery_duration_seconds=x.recovery_duration_seconds
                    )
                    for x in data.get("recovery", [])
                ]
            )
        )

    return result