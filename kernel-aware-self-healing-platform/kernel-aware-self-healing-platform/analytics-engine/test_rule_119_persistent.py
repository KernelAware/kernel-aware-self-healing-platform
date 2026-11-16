
import time
import uuid
from unittest.mock import patch

from load_data.user_rules.rule_loader import load_rules
from detection.strategies.memeory_detecter import MemoryDetector
from detection.duration import clear_duration

SYSTEM_ID = 3
RULE_ID = 119
MAX_WAIT_SECONDS = 30
POLL_INTERVAL_SECONDS = 2

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

# Use a unique rule ID so this test cannot interfere with the real Rule 119 timer.
test_rule = {
    **rule,
    "rule": {
        **rule["rule"],
        "id": 999991,
    },
}

metric = next(
    item for item in test_rule.get("metrics", [])
    if item.get("metric") == "system_memory_usage_percent"
)

metric["duration_seconds"] = 10

# The detector uses the instance label as the host target.
# This identity must match the detector's generated identity.
from load_data.system_metrics.metrics_loader import get_memory_metrics

results = get_memory_metrics(
    system_id=SYSTEM_ID,
    metric_name="system_memory_usage_percent",
)

if not results:
    raise RuntimeError("No Prometheus memory metrics returned")

target = (
    results[0].get("metric", {}).get("hostname")
    or results[0].get("metric", {}).get("instance")
    or "host"
)

identity = {
    "category": "memory",
    "system_id": SYSTEM_ID,
    "rule_id": 999991,
    "target": target,
    "metric": metric["metric"],
    "operator": metric["operator"],
    "threshold": float(metric["threshold"]),
    "duration_seconds": 10,
}

detector = MemoryDetector()

print(f"Testing Rule {RULE_ID} using isolated rule ID 999991")
print(f"Target: {target}")
print("Duration: 10 seconds")
print("Evaluations will run in the same Python process.")

try:
    with patch(
        "detection.strategies.memeory_detecter.manage_incidents"
    ) as mock_incidents:

        start = time.time()

        while time.time() - start < MAX_WAIT_SECONDS:

            mock_incidents.reset_mock()

            print("\nEvaluating memory rule...")

            detector.detect(test_rule)

            if mock_incidents.called:
                for call in mock_incidents.call_args_list:
                    incident = call.args[0]
                    violated = call.kwargs.get(
                        "condition_violated", True
                    )

                    if violated:
                        print("\nPASS: Incident creation requested.")
                        print("Incident value:", incident["value"])
                        print("Incident payload:", incident)
                        print("Delivery was mocked.")
                        break

                else:
                    print("Recovery requested; continuing test.")

                if any(
                    call.kwargs.get("condition_violated", True)
                    for call in mock_incidents.call_args_list
                ):
                    break

            time.sleep(POLL_INTERVAL_SECONDS)

        else:
            print(
                "\nTIMEOUT: No incident creation was requested "
                "within the configured test window."
            )

finally:
    clear_duration(identity)
    print("\nTest timer cleanup completed.")
