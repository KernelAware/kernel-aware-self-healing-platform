from __future__ import annotations

import base64
import json
import logging
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from repository.user_rules import get_jira_config

logger = logging.getLogger(__name__)


def _description_document(incident: dict[str, Any]) -> dict[str, Any]:
    detail = incident.get("detail") or {}
    trigger = detail.get("trigger") or {}
    lines = [
        "A monitoring rule detected an incident.",
        f"Incident: {incident.get('id', 'Unknown')}",
        f"Severity: {incident.get('severity', 'Unknown')}",
        f"Target: {incident.get('target', 'Unknown')}",
        f"Metric: {incident.get('metric', 'Unknown')}",
        f"Current value: {trigger.get('currentValue', 'Unknown')}",
        f"Threshold: {trigger.get('threshold', 'Unknown')}",
    ]
    return {
        "type": "doc",
        "version": 1,
        "content": [
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": line}],
            }
            for line in lines
        ],
    }


def create_jira_issue(
    *,
    site_url: str,
    account_email: str,
    api_token: str,
    project_key: str,
    issue_type: str,
    summary: str,
    description: dict[str, Any],
) -> dict[str, Any]:
    """Create one Jira Cloud issue using the configured rule credentials."""
    credentials = base64.b64encode(
        f"{account_email}:{api_token}".encode("utf-8")
    ).decode("ascii")
    request = Request(
        f"{site_url.rstrip('/')}/rest/api/3/issue",
        data=json.dumps({
            "fields": {
                "project": {"key": project_key},
                "summary": summary,
                "issuetype": {"name": issue_type},
                "description": description,
            }
        }).encode("utf-8"),
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Basic {credentials}",
        },
        method="POST",
    )
    with urlopen(request, timeout=15) as response:
        if response.status not in (200, 201):
            raise RuntimeError(f"Jira returned HTTP {response.status}")
        payload = response.read().decode("utf-8")
        return json.loads(payload) if payload else {}


def send_incident_detected_jira(incident: dict[str, Any]) -> None:
    """Create a Jira issue for the Incident detected event of a rule."""
    rule_id = incident.get("rule_id")
    config = get_jira_config(int(rule_id)) if rule_id is not None else None
    if config is None:
        logger.info("No Jira configuration found for rule %s", rule_id)
        return

    detail = incident.get("detail") or {}
    title = detail.get("title") or "Incident detected"
    try:
        result = create_jira_issue(
            site_url=config.site_url,
            account_email=config.account_email,
            api_token=config.api_token_encrypted,
            project_key=config.project_key,
            issue_type=config.issue_type,
            summary=f"[{incident.get('severity', 'Unknown')}] {title}",
            description=_description_document(incident),
        )
        logger.info(
            "Jira issue created for incident %s: %s",
            incident.get("id"),
            result.get("key", "unknown"),
        )
    except (HTTPError, URLError, OSError, RuntimeError, ValueError):
        logger.exception("Could not create Jira issue for incident %s", incident.get("id"))
