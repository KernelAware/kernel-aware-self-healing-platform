from models.user_rules.rule import Rule
from models.user_rules.rule_targets import RuleTarget
from models.user_rules.rule_metric import RuleMetric
from models.user_rules.rule_action import RuleAction
from models.user_rules.rule_notification import RuleNotification
from models.user_rules.rule_recovery import RuleRecovery
from repository.user_rules import save_rules, retrieve_rules , get_rule_details

from schemas.user_rules import (
    RuleResponse,
    RuleDetailsResponse,
    RuleTargetResponse,
    RuleMetricResponse,
    RuleActionResponse,
    RuleNotificationResponse,
    RuleRecoveryResponse
)

def user_rules_service(userRules):
    targets = []
    metrics = []
    rule_actions = []
    recovery_actions = []
    notifications_actions = []

    rule = Rule(
        name=userRules["ruleName"],
        status="ENABLED" if userRules["enabled"] else "DISABLED",
        priority=userRules["priority"],
        severity=userRules["severity"],
        owner=userRules["owner"],
        environment=userRules["environment"],
        region=userRules["region"],
        monitor_type=userRules["monitorSource"]
    )

    for target in userRules["targets"]:
        rule_target = RuleTarget(
            rule_id=rule.id,
            target_type=target["type"],
            target=target["name"]
        )
        targets.append(rule_target)

    for metric in userRules["targets"][0]["metrics"]:

        condition = metric["conditions"][0]
        duration = int(condition["duration"])

        if condition["durationUnit"].lower() == "minutes":
            duration_seconds = duration * 60

        elif condition["durationUnit"].lower() == "hours":
            duration_seconds = duration * 60 * 60

        elif condition["durationUnit"].lower() == "seconds":
            duration_seconds = duration

        else:
            duration_seconds = duration


        rule_metric = RuleMetric(
            rule_id=rule.id,
            metric=condition["metric"],
            operator=condition["operator"],
            threshold=(
                float(condition["threshold"])
                if condition.get("threshold")
                else None
            ),
            duration_seconds=duration_seconds
        )

        metrics.append(rule_metric)

    safety = userRules.get("safety", {})
    retry = userRules.get("retry", {})

    actions = userRules.get("actions", [])

    for action in actions:
        rule_action = RuleAction(
            action_type=action,
            automatic_execution=safety.get("autoExec", False),
            approval_required=safety.get(
                "approvalRequired",
                "ALWAYS"
            ).upper(),
            allowed_during=safety.get(
                "allowedDuring",
                "ALWAYS"
            ),
            max_retry_attempts=int(
                retry.get("maxAttempts", 0)
            ),
            cooldown_seconds=int(
                retry.get("cooldownMinutes", 0)
            ) * 60,
            suppress_duplicates=retry.get(
                "suppressDuplicates",
                True
            )
        )
        rule_actions.append(rule_action)

    recovery = userRules.get("recovery", {})

    if recovery.get("required"):
        recovery_metrics = recovery.get("metric", [])
        for condition in recovery_metrics:

            duration = int(condition["duration"])

            if condition["durationUnit"].lower() == "minutes":
                duration_seconds = duration * 60

            elif condition["durationUnit"].lower() == "hours":
                duration_seconds = duration * 60 * 60

            elif condition["durationUnit"].lower() == "seconds":
                duration_seconds = duration

            else:
                duration_seconds = duration


            rule_recovery = RuleRecovery(
                verification_required=True,
                metric=condition["metric"],
                operator=condition["operator"],
                recovery_threshold=(
                    float(condition["threshold"])
                    if condition.get("threshold")
                    else None
                ),
                recovery_duration_seconds=duration_seconds
            )

            recovery_actions.append(rule_recovery)

    notifications = userRules.get("notifications", {})

    events = notifications.get("events", [])
    channels = notifications.get("channels", [])
    recipients = notifications.get("recipients", [])


    for event in events:

        if not channels:

            rule_notification = RuleNotification(
                rule_id=rule.id,
                event_type=event,
                channel="NONE",
                recipient=None
            )
            notifications_actions.append(rule_notification)

        else:

            for channel in channels:
                if not recipients:
                    rule_notification = RuleNotification(
                        rule_id=rule.id,
                        event_type=event,
                        channel=channel,
                        recipient=None
                    )

                    notifications_actions.append(rule_notification)

                else:
                    for recipient in recipients:

                        rule_notification = RuleNotification(
                            rule_id=rule.id,
                            event_type=event,
                            channel=channel,
                            recipient=recipient
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

def get_user_rules(system_id: int):

    rules = retrieve_rules(system_id)

    result = []

    for rule in rules:

        data = get_rule_details(rule.id)

        result.append(
            RuleDetailsResponse(
                rule=RuleResponse(
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
                        target=x.target
                    )
                    for x in data["targets"]
                ],

                metrics=[
                    RuleMetricResponse(
                        metric=x.metric,
                        operator=x.operator,
                        threshold=x.threshold,
                        duration_seconds=x.duration_seconds
                    )
                    for x in data["metrics"]
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
                    for x in data["actions"]
                ],

                notifications=[
                    RuleNotificationResponse(
                        event_type=x.event_type,
                        channel=x.channel,
                        recipient=x.recipient
                    )
                    for x in data["notifications"]
                ],

                recovery=[
                    RuleRecoveryResponse(
                        verification_required=x.verification_required,
                        metric=x.metric,
                        operator=x.operator,
                        recovery_threshold=x.recovery_threshold,
                        recovery_duration_seconds=x.recovery_duration_seconds
                    )
                    for x in data["recovery"]
                ]
            )
        )

    return result