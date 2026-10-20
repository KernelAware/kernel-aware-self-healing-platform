import json
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

from fastapi import HTTPException
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from models.incidents import Incident
from repository.incidents import incident_to_dict, list_incidents, persist_incident
from routers.alerts import alert_incidents, publish_rule_alert
from routers.incidents import get_incidents
from routers.websocket import connected_clients, give_message


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


class IncidentApiTests(unittest.IsolatedAsyncioTestCase):
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
            self.assertEqual([item["type"] for item in sent], [
                "incident_detail", "incident_update", "alerts",
                "incident_detail", "incident_update",
            ])
            self.assertFalse(inspect(engine).has_table("alert_incidents"))
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


if __name__ == "__main__":
    unittest.main()
