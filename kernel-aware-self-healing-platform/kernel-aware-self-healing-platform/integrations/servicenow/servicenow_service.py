from __future__ import annotations

import json
import logging
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from repository.user_rules import get_servicenow_config

logger = logging.getLogger(__name__)


def _read_json(response) -> dict[str, Any]:
    payload = response.read().decode("utf-8")
    return json.loads(payload) if payload else {}


def get_access_token(*, instance_url: str, client_id: str, client_secret: str) -> str:
    """Request an OAuth access token using ServiceNow client credentials."""
    request = Request(
        f"{instance_url.rstrip('/')}/oauth_token.do",
        data=urlencode(
            {
                "grant_type": "client_credentials",
                "client_id": client_id,
                "client_secret": client_secret,
            }
        ).encode("utf-8"),
        headers={"Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json"},
        method="POST",
    )
    with urlopen(request, timeout=15) as response:
        if response.status != 200:
            raise RuntimeError(f"ServiceNow token endpoint returned HTTP {response.status}")
        token = _read_json(response).get("access_token")
        if not token:
            raise RuntimeError("ServiceNow token response did not contain access_token")
        return str(token)


def _incident_description(incident: dict[str, Any]) -> str:
    detail = incident.get("detail") or {}
    trigger = detail.get("trigger") or {}
    return "\n".join(
        [
            str(detail.get("description") or "A monitoring rule detected an incident."),
            "",
            f"Kernel incident: {incident.get('id', 'Unknown')}",
            f"Severity: {incident.get('severity', 'Unknown')}",
            f"System: {detail.get('system') or incident.get('system_id', 'Unknown')}",
            f"Target: {incident.get('target', 'Unknown')}",
            f"Metric: {incident.get('metric') or trigger.get('metric', 'Unknown')}",
            f"Current value: {trigger.get('currentValue', 'Unknown')}",
            f"Threshold: {trigger.get('threshold', 'Unknown')}",
            f"Detected at: {incident.get('created_at', 'Unknown')}",
        ]
    )


def _impact_and_urgency(severity: Any) -> tuple[str, str]:
    value = str(severity or "medium").lower()
    if value in {"critical", "p0"}:
        return "1", "1"
    if value in {"high", "p1"}:
        return "2", "2"
    return "3", "3"


def create_service_now_incident(
    *,
    instance_url: str,
    access_token: str,
    incident: dict[str, Any],
) -> dict[str, Any]:
    """Create an incident in the ServiceNow incident table."""
    detail = incident.get("detail") or {}
    impact, urgency = _impact_and_urgency(incident.get("severity"))
    fields = {
        "short_description": f"[{incident.get('severity', 'Unknown')}] {detail.get('title') or 'Incident detected'}",
        "description": _incident_description(incident),
        "impact": impact,
        "urgency": urgency,
        "category": incident.get("category") or "Software",
        "correlation_id": str(incident.get("id", "")),
    }
    request = Request(
        f"{instance_url.rstrip('/')}/api/now/table/incident",
        data=json.dumps(fields).encode("utf-8"),
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        },
        method="POST",
    )
    with urlopen(request, timeout=15) as response:
        if response.status not in (200, 201):
            raise RuntimeError(f"ServiceNow incident endpoint returned HTTP {response.status}")
        return _read_json(response).get("result", {})


def send_incident_detected_servicenow(incident: dict[str, Any]) -> None:
    """Create a ServiceNow incident for a rule's Incident detected event."""
    rule_id = incident.get("rule_id")
    config = get_servicenow_config(int(rule_id)) if rule_id is not None else None
    if config is None:
        logger.info("No ServiceNow configuration found for rule %s", rule_id)
        return

    try:
        access_token = get_access_token(
            instance_url=config.instance_url,
            client_id=config.client_id,
            client_secret=config.client_secret_encrypted,
        )
        result = create_service_now_incident(
            instance_url=config.instance_url,
            access_token=access_token,
            incident=incident,
        )
        logger.info(
            "ServiceNow incident created for %s: %s",
            incident.get("id"),
            result.get("number") or result.get("sys_id", "unknown"),
        )
    except (HTTPError, URLError, OSError, RuntimeError, ValueError):
        logger.exception("Could not create ServiceNow incident for %s", incident.get("id"))
