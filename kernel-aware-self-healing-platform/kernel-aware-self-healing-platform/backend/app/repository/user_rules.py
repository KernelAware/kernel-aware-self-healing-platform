from database.connection import SessionLocal
from models.user_rules.rule_action import RuleAction
from models.user_rules.rule_recovery import RuleRecovery
from models.user_rules.rule_notification import RuleNotification
from models.user_rules.rule_metric import RuleMetric
from models.user_rules.rule import Rule
from models.user_rules.rule_targets import RuleTarget


def save_rules(rule_details):

    db = SessionLocal()

    try:
        rule = rule_details["rule"]

        db.add(rule)
        db.flush()

        for target in rule_details["targets"]:
            target.rule_id = rule.id
            db.add(target)

        for metric in rule_details["metrics"]:
            metric.rule_id = rule.id
            db.add(metric)

        for action in rule_details["actions"]:
            action.rule_id = rule.id
            db.add(action)

        for notification in rule_details["notifications"]:
            notification.rule_id = rule.id
            db.add(notification)

        for recovery in rule_details["recovery"]:
            recovery.rule_id = rule.id
            db.add(recovery)

        db.commit()

        return {
            "success": True
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()

def get_rule_by_system_id(system_id: int):

    db = SessionLocal()

    try:
        rules = (
            db.query(Rule)
            .filter(Rule.system_id == system_id)
            .all()
        )

        return rules

    finally:
        db.close()

def get_rule_by_id(rule_id: int):
    db = SessionLocal()

    try:
        rule = (
            db.query(Rule)
            .filter(Rule.id == rule_id)
            .first()
        )

        return rule

    finally:
        db.close()

def get_rule_details(rule_id: int):
    db = SessionLocal()

    try:

        targets = (
            db.query(RuleTarget)
            .filter(RuleTarget.rule_id == rule_id)
            .all()
        )

        metrics = (
            db.query(RuleMetric)
            .filter(RuleMetric.rule_id == rule_id)
            .all()
        )

        actions = (
            db.query(RuleAction)
            .filter(RuleAction.rule_id == rule_id)
            .all()
        )

        notifications = (
            db.query(RuleNotification)
            .filter(RuleNotification.rule_id == rule_id)
            .all()
        )

        recovery = (
            db.query(RuleRecovery)
            .filter(RuleRecovery.rule_id == rule_id)
            .all()

        )

        rule_details = {
            "targets": targets,
            "metrics": metrics,
            "actions": actions,
            "notifications": notifications,
            "recovery": recovery
        }

        return rule_details

    finally:
        db.close()