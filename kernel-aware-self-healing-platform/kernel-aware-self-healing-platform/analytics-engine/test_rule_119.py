
from unittest.mock import patch

from load_data.user_rules.rule_loader import load_rules
from detection.strategies.memeory_detecter import MemoryDetector
from load_data.system_metrics.metrics_loader import get_memory_metrics

SYSTEM_ID = 1
RULE_ID = 119

# Load the real rule from the backend.
rules = load_rules(SYSTEM_ID)
matches = [
    item for item in rules
    if item.get("rule", {}).get("id") == RULE_ID
]

if len(matches) != 1:
    raise RuntimeError(
        f"Expected one rule with ID {RULE_ID}; found {len(matches)}"
    )

rule = matches[0]

assert rule["rule"]["status"].upper() == "ENABLED"
assert any(
    metric.get("metric") == "system_memory_usage_percent"
    for metric in rule.get("metrics", [])
)

# Fetch real Prometheus data.
results = get_memory_metrics(SYSTEM_ID)
if not results:
    raise RuntimeError("No Prometheus memory metrics returned")

print("Rule:", rule["rule"]["name"])
print("Rule ID:", RULE_ID)
print("Metrics:", rule["metrics"])
print("Real memory readings:", [float(r["value"][1]) for r in results])

# Use real Prometheus data and Redis duration tracking.
# Mock only incident delivery to prevent a real POST request.
with patch(
    "detection.strategies.memeory_detecter.manage_incidents"
) as mock_incidents:
    MemoryDetector().detect(rule)

    if mock_incidents.called:
        incident = mock_incidents.call_args.args[0]
        print("DETECTION: Incident payload was created.")
        print("Payload:", incident)
        print("Delivery was mocked; no incident was sent.")
    else:
        print(
            "No incident was created in this run. "
            "Check the threshold and duration conditions."
        )

print("Rule 119 controlled test completed.")
