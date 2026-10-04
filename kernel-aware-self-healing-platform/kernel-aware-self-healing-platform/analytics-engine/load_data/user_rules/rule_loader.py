import httpx
import json

BACKEND_URL = "http://localhost:8000"

def load_rules(system_id):
    response = httpx.get(
        f"{BACKEND_URL}/get_user_rules",
        params={"system_id": system_id}
    )

    response.raise_for_status()

    rules = response.json()
    return [normalize_rule(rule) for rule in rules]


def normalize_rule(rule):
    """Normalize backend rule details without changing the Process contract."""
    monitor_type = rule.get("rule", {}).get("monitor_type")
    if monitor_type != "disk":
        return rule

    normalized = dict(rule)
    normalized["rule"] = dict(rule.get("rule", {}))
    normalized["rule"]["monitor_source"] = "disk"
    system_id = normalized["rule"].get("system_id")
    normalized["targets"] = [
        normalize_disk_target(target, system_id=system_id)
        for target in rule.get("targets", [])
    ]
    normalized["metrics"] = [normalize_disk_metric(metric) for metric in rule.get("metrics", [])]
    normalized["actions"] = [dict(action) for action in rule.get("actions", [])]
    return normalized


def normalize_disk_target(target, system_id=None):
    target = dict(target)
    raw_target = target.get("target")
    identity = {}

    if isinstance(raw_target, dict):
        identity = raw_target
    elif isinstance(raw_target, str):
        try:
            parsed = json.loads(raw_target)
            if isinstance(parsed, dict):
                identity = parsed
        except json.JSONDecodeError:
            pass

    target["target_type"] = target.get("target_type") or identity.get("type")
    target["system_id"] = identity.get("system_id") or system_id
    target["target"] = identity.get("mountpoint") or identity.get("device") or raw_target
    target["host"] = identity.get("host")
    target["device"] = identity.get("device")
    target["mountpoint"] = identity.get("mountpoint") or raw_target
    target["filesystem"] = identity.get("filesystem")
    target["disk"] = identity.get("disk") or identity.get("device")
    return target


def normalize_disk_metric(metric):
    normalized = dict(metric)
    normalized["prometheus_metric"] = metric.get("prometheus_metric")
    normalized["duration_seconds"] = int(metric.get("duration_seconds") or 0)
    return normalized