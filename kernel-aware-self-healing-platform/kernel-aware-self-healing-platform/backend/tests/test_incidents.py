import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from models.alert_incident import AlertIncident
from repository.incidents import incident_to_dict, list_incidents, persist_incident
from routers import websocket
from routers.alerts import alert_incidents
from routers.incidents import get_incidents


class IncidentPersistenceTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        AlertIncident.__table__.create(bind=self.engine)
        self.db = Session(self.engine)

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def detail(self, incident_id="INC-one", status="OPEN"):
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
            "trigger": {
                "metric": "disk_usage_percent",
                "currentValue": 92.4,
                "operator": "Greater Than (>)",
                "threshold": 80,
                "durationSeconds": 30,
                "duration": "30 seconds",
            },
            "rootCause": {"timeline": []},
        }

    def alert(self, incident_id="INC-one", status="OPEN"):
        return {
            "id": incident_id,
            "incident_id": incident_id,
            "system_id": 1,
            "category": "disk",
            "target": "/mnt/data",
            "metric": "disk_usage_percent",
            "current_value": 92.4,
            "threshold": 80,
            "operator": "Greater Than (>)",
            "priority": "P1",
            "severity": "Critical",
            "status": status,
        }

    def test_open_update_resolve_and_new_occurrence_are_persisted(self):
        opened, created = persist_incident(self.db, "opened", self.detail(), self.alert())
        self.assertTrue(created)
        updated_detail = self.detail()
        updated_detail["trigger"]["currentValue"] = 94.0
        updated, created = persist_incident(self.db, "updated", updated_detail, self.alert())
        self.assertFalse(created)
        self.assertEqual(opened.incident_id, updated.incident_id)
        self.assertEqual(len(list_incidents(self.db, system_id=1)), 1)

        resolved_detail = self.detail(status="RESOLVED")
        resolved_detail["resolved_at"] = "2026-10-19T10:05:00+00:00"
        resolved, created = persist_incident(self.db, "resolved", resolved_detail, self.alert(status="RESOLVED"))
        self.assertFalse(created)
        self.assertEqual(resolved.status, "RESOLVED")

        later, created = persist_incident(self.db, "opened", self.detail("INC-two"), self.alert("INC-two"))
        self.assertTrue(created)
        self.assertNotEqual(resolved.incident_id, later.incident_id)
        history = list_incidents(self.db, system_id=1)
        self.assertEqual(len(history), 2)

    def test_history_serialization_preserves_disk_fields(self):
        record, _ = persist_incident(self.db, "opened", self.detail(), self.alert())
        response = incident_to_dict(record)
        self.assertEqual(response["category"], "disk")
        self.assertEqual(response["system_id"], 1)
        self.assertEqual(response["target"], "/mnt/data")
        self.assertEqual(response["severity"], "Critical")
        self.assertEqual(response["priority"], "P1")
        self.assertEqual(response["trigger"]["metric"], "disk_usage_percent")


class WebSocketBroadcastTests(unittest.IsolatedAsyncioTestCase):
    async def test_lifecycle_events_are_delivered_to_all_system_clients(self):
        class Client:
            def __init__(self):
                self.messages = []

            async def send_json(self, message):
                self.messages.append(message)

        first = Client()
        second = Client()
        websocket.connected_clients.clear()
        websocket.connected_clients[1] = [first, second]
        try:
            for event in ("opened", "resolved"):
                await websocket.give_message(
                    {"type": "incident_update", "event": event, "data": {"system_id": 1}},
                    systemid=1,
                )
            self.assertEqual([message["event"] for message in first.messages], ["opened", "resolved"])
            self.assertEqual([message["event"] for message in second.messages], ["opened", "resolved"])
        finally:
            websocket.connected_clients.clear()


class IncidentApiTests(unittest.IsolatedAsyncioTestCase):
    async def test_alert_and_history_routes_handle_lifecycle(self):
        class Client:
            def __init__(self):
                self.messages = []

            async def send_json(self, message):
                self.messages.append(message)

        engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        AlertIncident.__table__.create(bind=engine)

        db = Session(engine)
        client = Client()
        websocket.connected_clients[1] = [client]
        payload = {
            "event": "opened",
            "incident_detail": {
                "id": "INC-api", "incident_id": "INC-api", "fingerprint": "api-fingerprint",
                "rule_id": 55, "monitor_type": "disk", "system_id": 1,
                "target_type": "filesystem", "target": "/tmp/test",
                "priority": "P2", "severity": "High", "status": "OPEN",
                "trigger": {"metric": "disk_usage_percent", "currentValue": 91, "operator": "Greater Than (>)", "threshold": 80, "durationSeconds": 5},
            },
            "alert": {"id": "INC-api", "incident_id": "INC-api", "system_id": 1, "category": "disk", "priority": "P2", "severity": "High"},
        }
        try:
            opened = await alert_incidents(payload, db)
            self.assertEqual(opened["status"], "success")
            await alert_incidents(payload, db)
            history = get_incidents(system_id=1, db=db)
            self.assertEqual(history[0]["id"], "INC-api")
            self.assertEqual(history[0]["status"], "OPEN")

            payload["event"] = "resolved"
            payload["incident_detail"]["status"] = "RESOLVED"
            payload["incident_detail"]["resolved_at"] = "2026-10-19T10:05:00+00:00"
            resolved = await alert_incidents(payload, db)
            self.assertEqual(resolved["status"], "success")
            history = get_incidents(system_id=1, db=db)
            self.assertEqual(history[0]["status"], "RESOLVED")
            alert_events = [message for message in client.messages if message["type"] == "alerts"]
            lifecycle_events = [message for message in client.messages if message["type"] == "incident_update"]
            self.assertEqual(len(alert_events), 1)
            self.assertEqual([message["event"] for message in lifecycle_events], ["opened", "opened", "resolved"])
        finally:
            websocket.connected_clients.clear()
            db.close()
            engine.dispose()


if __name__ == "__main__":
    unittest.main()
