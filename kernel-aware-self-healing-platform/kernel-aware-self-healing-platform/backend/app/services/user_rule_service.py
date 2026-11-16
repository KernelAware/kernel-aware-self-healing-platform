
from models.user_rules.rule import Rule
from models.user_rules.rule_targets import RuleTarget
from models.user_rules.rule_metric import RuleMetric
from models.user_rules.rule_action import RuleAction
from models.user_rules.rule_notification import RuleNotification
from models.user_rules.rule_recovery import RuleRecovery
from models.user_rules.rule_jira_config import RuleJiraConfig
from models.user_rules.rule_servicenow_config import RuleServiceNowConfig
from system_config import SYSTEM_ID

from repository.user_rules import (
    save_rules,
    get_rules_with_details,
    update_rule,
    delete_rule,
)

from schemas.user_rules import (
    RuleResponse,
    RuleDetailsResponse,
    RuleTargetResponse,
    RuleMetricResponse,
    RuleActionResponse,
    RuleNotificationResponse,
    RuleRecoveryResponse,
)


def user_rules_service(userRules):
    targets = []
    metrics = []
    rule_actions = []
    recovery_actions = []
    notifications_actions = []

    jira_config = None
    servicenow_config = None

    requested_system_id = SYSTEM_ID

    try:
        requested_system_id = int(requested_system_id)

        if requested_system_id <= 0:
            raise ValueError

    except (TypeError, ValueError) as error:
        raise ValueError(
            "system_id must be a positive integer"
        ) from error

    rule = Rule(
        name=userRules["ruleName"],
        system_id=requested_system_id,
        status="ENABLED" if userRules["enabled"] else "DISABLED",
        priority=userRules["priority"],
        severity=userRules["severity"],
        owner=userRules["owner"],
        environment=userRules["environment"],
        region=userRules["region"],
        monitor_type=userRules["monitorSource"],
    )

    is_cpu_rule = userRules["monitorSource"].lower() == "cpu"
    is_process_rule = userRules["monitorSource"].lower() == "process"

    # Create rule targets.
    for target in userRules["targets"]:
        rule_target = RuleTarget(
            rule_id=rule.id,
            target_type=target["type"],
            target=(
                target["metrics"][0]["name"]
                if is_cpu_rule and target.get("metrics")
                else target["name"]
            ),
            host=(
                (target.get("host") or target["name"])
                if is_cpu_rule
                else target.get("host")
            ),
        )

        targets.append(rule_target)

    # Preserve every configured metric condition.
    # The current relational schema associates metrics with a rule,
    # not directly with an individual target.
    for target in userRules.get("targets", []):
        for metric in target.get("metrics", []):
            conditions = metric.get("conditions") or [metric]

            for condition in conditions:
                duration = int(condition.get("duration", 0) or 0)
                unit = str(
                    condition.get("durationUnit", "seconds")
                ).lower()

                if unit == "minutes":
                    duration_seconds = duration * 60
                elif unit == "hours":
                    duration_seconds = duration * 3600
                else:
                    duration_seconds = duration

                metric_name = (
                    condition.get("metric")
                    or metric.get("metric")
                )

                if not metric_name:
                    continue

                metrics.append(
                    RuleMetric(
                        rule_id=rule.id,
                        metric=metric_name,
                        operator=condition.get("operator"),
                        threshold=(
                            float(condition["threshold"])
                            if condition.get("threshold") not in (None, "")
                            else None
                        ),
                        duration_seconds=duration_seconds,
                    )
                )

    # Safety and retry configurations.
    safety = userRules.get("safety", {})
    retry = userRules.get("retry", {})

    actions = userRules.get("actions", [])

    for action in actions:
        if isinstance(action, dict):
            action_type = action.get("type")
            action_script = action.get("action_script")
        else:
            action_type = action
            action_script = None

        rule_action = RuleAction(
            rule_id=rule.id,
            action_type=action_type,
            action_script=action_script,
            automatic_execution=safety.get("autoExec", False),
            approval_required=safety.get(
                "approvalRequired", "ALWAYS"
            ).upper(),
            allowed_during=safety.get(
                "allowedDuring", "ALWAYS"
            ),
            max_retry_attempts=int(
                retry.get("maxAttempts", 0)
            ),
            cooldown_seconds=int(
                retry.get("cooldownMinutes", 0)
            ) * 60,
            suppress_duplicates=retry.get(
                "suppressDuplicates", True
            ),
        )

        rule_actions.append(rule_action)

    # Recovery configurations.
    recovery = userRules.get("recovery", {})

    if recovery.get("required"):
        recovery_metrics = recovery.get("metric", [])

        for condition in recovery_metrics:
            duration = int(condition["duration"])
            unit = condition["durationUnit"].lower()

            if unit == "minutes":
                duration_seconds = duration * 60
            elif unit == "hours":
                duration_seconds = duration * 3600
            elif unit == "seconds":
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
                recovery_duration_seconds=duration_seconds,
            )

            recovery_actions.append(rule_recovery)

    # Notification configurations.
    notifications = userRules.get("notifications", {})

    events = notifications.get("events") or []
    channels = notifications.get("channels") or []

    recipients = [
        address.strip()
        for recipient in (notifications.get("recipients") or [])
        if recipient is not None
        for address in str(recipient).replace(";", ",").split(",")
        if address.strip()
    ]

    # Recipient-only configuration is valid in the wizard.
    # Persist it with the existing default event and channel.
    if recipients:
        events = events or ["Incident detected"]
        channels = channels or ["email"]

    def split_recipients(value):
        if isinstance(value, list):
            return [
                item.strip()
                for item in value
                if isinstance(item, str) and item.strip()
            ]

        if not isinstance(value, str):
            return []

        return [
            item.strip()
            for item in value.split(",")
            if item.strip()
        ]

    channel_recipients = {
        channel: configured
        for channel, configured in {
            "email": split_recipients(
                notifications.get("emailRecipients")
            ),
            "slack": split_recipients(
                notifications.get("slackWebhook")
            ),
            "teams": split_recipients(
                notifications.get("teamsWebhook")
            ),
        }.items()
        if configured
    }

    # Jira configuration.
    jira_values = {
        "site_url": notifications.get("jiraUrl"),
        "account_email": notifications.get("jiraEmail"),
        "api_token_encrypted": notifications.get("jiraToken"),
        "project_key": notifications.get("jiraProjectKey") or "OPS",
        "issue_type": notifications.get("jiraIssueType") or "Task",
    }

    if "jira" in channels and all(jira_values.values()):
        jira_config = RuleJiraConfig(**jira_values)

    # ServiceNow configuration.
    servicenow_values = {
        "instance_url": notifications.get("serviceNowUrl"),
        "client_id": notifications.get("serviceNowClientId"),
        "client_secret_encrypted": notifications.get("serviceNowSecret"),
    }

    if "servicenow" in channels and all(servicenow_values.values()):
        servicenow_config = RuleServiceNowConfig(**servicenow_values)

    # Create notification database records.
    for event in events:
        if not channels:
            rule_notification = RuleNotification(
                rule_id=rule.id,
                event_type=event,
                channel="NONE",
                recipient=None,
            )

            notifications_actions.append(rule_notification)

        else:
            for channel in channels:
                # Jira and ServiceNow connection details are stored
                # in their respective configuration tables.
                configured_recipients = (
                    []
                    if channel in {"jira", "servicenow"}
                    else channel_recipients.get(channel, recipients)
                )

                if not configured_recipients:
                    rule_notification = RuleNotification(
                        rule_id=rule.id,
                        event_type=event,
                        channel=channel,
                        recipient=None,
                    )

                    notifications_actions.append(rule_notification)

                else:
                    for recipient in configured_recipients:
                        rule_notification = RuleNotification(
                            rule_id=rule.id,
                            event_type=event,
                            channel=channel,
                            recipient=recipient,
                        )

                        notifications_actions.append(rule_notification)

    # Collect all rule details for database persistence.
    rule_details = {
        "rule": rule,
        "targets": targets,
        "metrics": metrics,
        "actions": rule_actions,
        "notifications": notifications_actions,
        "jira_config": jira_config,
        "servicenow_config": servicenow_config,
        "recovery": recovery_actions,
    }

    save_details = save_rules(rule_details)

    return save_details


def get_user_rules(
    system_id: int | None = None,
    rule_id: int | None = None,
):
    rules_with_details = get_rules_with_details(
        system_id=system_id,
        rule_id=rule_id,
    )

    if not rules_with_details:
        return []

    result = []

    for rule, data in rules_with_details:
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
                    created_at=rule.created_at,
                ),

                targets=[
                    RuleTargetResponse(
                        target_type=x.target_type,
                        target=x.target,
                        host=x.host,
                    )
                    for x in data["targets"]
                ],

                metrics=[
                    RuleMetricResponse(
                        id=x.id,
                        metric=x.metric,
                        operator=x.operator,
                        threshold=x.threshold,
                        duration_seconds=x.duration_seconds,
                    )
                    for x in data["metrics"]
                ],

                actions=[
                    RuleActionResponse(
                        action_type=x.action_type,
                        action_script=x.action_script,
                        automatic_execution=x.automatic_execution,
                        approval_required=x.approval_required,
                        allowed_during=x.allowed_during,
                        max_retry_attempts=x.max_retry_attempts,
                        cooldown_seconds=x.cooldown_seconds,
                        suppress_duplicates=x.suppress_duplicates,
                    )
                    for x in data["actions"]
                ],

                notifications=[
                    RuleNotificationResponse(
                        event_type=x.event_type,
                        channel=x.channel,
                        recipient=x.recipient,
                    )
                    for x in data["notifications"]
                ],

                recovery=[
                    RuleRecoveryResponse(
                        verification_required=x.verification_required,
                        metric=x.metric,
                        operator=x.operator,
                        recovery_threshold=x.recovery_threshold,
                        recovery_duration_seconds=x.recovery_duration_seconds,
                    )
                    for x in data["recovery"]
                ],
            )
        )

    return result


def update_user_rule(rule_id: int, updates: dict):
    rule = update_rule(rule_id, updates)
    if rule is None:
        return None
    return {"success": True, "rule_id": rule_id}


def delete_user_rule(rule_id: int):
    if not delete_rule(rule_id):
        return None
    return {"success": True, "rule_id": rule_id}
