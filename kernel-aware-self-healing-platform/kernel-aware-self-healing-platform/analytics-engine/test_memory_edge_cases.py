
from unittest.mock import patch

from detection.strategies.memeory_detecter import MemoryDetector


def test_missing_prometheus_metrics():

    rule = {
        "rule": {
            "id": 990001,
            "system_id": 3,
            "status": "ENABLED",
        },
        "metrics": [
            {
                "metric": "system_memory_usage_percent",
                "operator": "Greater Than (>)",
                "threshold": 50,
                "duration_seconds": 10,
            }
        ],
        "actions": [],
    }

    detector = MemoryDetector()

    with patch(
        "detection.strategies.memeory_detecter.get_memory_metrics",
        return_value=[],
    ) as metrics_mock, patch(
        "detection.strategies.memeory_detecter.check_duration"
    ) as duration_mock, patch(
        "detection.strategies.memeory_detecter.manage_incidents"
    ) as incident_mock:

        result = detector.detect(rule)

        assert result is None
        metrics_mock.assert_called_once_with(
            system_id=3,
            metric_name="system_memory_usage_percent",
        )
        duration_mock.assert_not_called()
        incident_mock.assert_not_called()

    print("[PASS] TC-09: Missing Prometheus metrics handled safely")


def test_invalid_prometheus_values():

    rule = {
        "rule": {
            "id": 990002,
            "system_id": 3,
            "status": "ENABLED",
        },
        "metrics": [
            {
                "metric": "system_memory_usage_percent",
                "operator": "Greater Than (>)",
                "threshold": 50,
                "duration_seconds": 10,
            }
        ],
        "actions": [],
    }

    detector = MemoryDetector()

    invalid_values = ["invalid", "NaN", "inf"]

    for invalid_value in invalid_values:

        prometheus_result = [{
            "metric": {
                "instance": "test-host:8001"
            },
            "value": [1234567890, invalid_value],
        }]

        with patch(
            "detection.strategies.memeory_detecter.get_memory_metrics",
            return_value=prometheus_result,
        ), patch(
            "detection.strategies.memeory_detecter.check_duration"
        ) as duration_mock, patch(
            "detection.strategies.memeory_detecter.manage_incidents"
        ) as incident_mock:

            result = detector.detect(rule)

            assert result is None
            duration_mock.assert_not_called()
            incident_mock.assert_not_called()

    print("[PASS] TC-10: Invalid Prometheus values handled safely")


def test_disabled_rule():

    rule = {
        "rule": {
            "id": 990003,
            "system_id": 3,
            "status": "DISABLED",
        },
        "metrics": [
            {
                "metric": "system_memory_usage_percent",
                "operator": "Greater Than (>)",
                "threshold": 50,
                "duration_seconds": 10,
            }
        ],
        "actions": [],
    }

    detector = MemoryDetector()

    with patch(
        "detection.strategies.memeory_detecter.get_memory_metrics"
    ) as metrics_mock, patch(
        "detection.strategies.memeory_detecter.manage_incidents"
    ) as incident_mock:

        result = detector.detect(rule)

        assert result is None
        metrics_mock.assert_not_called()
        incident_mock.assert_not_called()

    print("[PASS] TC-11: Disabled rules are ignored safely")


def test_invalid_rule_configuration():

    base_rule = {
        "rule": {
            "id": 990004,
            "system_id": 3,
            "status": "ENABLED",
        },
        "metrics": [],
        "actions": [],
    }

    invalid_configs = [
        {
            "metric": "system_memory_usage_percent",
            "threshold": 50,
            "duration_seconds": 10,
        },
        {
            "metric": "system_memory_usage_percent",
            "operator": "Greater Than (>)",
            "duration_seconds": 10,
        },
        {
            "metric": "system_memory_usage_percent",
            "operator": "Greater Than (>)",
            "threshold": "invalid",
            "duration_seconds": 10,
        },
        {
            "metric": "system_memory_usage_percent",
            "operator": "Greater Than (>)",
            "threshold": 50,
            "duration_seconds": -5,
        },
        {
            "metric": "system_memory_usage_percent",
            "operator": "Greater Than (>)",
            "threshold": float("inf"),
            "duration_seconds": 10,
        },
    ]

    detector = MemoryDetector()

    for config in invalid_configs:

        rule = {
            **base_rule,
            "metrics": [config],
        }

        with patch(
            "detection.strategies.memeory_detecter.get_memory_metrics"
        ) as metrics_mock, patch(
            "detection.strategies.memeory_detecter.manage_incidents"
        ) as incident_mock:

            result = detector.detect(rule)

            assert result is None
            metrics_mock.assert_not_called()
            incident_mock.assert_not_called()

    print("[PASS] TC-12: Invalid rule configurations rejected safely")


def test_multiple_prometheus_targets():

    rule = {
        "rule": {
            "id": 990005,
            "system_id": 3,
            "status": "ENABLED",
        },
        "metrics": [
            {
                "metric": "system_memory_usage_percent",
                "operator": "Greater Than (>)",
                "threshold": 50,
                "duration_seconds": 10,
            }
        ],
        "actions": [],
    }

    results = [
        {
            "metric": {"instance": "server-1:8001"},
            "value": [1234567890, "80"],
        },
        {
            "metric": {"instance": "server-2:8001"},
            "value": [1234567890, "30"],
        },
    ]

    detector = MemoryDetector()

    with patch(
        "detection.strategies.memeory_detecter.get_memory_metrics",
        return_value=results,
    ), patch(
        "detection.strategies.memeory_detecter.check_threshold",
        side_effect=lambda value, operator, threshold: value > threshold,
    ), patch(
        "detection.strategies.memeory_detecter.check_duration",
        return_value=False,
    ) as duration_mock, patch(
        "detection.strategies.memeory_detecter.clear_duration",
        return_value=True,
    ) as clear_mock, patch(
        "detection.strategies.memeory_detecter.manage_incidents"
    ) as incident_mock:

        detector.detect(rule)

        assert duration_mock.call_count == 1
        assert clear_mock.call_count == 1
        assert incident_mock.call_count == 1

        violation_identity = duration_mock.call_args.args[0]
        recovery_identity = clear_mock.call_args.args[0]

        assert violation_identity["target"] == "server-1:8001"
        assert recovery_identity["target"] == "server-2:8001"

        assert (
            violation_identity["target"]
            != recovery_identity["target"]
        )

    print("[PASS] TC-13: Multiple Prometheus targets evaluated independently")


if __name__ == "__main__":
    test_missing_prometheus_metrics()
    test_invalid_prometheus_values()
    test_disabled_rule()
    test_invalid_rule_configuration()
    test_multiple_prometheus_targets()