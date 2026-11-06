from __future__ import annotations

import json
import logging
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from repository.user_rules import get_notification_recipients

logger = logging.getLogger(__name__)


def send_slack_webhook(webhook_url: str, text: str) -> None:
    """Post a plain-text message to a Slack incoming webhook."""
    request = Request(
        webhook_url,
        data=json.dumps({"text": text}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(request, timeout=15) as response:
        if response.status >= 300:
            raise RuntimeError(f"Slack webhook returned HTTP {response.status}")


def send_incident_detected_slack(incident: dict[str, Any]) -> None:
    """Send an Incident detected notification to configured Slack webhooks."""
    rule_id = incident.get("rule_id")
    if rule_id is None:
        return

    webhooks = get_notification_recipients(int(rule_id), "Incident detected", "slack")
    if not webhooks:
        logger.info("No Slack webhooks configured for rule %s", rule_id)
        return

    detail = incident.get("detail") or {}
    title = detail.get("title") or "Incident detected"
    text = (
        f"*{title}*\n"
        f"Severity: {incident.get('severity', 'Unknown')}\n"
        f"Target: {incident.get('target', 'Unknown')}\n"
        f"Metric: {incident.get('metric', 'Unknown')}\n"
        f"Incident: {incident.get('id', 'Unknown')}"
    )

    for webhook_url in webhooks:
        try:
            send_slack_webhook(webhook_url, text)
            logger.info("Incident Slack notification sent for %s", incident.get("id"))
        except (HTTPError, URLError, OSError, RuntimeError):
            logger.exception("Could not send Slack notification for %s", incident.get("id"))
