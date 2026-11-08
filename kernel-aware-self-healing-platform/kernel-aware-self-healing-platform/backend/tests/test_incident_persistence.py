import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP_DIR = ROOT / 'app'
if str(APP_DIR) not in sys.path:
    sys.path.insert(0, str(APP_DIR))

from routers.incidents import build_healing_action_payload
from services.incident_service import normalize_incident_payload


def test_build_healing_action_payload_keeps_script_for_uppercase_run_command():
    payload = {
        'action': 'RUN-COMMAND',
        'target': 'datagrip',
        'system_id': 2,
        'category': 'system',
        'pid': None,
        'script': 'pkill -f datagrip'
    }

    result = build_healing_action_payload('INC-42', payload)

    assert result['action'] == 'RUN-COMMAND'
    assert result['script'] == 'pkill -f datagrip'


def test_normalize_incident_payload_matches_postgres_schema_fields():
    payload = {
        'incident_detail': {
            'id': 'INC-2001',
            'title': 'High CPU Utilization Detected',
            'severity': 'Critical',
            'priority': 'P0',
            'system_id': 7,
            'system': 'server-01',
            'category': 'cpu',
            'target': 'nginx',
            'metric': 'cpu_usage_percent',
            'process': 'nginx',
            'pid': 121,
            'status': 'OPEN',
            'trigger': {'metric': 'cpu_usage_percent', 'currentValue': 94.2},
            'decision': {'decision': 'RESTART'}
        },
        'alert': {
            'id': 'INC-2001',
            'title': 'High CPU Utilization Detected',
            'level': 'P0 - Critical',
            'body': 'CPU usage reached 94.2% above threshold 90% for 5 minutes.',
            'system_id': 7,
            'system': 'server-01',
            'process': 'nginx',
            'pid': 121,
            'status': 'OPEN'
        }
    }

    normalized = normalize_incident_payload(payload)

    assert normalized['id'] == 'INC-2001'
    assert normalized['system_id'] == 7
    assert normalized['category'] == 'cpu'
    assert normalized['target'] == 'nginx'
    assert normalized['metric'] == 'cpu_usage_percent'
    assert normalized['status'] == 'OPEN'
    assert normalized['severity'] == 'Critical'
    assert normalized['priority'] == 'P0'
    assert normalized['alert']['id'] == 'INC-2001'
    assert normalized['detail']['title'] == 'High CPU Utilization Detected'
