
import copy
import json
import time
from types import SimpleNamespace
from unittest.mock import patch

from load_data.user_rules.rule_loader import load_rules
from load_data.redis_connection.redis_connection import redis_client
from load_data.system_metrics.metrics_loader import get_memory_metrics

from detection.strategies.memeory_detecter import MemoryDetector
from detection.duration import clear_duration

from incident_management.manager import (
    incident_fingerprint,
    _active_key,
)


# ============================================================
# TEST CONFIGURATION
# ============================================================

SYSTEM_ID = 3
SOURCE_RULE_ID = 119
TEST_RULE_ID = 990000000 + int(time.time())

METRIC_NAME = "system_memory_usage_percent"
TEST_DURATION = 10
POLL_INTERVAL = 2
MAX_WAIT_SECONDS = 30


# ============================================================
# TEST HELPERS
# ============================================================

def create_fake_decision_response(*args, **kwargs):

    request_data = kwargs["json"]

    response_data = {
        "incident_id": request_data["incident_id"],
        "fingerprint": request_data["fingerprint"],
        "decision": {},
        "policy": {},
        "publication": {
            "outcome": "PUBLISH",
            "reason": "Memory integration test",
        },
        "outcome": "PERMITTED",
    }

    return SimpleNamespace(
        status_code=200,
        raise_for_status=lambda: None,
        json=lambda: response_data,
    )


def fake_publish(incident, event):

    return {
        "incident": {
            "incident_id": incident["incident_id"]
        }
    }


def print_result(test_id, description):

    print(f"[PASS] {test_id}: {description}")


# ============================================================
# MAIN TEST
# ============================================================

def main():

    detector = MemoryDetector()

    # --------------------------------------------------------
    # TC-01: Load backend rule
    # --------------------------------------------------------

    rules = load_rules(SYSTEM_ID)

    original_rule = next(
        (
            item for item in rules
            if item.get("rule", {}).get("id") == SOURCE_RULE_ID
        ),
        None,
    )

    assert original_rule is not None, "Source rule not found"

    rule = copy.deepcopy(original_rule)

    rule["rule"]["id"] = TEST_RULE_ID
    rule["rule"]["target_type"] = "Host"

    metric_config = next(
        (
            item for item in rule.get("metrics", [])
            if item.get("metric") == METRIC_NAME
        ),
        None,
    )

    assert metric_config is not None, "Memory metric configuration missing"

    metric_config["duration_seconds"] = TEST_DURATION

    print_result("TC-01", "Backend memory rule loaded and isolated")

    # --------------------------------------------------------
    # TC-02: Read real Prometheus metrics
    # --------------------------------------------------------

    real_results = get_memory_metrics(
        system_id=SYSTEM_ID,
        metric_name=METRIC_NAME,
    )

    assert real_results, "Prometheus returned no memory metrics"

    labels = real_results[0].get("metric", {})
    value_data = real_results[0].get("value", [])

    assert len(value_data) >= 2, "Invalid Prometheus result"

    current_value = float(value_data[1])

    target = (
        labels.get("hostname")
        or labels.get("instance")
        or "host"
    )

    threshold = float(metric_config["threshold"])

    print("Prometheus target:", target)
    print("Current memory usage:", current_value)
    print("Configured threshold:", threshold)

    assert current_value > threshold, (
        "Current memory usage is not above the configured threshold. "
        "Use a controlled test metric if you need to test violation."
    )

    print_result("TC-02", "Real Prometheus metric retrieved and threshold verified")

    # --------------------------------------------------------
    # Prepare isolated Redis identity
    # --------------------------------------------------------

    identity_payload = {
        "rule_id": TEST_RULE_ID,
        "system_id": SYSTEM_ID,
        "monitor_type": "memory",
        "incident_type": "memory",
        "target_type": "Host",
        "target": target,
        "pid": None,
        "metric": METRIC_NAME,
        "violated_metric": metric_config,
    }

    fingerprint = incident_fingerprint(identity_payload)
    redis_key = _active_key(fingerprint)

    timer_identity = {
        "category": "memory",
        "system_id": SYSTEM_ID,
        "rule_id": TEST_RULE_ID,
        "target": target,
        "metric": METRIC_NAME,
        "operator": metric_config["operator"],
        "threshold": threshold,
        "duration_seconds": TEST_DURATION,
    }

    assert not redis_client.exists(redis_key), (
        "A test incident already exists for this identity"
    )

    # --------------------------------------------------------
    # TC-03 to TC-08
    # --------------------------------------------------------

    try:

        with patch(
            "incident_management.manager.requests.post",
            side_effect=create_fake_decision_response,
        ) as decision_mock, patch(
            "incident_management.manager.publish_incident",
            side_effect=fake_publish,
        ) as publish_mock:

            # ------------------------------------------------
            # TC-03: Threshold violation and duration tracking
            # ------------------------------------------------

            print("\nWaiting for duration-qualified violation...")

            deadline = time.monotonic() + MAX_WAIT_SECONDS

            created_incident = None

            while time.monotonic() < deadline:

                detector.detect(rule)

                stored = redis_client.get(redis_key)

                if stored:

                    state = json.loads(stored)

                    if state.get("status") == "OPEN":
                        created_incident = state
                        break

                time.sleep(POLL_INTERVAL)

            assert created_incident is not None, (
                "No incident created within the allowed duration"
            )

            incident_id = created_incident["incident_id"]

            print_result(
                "TC-03",
                "Threshold violation persisted long enough to trigger incident",
            )

            # ------------------------------------------------
            # TC-04: Incident creation
            # ------------------------------------------------

            assert created_incident["status"] == "OPEN"
            assert created_incident["rule_id"] == TEST_RULE_ID

            print("Incident ID:", incident_id)

            print_result("TC-04", "Incident created by actual Incident Manager")

            # ------------------------------------------------
            # TC-05: Redis persistence
            # ------------------------------------------------

            assert redis_client.exists(redis_key)

            print_result("TC-05", "Incident persisted in real Redis")

            # ------------------------------------------------
            # TC-06: Duplicate prevention
            # ------------------------------------------------

            detector.detect(rule)

            repeated_state = json.loads(
                redis_client.get(redis_key)
            )

            assert repeated_state["incident_id"] == incident_id
            assert repeated_state["status"] == "OPEN"

            print_result(
                "TC-06",
                "Repeated violation reused the existing incident",
            )

            # ------------------------------------------------
            # TC-07: Recovery detection and resolution
            # ------------------------------------------------

            recovery_metric = {
                "metric": {
                    **labels,
                    "__name__": METRIC_NAME,
                },
                "value": [time.time(), "30.0"],
            }

            with patch(
                "detection.strategies.memeory_detecter.get_memory_metrics",
                return_value=[recovery_metric],
            ):

                detector.detect(rule)

            assert not redis_client.exists(redis_key), (
                "Resolved incident still exists in active Redis state"
            )

            print_result(
                "TC-07",
                "Recovery detected and incident resolved",
            )

            # ------------------------------------------------
            # TC-08: Redis cleanup
            # ------------------------------------------------

            assert not redis_client.exists(redis_key)

            print_result(
                "TC-08",
                "Active Redis incident record removed",
            )

            print("\nExternal service calls:")
            print("Decision Engine:", decision_mock.call_count)
            print("Backend publishing:", publish_mock.call_count)

            assert decision_mock.call_count >= 1
            assert publish_mock.call_count >= 2

    finally:

        # Clean up only this test's Redis records.
        redis_client.delete(redis_key)
        clear_duration(timer_identity)

    print("\n========================================")
    print("ALL MEMORY INTEGRATION TESTS PASSED")
    print("========================================")


if __name__ == "__main__":
    main()
