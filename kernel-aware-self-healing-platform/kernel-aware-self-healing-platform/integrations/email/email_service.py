from __future__ import annotations

import logging
import os
import smtplib
from email.message import EmailMessage
from typing import Any
from pathlib import Path
from dotenv import load_dotenv

from repository.user_rules import get_notification_recipients

logger = logging.getLogger(__name__)
load_dotenv(Path(__file__).resolve().parent / ".env")


def send_email(recipient: str, subject: str, body: str) -> None:
    """Send one plain-text email using SMTP settings from environment variables."""
    host = os.getenv("SMTP_HOST")
    username = os.getenv("SMTP_USERNAME")
    password = os.getenv("SMTP_PASSWORD")
    sender = os.getenv("SMTP_FROM") or username
    port = int(os.getenv("SMTP_PORT", "587"))
    required = {"SMTP_HOST": host, "SMTP_USERNAME": username, "SMTP_PASSWORD": password, "SMTP_FROM or SMTP_USERNAME": sender}
    missing = [name for name, value in required.items() if not value]
    if missing:
        raise RuntimeError("Missing email configuration: " + ", ".join(missing))

    message = EmailMessage()
    message["From"] = sender
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content(body)

    with smtplib.SMTP(host, port, timeout=15) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.ehlo()
        smtp.login(username, password)
        smtp.send_message(message)


def _incident_email(incident: dict[str, Any]) -> tuple[str, str]:
    detail = incident.get("detail") or {}
    trigger = detail.get("trigger") or {}
    title = detail.get("title") or "Incident detected"
    incident_id = incident.get("id", "unknown")
    severity = incident.get("severity", "Unknown")
    metric = incident.get("metric") or trigger.get("metric", "Unknown")
    current_value = trigger.get("currentValue", "Unknown")
    threshold = trigger.get("threshold", "Unknown")
    system = detail.get("system") or incident.get("system_id", "Unknown")
    target = incident.get("target", "Unknown")
    created_at = incident.get("created_at", "Unknown")
    subject = f"[{severity}] {title} ({incident_id})"
    body = (
        "A monitoring rule detected an incident.\n\n"
        f"Incident: {incident_id}\nTitle: {title}\nSeverity: {severity}\n"
        f"System: {system}\nTarget: {target}\nMetric: {metric}\n"
        f"Current value: {current_value}\nThreshold: {threshold}\nDetected at: {created_at}\n"
    )
    return subject, body


def send_incident_detected_emails(incident: dict[str, Any]) -> None:
    """Send email for the Incident detected event configured on this rule."""
    rule_id = incident.get("rule_id")
    if rule_id is None:
        logger.info("Skipping incident email: incident %s has no rule_id", incident.get("id"))
        return
    recipients = get_notification_recipients(int(rule_id), "Incident detected", "email")
    if not recipients:
        logger.info("No email recipients configured for rule %s", rule_id)
        return
    subject, body = _incident_email(incident)
    for recipient in recipients:
        try:
            send_email(recipient, subject, body)
            logger.info("Incident email sent for incident %s", incident.get("id"))
        except Exception:
            # Keep incident persistence and dashboard delivery working if SMTP fails.
            logger.exception("Could not send incident email for incident %s", incident.get("id"))