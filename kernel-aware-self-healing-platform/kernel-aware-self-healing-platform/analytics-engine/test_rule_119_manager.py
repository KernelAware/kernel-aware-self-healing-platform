
import json
from unittest.mock import Mock, patch

from load_data.user_rules.rule_loader import load_rules
from load_data.system_metrics.metrics_loader import get_memory_metrics
from load_data.redis_connection.redis_connection import redis_client
from detection.strategies.memeory_detecter import MemoryDetector

SYSTEM_ID = 1
RULE_ID = 119

# Load the actual rule from the backend.
rules = load_rules(SYSTEM_ID)
matches = [
    item for item in rules
    if item.get("rule", {}).get("id") == RULE_ID
]

if len(matches) != 1:
    raise RuntimeError(f"Expected exactly one rule {RULE_ID}")

rule = matches[0]

if rule["rule"]["status"].upper() != "ENABLED":
    raise RuntimeError("Rule 119 is not enabled")

# Read real memory metrics from Prometheus.
results = get_memory_metrics(SYSTEM_ID)
if not results:
    raise RuntimeError("No memory metrics returned from Prometheus")

current_value = float(results[0]["value"][1])
metric = next(
    m for m in rule["metrics"]
    if m["metric"] == "system_memory_usage_percent"
)

print("Rule ID:", RULE_ID)
print("Current memory:", current_value, "%")
print("Threshold:", metric["threshold"], "%")

if current_value <= metric["threshold"]:
    raise RuntimeError(
        "Memory is not above the rule threshold; "
        "test stopped without creating an incident."
    )

# Use the detector's real duration function and the real manager.
# Only the HTTP request is mocked.
with patch(
    "detection.strategies.memeory_detecter.get_memory_metrics",
    return_value=results,
), patch(
    "incident_management.manager.requests.post"
) as mock_post:

    response = Mock()
    response.json.return_value = {"status": "test-response"}
    mock_post.return_value = response

    MemoryDetector().detect(rule)

    if not mock_post.called:
        raise RuntimeError(
            "No HTTP request was attempted. "
            "The duration check may not have passed."
        )

    call = mock_post.call_args
    expected_url = "http://localhost:8002/incidents"

    assert call.args[0] == expected_url
    assert call.kwargs["timeout"] == 10

    sent_incident = call.kwargs["json"]
    assert sent_incident["rule_id"] == RULE_ID
    assert sent_incident["system_id"] == SYSTEM_ID
    assert sent_incident["value"] == current_value

    print("PASS: Real detector called the real incident manager.")
    print("PASS: Outgoing HTTP endpoint and JSON verified.")
    print("Incident JSON:")
    print(json.dumps(sent_incident, indent=2))

    # Verify the manager stored the incident under its Redis key.
    target = sent_incident.get("target", "unknown")
    pid = sent_incident.get("pid")
    if pid is None:
        pid = "host"

    redis_key = (
        f"incident:{SYSTEM_ID}:{metric['id']}:{target}:{pid}"
    )
    stored = redis_client.get(redis_key)

    if stored is None:
        raise AssertionError("Incident was not found in Redis")

    assert json.loads(stored) == sent_incident
    print("PASS: Incident JSON verified in Redis.")

print("No real HTTP request was sent to the decision engine.")
