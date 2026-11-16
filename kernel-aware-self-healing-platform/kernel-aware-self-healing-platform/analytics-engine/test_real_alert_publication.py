import uuid

from incident_management.manager import manage_incidents

incident = {
    "rule_id": 119,
    "system_id": 3,
    "monitor_type": "memory",
    "target_type": "Host",
    "target": f"web-02-test-{uuid.uuid4().hex[:8]}",
    "pid": None,
    "metric": "system_memory_usage_percent",
    "severity": "high",
    "priority": "Medium",
    "value": 95.0,
    "violated_metric": {
        "id": 106,
        "metric": "system_memory_usage_percent",
        "operator": "Greater Than (>)",
        "threshold": 50.0,
        "duration_seconds": 10,
    },
}

result = manage_incidents(incident)

if result is None:
    raise RuntimeError("Incident Manager did not return an incident.")

print("Incident ID:", result.get("incident_id"))
print("Decision outcome:", result.get("_decision_outcome"))
print("Publication outcome:", result.get("publication_outcome"))
print("Incident status:", result.get("status"))
print("Real backend publication test completed.")
