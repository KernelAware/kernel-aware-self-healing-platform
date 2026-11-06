import logging

from fastapi import FastAPI, HTTPException

from rules.rule_loader import load_rules
from policies.policy_checker import check_policy
from engine.decision import make_decision

app = FastAPI(title="Decision Engine")
logger = logging.getLogger(__name__)


def _bounded_response_body(response, limit: int = 1200) -> str:
    try:
        body = response.text or "<empty response body>"
    except Exception:
        body = "<response body unavailable>"
    if not isinstance(body, str):
        return "<response body unavailable>"
    return body[:limit] + ("…" if len(body) > limit else "")


def _evaluate_incident(incident: dict):
    required = ("incident_id", "fingerprint", "rule_id", "system_id", "monitor_type", "target", "metric", "value")
    missing = [field for field in required if incident.get(field) in (None, "")]
    if incident.get("severity", incident.get("incident_severity")) in (None, ""):
        missing.append("severity")
    if incident.get("priority", incident.get("incident_priority")) in (None, ""):
        missing.append("priority")
    violated_metric = incident.get("violated_metric") or {}
    if not isinstance(violated_metric, dict) or not all(
        violated_metric.get(field) not in (None, "") for field in ("metric", "operator", "threshold")
    ):
        missing.append("violated_metric.metric/operator/threshold")
    if missing:
        raise HTTPException(status_code=422, detail={"outcome": "INVALID_INCIDENT", "missing": missing})
    try:
        rules = load_rules(incident)
    except ValueError as error:
        logger.warning(
            "Decision rejected invalid or unavailable rule: system_id=%s rule_id=%s incident_id=%s fingerprint=%s error=%s",
            incident.get("system_id"), incident.get("rule_id"), incident.get("incident_id"),
            incident.get("fingerprint"), str(error),
        )
        raise HTTPException(status_code=422, detail={"outcome": "INVALID_RULE"}) from error
    except Exception as error:
        response = getattr(error, "response", None)
        logger.error(
            "Decision rule lookup failed: system_id=%s rule_id=%s incident_id=%s fingerprint=%s error=%s upstream_status=%s upstream_body=%s",
            incident.get("system_id"), incident.get("rule_id"), incident.get("incident_id"),
            incident.get("fingerprint"), type(error).__name__,
            getattr(response, "status_code", None),
            _bounded_response_body(response) if response is not None else "<no upstream response>",
        )
        raise HTTPException(status_code=503, detail={"outcome": "DECISION_FAILED"}) from error
    rule_info = rules.get("rule") if isinstance(rules, dict) else None
    if not isinstance(rule_info, dict):
        raise HTTPException(status_code=422, detail={"outcome": "INVALID_RULE"})
    if str(rule_info.get("id")) != str(incident.get("rule_id")):
        raise HTTPException(status_code=422, detail={"outcome": "INVALID_RULE"})
    if str(rule_info.get("system_id")) != str(incident.get("system_id")):
        raise HTTPException(status_code=422, detail={"outcome": "INVALID_RULE"})
    if str(rule_info.get("monitor_type", "")).lower() != str(incident.get("monitor_type", "")).lower():
        raise HTTPException(status_code=422, detail={"outcome": "INVALID_RULE"})
    if str(rule_info.get("status", "")).upper() != "ENABLED":
        return {
            "outcome": "DENIED",
            "incident_id": incident["incident_id"],
            "fingerprint": incident["fingerprint"],
            "publication": {"outcome": "REJECT", "reason": "Rule is disabled"},
            "decision": {"decision": "NO_ACTION", "reason": "Rule is disabled"},
            "policy": {"allowed": False, "reason": "Rule is disabled"},
        }
    policy = check_policy(rules)
    decision = make_decision(incident, rules, policy)
    if policy.get("reason") == "Approval required":
        outcome = "APPROVAL_REQUIRED"
    elif policy.get("allowed") is True:
        # Alert permission is independent from executing any remediation.
        outcome = "PERMITTED"
    else:
        outcome = "DENIED"
    return {
        "outcome": outcome,
        "incident_id": incident["incident_id"],
        "fingerprint": incident["fingerprint"],
        "publication": {
            "outcome": "PUBLISH",
            "reason": "Enabled monitoring rule qualified for alert publication",
        },
        "decision": decision,
        "policy": policy,
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/incidents")
def process_incident(incident: dict):
    return _evaluate_incident(incident)


@app.post("/decisions")
def evaluate_incident(incident: dict):
    """Evaluate alert publication eligibility; never executes remediation."""
    return _evaluate_incident(incident)
