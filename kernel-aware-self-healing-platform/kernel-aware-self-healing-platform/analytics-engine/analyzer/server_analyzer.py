from load_data.user_rules.rule_loader import load_rules
from detection.detector import detect


def analyze_server(system):
    system_id = system

    rules = load_rules(
        system_id
    )

    if not rules:
        return

    for rule in rules:
        detect(rule)
