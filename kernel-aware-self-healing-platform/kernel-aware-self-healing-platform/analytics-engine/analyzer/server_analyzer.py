from database.rules.rule_loader import load_rules
from get_metrics.prometheus_client import get_metrics
from detection.detector import detect


def analyze_server(db, system):
    system_id = system["id"]

    rules = load_rules(
        db,
        system_id
    )

    if not rules:
        return

    for rule in rules:
        detect(rule)
