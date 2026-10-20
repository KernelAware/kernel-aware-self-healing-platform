import logging

from load_data.user_rules.rule_loader import load_rules
from detection.detector import detect


logger = logging.getLogger(__name__)


def analyze_server(system):
    system_id = system

    rules = load_rules(
        system_id
    )

    if not rules:
        return

    for rule in rules:
        rule_id = None
        if isinstance(rule, dict) and isinstance(rule.get("rule"), dict):
            rule_id = rule["rule"].get("id")
        try:
            detect(rule)
        except Exception:
            # A malformed or unavailable rule must not prevent the remaining
            # rules for this system from being evaluated in this cycle.
            logger.exception(
                "Rule evaluation failed for system %s rule %s; continuing with remaining rules",
                system_id,
                rule_id,
            )
