from database.connection import SessionLocal
from models.user_rules.rule_action import RuleAction
from models.user_rules.rule_recovery import RuleRecovery
from models.user_rules.rule_notification import RuleNotification
from models.user_rules.rule_metric import RuleMetric
from models.user_rules.rule import Rule
from models.user_rules.rule_targets import RuleTarget
from models.user_rules.systems import System


def ensure_system_exists(db, system_id: int | None = 1) -> int:
    if system_id is not None:
        sys_obj = db.query(System).filter(System.id == system_id).first()
        if sys_obj:
            return sys_obj.id

    first_sys = db.query(System).first()
    if first_sys:
        return first_sys.id

    new_system = System(
        id=1,
        hostname="localhost",
        ip_address="127.0.0.1",
        os_name="Linux",
        os_version="Ubuntu",
        architecture="x86_64",
        environment="Production",
        status="active"
    )
    db.add(new_system)
    db.commit()
    db.refresh(new_system)
    return new_system.id


def save_rules(rule_details):

    db = SessionLocal()

    try:
        rule = rule_details["rule"]
        rule.system_id = ensure_system_exists(db, getattr(rule, "system_id", 1) or 1)

        db.add(rule)
        db.flush()

        for target in rule_details.get("targets", []):
            target.rule_id = rule.id
            db.add(target)

        for metric in rule_details.get("metrics", []):
            metric.rule_id = rule.id
            db.add(metric)

        for action in rule_details.get("actions", []):
            action.rule_id = rule.id
            db.add(action)

        for notification in rule_details.get("notifications", []):
            notification.rule_id = rule.id
            db.add(notification)

        for recovery in rule_details.get("recovery", []):
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


def get_all_rules():
    db = SessionLocal()
    try:
        return db.query(Rule).all()
    finally:
        db.close()