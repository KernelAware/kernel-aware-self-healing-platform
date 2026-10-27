import json
import unittest
from datetime import datetime, timezone
import time
import uuid
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
from sqlalchemy import BigInteger, create_engine, inspect
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from models.incidents import Incident
from repository.incidents import incident_to_dict, list_incidents, persist_incident
from routers.alerts import alert_incidents, publish_rule_alert
from routers.incidents import get_incidents
from routers.monitoring import monitoring_readiness, update_monitoring_readiness
from routers.websocket import connected_clients, give_message
from models.user_rules.rule_notification import RuleNotification
from models.user_rules.rule import Rule
from repository import user_rules as user_rule_repository
from services.user_rule_service import user_rules_service


TEST_ANALYTICS_GENERATION = "api-test-run"


@compiles(BigInteger, "sqlite")
def _sqlite_bigint_as_integer(_type, _compiler, **_kwargs):
    # SQLite autoincrements only a column declared exactly as INTEGER.
    return "INTEGER"


def test_engine():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Incident.__table__.create(bind=engine)
    return engine


def sample_detail(incident_id="INC-one", status="OPEN", value=92.4):
    return {
        "id": incident_id,
        "incident_id": incident_id,
        "fingerprint": "same-rule-target-metric",
        "analytics_generation": TEST_ANALYTICS_GENERATION,
        "rule_id": 44,
        "monitor_type": "disk",
        "category": "disk",
        "system_id": 1,
        "target_type": "filesystem",
        "target": "/mnt/data",
        "title": "Disk usage - /mnt/data",
        "priority": "P1",
        "severity": "Critical",
        "status": status,
        "created_at": "2026-10-19T10:00:00+00:00",
        "updated_at": "2026-10-19T10:00:00+00:00",
        "resolved_at": "2026-10-19T10:05:00+00:00" if status == "RESOLVED" else None,
        "trigger": {
            "metric": "disk_usage_percent",
            "currentValue": value,
            "operator": "Greater Than (>)",
            "threshold": 80,
            "durationSeconds": 30,
            "duration": "30 seconds",
        },
    }


def sample_alert(incident_id="INC-one", status="OPEN", value=92.4):
    return {
        "id": incident_id,
        "incident_id": incident_id,
        "rule_id": 44,
        "system_id": 1,
        "category": "disk",
        "target": "/mnt/data",
        "metric": "disk_usage_percent",
        "current_value": value,
        "threshold": 80,
        "operator": "Greater Than (>)",
        "priority": "P1",
        "severity": "Critical",
        "status": status,
    }


class IncidentPersistenceTests(unittest.TestCase):
    def setUp(self):
        self.engine = test_engine()
        self.db = Session(self.engine)

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_insert_update_resolve_and_retry_use_one_existing_identity(self):
        opened, created = persist_incident(self.db, "opened", sample_detail(), sample_alert())
        self.assertTrue(created)
        self.assertEqual(opened.id, "INC-one")
        original_opened_at = opened.opened_at

        updated, created = persist_incident(
            self.db,
            "updated",
            sample_detail(value=94.0),
            sample_alert(value=94.0),
        )
        self.assertFalse(created)
        self.assertEqual(updated.id, opened.id)
        self.assertEqual(updated.rule_id, 44)
        self.assertEqual(updated.system_id, 1)
        self.assertEqual(updated.detail["trigger"]["currentValue"], 94.0)
        self.assertEqual(updated.opened_at, original_opened_at)
        self.assertEqual(self.db.query(Incident).count(), 1)

        resolved, created = persist_incident(
            self.db,
            "resolved",
            sample_detail(status="RESOLVED"),
            sample_alert(status="RESOLVED"),
        )
        self.assertFalse(created)
        self.assertEqual(resolved.status, "RESOLVED")
        self.assertIsNotNone(resolved.resolved_at)

        retried, created = persist_incident(
            self.db,
            "resolved",
            sample_detail(status="RESOLVED"),
            sample_alert(status="RESOLVED"),
        )
        self.assertFalse(created)
        self.assertEqual(retried.id, resolved.id)
        self.assertEqual(self.db.query(Incident).count(), 1)

        later, created = persist_incident(
            self.db,
            "opened",
            sample_detail("INC-two"),
            sample_alert("INC-two"),
        )
        self.assertTrue(created)
        self.assertEqual(self.db.query(Incident).count(), 2)
        self.assertNotEqual(later.id, resolved.id)

    def test_history_uses_existing_columns_and_json_details(self):
        record, _ = persist_incident(self.db, "opened", sample_detail(), sample_alert())
        response = incident_to_dict(record)
        self.assertEqual(response["id"], "INC-one")
        self.assertEqual(response["rule_id"], 44)
        self.assertEqual(response["system_id"], 1)
        self.assertEqual(response["category"], "disk")
        self.assertEqual(response["target"], "/mnt/data")
        self.assertEqual(response["metric"], "disk_usage_percent")
        self.assertEqual(response["severity"], "Critical")
        self.assertEqual(response["priority"], "P1")
        self.assertEqual(response["detail"]["trigger"]["currentValue"], 92.4)
        self.assertEqual(response["alert"]["current_value"], 92.4)
        self.assertEqual(len(list_incidents(self.db, system_id=1)), 1)
        self.assertEqual(len(list_incidents(self.db, system_id=2)), 0)
        self.assertFalse(inspect(self.engine).has_table("alert_incidents"))

    def test_disk_active_snapshot_filter_keeps_history_separate(self):
        persist_incident(self.db, "opened", sample_detail("INC-active"), sample_alert("INC-active"))
        persist_incident(
            self.db,
            "resolved",
            sample_detail("INC-resolved", status="RESOLVED"),
            sample_alert("INC-resolved", status="RESOLVED"),
        )
        process_detail = sample_detail("INC-process")
        process_detail["monitor_type"] = "process"
        process_detail["category"] = "process"
        process_alert = sample_alert("INC-process")
        process_alert["category"] = "process"
        persist_incident(self.db, "opened", process_detail, process_alert)

        active_disk = list_incidents(self.db, system_id=1, monitor_type="disk", status="OPEN")
        history = list_incidents(self.db, system_id=1)

        self.assertEqual([record.id for record in active_disk], ["INC-active"])
        self.assertEqual({record.id for record in history}, {"INC-active", "INC-resolved", "INC-process"})


class IncidentApiTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        global TEST_ANALYTICS_GENERATION
        TEST_ANALYTICS_GENERATION = f"test-{uuid.uuid4().hex}"
        await update_monitoring_readiness({
            "system_id": 1,
            "generation": TEST_ANALYTICS_GENERATION,
            "stage": "started",
        })
        await update_monitoring_readiness({
            "system_id": 1,
            "generation": TEST_ANALYTICS_GENERATION,
            "stage": "completed",
        })

    async def test_rule_route_commits_before_broadcast_and_updates_same_row(self):
        engine = test_engine()
        db = Session(engine)
        payload = {
            "event": "opened",
            "incident_detail": sample_detail(incident_id="INC-route"),
            "alert": sample_alert(incident_id="INC-route"),
        }
        sent = []

        async def assert_committed_before_send(message, systemid):
            self.assertEqual(db.query(Incident).count(), 1)
            self.assertEqual(systemid, 1)
            sent.append(message)

        try:
            with patch("routers.alerts.give_message", side_effect=assert_committed_before_send):
                opened = await publish_rule_alert(payload, db)
                payload["event"] = "updated"
                payload["incident_detail"]["trigger"]["currentValue"] = 95.0
                payload["alert"]["current_value"] = 95.0
                updated = await publish_rule_alert(payload, db)

            self.assertEqual(opened["incident"]["id"], "INC-route")
            self.assertEqual(updated["incident"]["id"], "INC-route")
            self.assertEqual(db.query(Incident).count(), 1)
            active = monitoring_readiness(1)["active_alerts"]
            self.assertEqual([item["id"] for item in active], ["INC-route"])
            self.assertEqual(active[0]["trigger"]["currentValue"], 95.0)
            self.assertEqual([item["type"] for item in sent], [
                "incident_detail", "incident_update", "alerts",
                "incident_detail", "incident_update",
            ])
            self.assertEqual(sent[1]["event"], "opened")
            self.assertEqual(sent[1]["data"]["monitor_type"], "disk")
            self.assertEqual(sent[1]["data"]["incident_id"], "INC-route")
            self.assertFalse(inspect(engine).has_table("alert_incidents"))
        finally:
            db.close()
            engine.dispose()


    async def test_repeated_disk_resolution_updates_one_row_without_duplicate_events(self):
        engine = test_engine()
        db = Session(engine)
        payload = {
            "event": "opened",
            "incident_detail": sample_detail(incident_id="INC-idempotent"),
            "alert": sample_alert(incident_id="INC-idempotent"),
        }
        sent = []

        async def capture(message, systemid):
            sent.append((message, systemid))

        try:
            with patch("routers.alerts.give_message", side_effect=capture):
                await publish_rule_alert(payload, db)
                payload["event"] = "resolved"
                payload["incident_detail"]["status"] = "RESOLVED"
                payload["alert"]["status"] = "RESOLVED"
                await publish_rule_alert(payload, db)
                await publish_rule_alert(payload, db)

            self.assertEqual(db.query(Incident).count(), 1)
            self.assertEqual(db.get(Incident, "INC-idempotent").status, "RESOLVED")
            self.assertEqual(monitoring_readiness(1)["active_alerts"], [])
            self.assertEqual(
                [item[0].get("type") for item in sent],
                ["incident_detail", "incident_update", "alerts", "incident_detail", "incident_update"],
            )
        finally:
            db.close()
            engine.dispose()

    async def test_incident_history_route_reads_saved_incident(self):
        engine = test_engine()
        db = Session(engine)
        try:
            persist_incident(
                db,
                "opened",
                sample_detail(incident_id="INC-history"),
                sample_alert(incident_id="INC-history"),
            )
            history = get_incidents(system_id=1, db=db)
            self.assertEqual(history[0]["id"], "INC-history")
            self.assertEqual(history[0]["category"], "disk")
        finally:
            db.close()
            engine.dispose()

    async def test_active_disk_snapshot_uses_current_run_memory_not_history_rows(self):
        engine = test_engine()
        db = Session(engine)
        try:
            persist_incident(
                db,
                "opened",
                sample_detail("INC-current"),
                sample_alert("INC-current"),
            )
            persist_incident(
                db,
                "resolved",
                sample_detail("INC-old", status="RESOLVED"),
                sample_alert("INC-old", status="RESOLVED"),
            )

            active = monitoring_readiness(1)["active_alerts"]
            history = get_incidents(system_id=1, db=db)

            self.assertEqual(active, [])
            self.assertEqual({item["id"] for item in history}, {"INC-current", "INC-old"})
        finally:
            db.close()
            engine.dispose()

    async def test_new_run_clears_dashboard_snapshot_and_preserves_incident_history(self):
        engine = test_engine()
        db = Session(engine)
        payload = {
            "event": "opened",
            "incident_detail": sample_detail("INC-before-restart"),
            "alert": sample_alert("INC-before-restart"),
        }
        try:
            with patch("routers.alerts.give_message", new_callable=AsyncMock):
                await publish_rule_alert(payload, db)

            self.assertEqual(
                [item["id"] for item in monitoring_readiness(1)["active_alerts"]],
                ["INC-before-restart"],
            )
            await update_monitoring_readiness({
                "system_id": 1,
                "generation": f"test-{uuid.uuid4().hex}",
                "stage": "started",
            })

            self.assertEqual(monitoring_readiness(1)["active_alerts"], [])
            self.assertEqual(
                [item["id"] for item in get_incidents(system_id=1, db=db)],
                ["INC-before-restart"],
            )
        finally:
            db.close()
            engine.dispose()

    async def test_stale_disk_event_is_rejected_before_persistence_or_broadcast(self):
        engine = test_engine()
        db = Session(engine)
        detail = sample_detail("INC-stale")
        detail["analytics_generation"] = "old-analytics-run"
        payload = {"event": "opened", "incident_detail": detail, "alert": sample_alert("INC-stale")}
        try:
            with patch("routers.alerts.give_message", new_callable=AsyncMock) as send:
                with self.assertRaises(HTTPException) as raised:
                    await publish_rule_alert(payload, db)
            self.assertEqual(raised.exception.status_code, 409)
            self.assertEqual(db.query(Incident).count(), 0)
            send.assert_not_awaited()
        finally:
            db.close()
            engine.dispose()

    async def test_compatibility_route_uses_incidents_repository(self):
        engine = test_engine()
        db = Session(engine)
        detail = sample_detail(incident_id="INC-process")
        detail["monitor_type"] = "process"
        alert = sample_alert(incident_id="INC-process")
        alert["category"] = "process"
        try:
            response = await alert_incidents(
                {"event": "opened", "incident_detail": detail, "alert": alert},
                db,
            )
            self.assertEqual(response["incident"]["id"], "INC-process")
            self.assertEqual(db.query(Incident).count(), 1)
            self.assertFalse(inspect(engine).has_table("alert_incidents"))
        finally:
            db.close()
            engine.dispose()

    async def test_persistence_failure_returns_server_error_without_broadcast(self):
        class FailedSession:
            rolled_back = False

            def get_bind(self):
                return object()

            def rollback(self):
                self.rolled_back = True

        db = FailedSession()
        payload = {
            "event": "opened",
            "incident_detail": sample_detail(incident_id="INC-failure"),
            "alert": sample_alert(incident_id="INC-failure"),
        }
        with patch("routers.alerts.persist_incident", side_effect=RuntimeError("database unavailable")), \
             patch("routers.alerts.logger.exception"), \
             patch("routers.alerts.give_message") as send:
            with self.assertRaises(HTTPException) as raised:
                await alert_incidents(payload, db)
        self.assertEqual(raised.exception.status_code, 500)
        self.assertTrue(db.rolled_back)
        send.assert_not_awaited()


class MonitoringLifecycleTests(unittest.IsolatedAsyncioTestCase):
    async def test_readiness_is_scoped_to_current_analytics_generation(self):
        system_id = 987654

        with patch("routers.monitoring.give_message", new_callable=AsyncMock) as broadcast:
            self.assertFalse(monitoring_readiness(system_id)["ready"])

            started = await update_monitoring_readiness({
                "system_id": system_id,
                "generation": "analytics-one",
                "stage": "started",
            })
            self.assertFalse(started["ready"])

            completed = await update_monitoring_readiness({
                "system_id": system_id,
                "generation": "analytics-one",
                "stage": "completed",
            })
            self.assertTrue(completed["ready"])
            self.assertTrue(monitoring_readiness(system_id)["ready"])

            restarted = await update_monitoring_readiness({
                "system_id": system_id,
                "generation": "analytics-two",
                "stage": "started",
            })
            self.assertFalse(restarted["ready"])

            stale_completion = await update_monitoring_readiness({
                "system_id": system_id,
                "generation": "analytics-one",
                "stage": "completed",
            })
            self.assertEqual(stale_completion["generation"], "analytics-two")
            self.assertFalse(stale_completion["ready"])
            self.assertEqual(broadcast.await_count, 3)

    async def test_new_run_clears_active_snapshot_but_keeps_history_and_rejects_old_events(self):
        from services.monitoring_lifecycle import store_active_alert

        system_id = 987655
        first_generation = "analytics-one"
        next_generation = "analytics-two"
        first_alert = {"id": "INC-run-one", "incident_id": "INC-run-one"}
        next_alert = {"id": "INC-run-two", "incident_id": "INC-run-two"}

        await update_monitoring_readiness({
            "system_id": system_id,
            "generation": first_generation,
            "stage": "started",
        })
        await update_monitoring_readiness({
            "system_id": system_id,
            "generation": first_generation,
            "stage": "completed",
        })
        self.assertTrue(store_active_alert(system_id, first_generation, "opened", first_alert))
        self.assertEqual(len(monitoring_readiness(system_id)["active_alerts"]), 1)

        await update_monitoring_readiness({
            "system_id": system_id,
            "generation": next_generation,
            "stage": "started",
        })
        self.assertEqual(monitoring_readiness(system_id)["active_alerts"], [])
        self.assertFalse(store_active_alert(system_id, first_generation, "opened", first_alert))

        await update_monitoring_readiness({
            "system_id": system_id,
            "generation": next_generation,
            "stage": "completed",
        })
        self.assertTrue(store_active_alert(system_id, next_generation, "opened", next_alert))
        self.assertEqual(
            [item["incident_id"] for item in monitoring_readiness(system_id)["active_alerts"]],
            ["INC-run-two"],
        )

    async def test_delayed_older_run_start_cannot_replace_newer_generation(self):
        system_id = 987656
        newer = f"{time.time_ns()}-new"
        older = f"{int(newer.split('-', 1)[0]) - 1}-old"

        await update_monitoring_readiness({
            "system_id": system_id,
            "generation": newer,
            "stage": "started",
        })
        result = await update_monitoring_readiness({
            "system_id": system_id,
            "generation": older,
            "stage": "started",
        })
        self.assertEqual(result["generation"], newer)
        self.assertFalse(result["ready"])


class WebSocketDeliveryTests(unittest.IsolatedAsyncioTestCase):
    async def test_incident_update_serializes_database_datetimes(self):
        class CapturingWebSocket:
            def __init__(self):
                self.messages = []

            async def send_json(self, message):
                # Match Starlette's send_json serialization behavior.
                json.dumps(message)
                self.messages.append(message)

        websocket = CapturingWebSocket()
        previous = connected_clients.get(1)
        connected_clients[1] = [websocket]
        timestamp = datetime(2026, 10, 21, 1, 2, 3, tzinfo=timezone.utc)
        try:
            await give_message(
                {
                    "type": "incident_update",
                    "event": "updated",
                    "data": {"id": "INC-live", "updated_at": timestamp},
                },
                systemid=1,
            )
        finally:
            if previous is None:
                connected_clients.pop(1, None)
            else:
                connected_clients[1] = previous

        self.assertEqual(len(websocket.messages), 1)
        self.assertEqual(
            websocket.messages[0]["data"]["updated_at"],
            "2026-10-21T01:02:03+00:00",
        )


class RuleNotificationPersistenceTests(unittest.TestCase):
    def test_two_recipients_are_persisted_with_default_email_event(self):
        from database.connection import Base

        engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(engine)
        test_session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
        form = {
            "ruleName": "Disk recipients",
            "enabled": True,
            "priority": "Medium",
            "severity": "Warning",
            "owner": "Admin",
            "environment": "Production",
            "region": "US-East-1",
            "monitorSource": "disk",
            "targets": [{
                "type": "host",
                "name": "Whole System",
                "metrics": [{
                    "conditions": [{
                        "metric": "disk_read_bytes",
                        "operator": "Greater Than (>)",
                        "threshold": "1",
                        "duration": "5",
                        "durationUnit": "Minutes",
                    }],
                }],
            }],
            "notifications": {
                "events": [],
                "channels": [],
                "recipients": ["first@example.com", "second@example.com"],
            },
        }

        try:
            with patch.object(user_rule_repository, "SessionLocal", test_session_factory):
                result = user_rules_service(form)

            with Session(engine) as db:
                saved = db.query(RuleNotification).all()
                self.assertEqual(result, {"success": True})
                self.assertEqual(len(saved), 2)
                self.assertEqual(
                    {item.recipient for item in saved},
                    {"first@example.com", "second@example.com"},
                )
                self.assertEqual(len({item.rule_id for item in saved}), 1)
                rule_id = saved[0].rule_id
                self.assertIsNotNone(db.get(Rule, rule_id))
                self.assertEqual({item.rule_id for item in saved}, {rule_id})
                self.assertEqual({item.channel for item in saved}, {"email"})
                self.assertEqual({item.event_type for item in saved}, {"Incident detected"})
        finally:
            engine.dispose()


if __name__ == "__main__":
    unittest.main()
