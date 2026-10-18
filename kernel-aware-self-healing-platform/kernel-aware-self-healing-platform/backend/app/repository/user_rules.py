from types import SimpleNamespace

from sqlalchemy import JSON, func, literal, select, union_all

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


def _empty_rule_details(rule_ids: list[int]):
    return {
        rule_id: {
            "targets": [],
            "metrics": [],
            "actions": [],
            "notifications": [],
            "recovery": [],
        }
        for rule_id in rule_ids
    }


def _load_rule_details(db, rule_ids: list[int]):
    details = _empty_rule_details(rule_ids)
    if not rule_ids:
        return details

    child_models = (
        ("targets", RuleTarget),
        ("metrics", RuleMetric),
        ("actions", RuleAction),
        ("notifications", RuleNotification),
        ("recovery", RuleRecovery),
    )
    child_queries = []
    for key, model in child_models:
        payload_fields = []
        for column_property in model.__mapper__.column_attrs:
            payload_fields.extend((literal(column_property.key), getattr(model, column_property.key)))

        child_queries.append(
            select(
                literal(key).label("kind"),
                model.rule_id.label("rule_id"),
                func.json_build_object(*payload_fields, type_=JSON).label("payload"),
            ).where(model.rule_id.in_(rule_ids))
        )

    combined_children = union_all(*child_queries).subquery()
    rows = db.execute(
        select(
            combined_children.c.kind,
            combined_children.c.rule_id,
            combined_children.c.payload,
        )
    ).mappings()
    for row in rows:
        details[row["rule_id"]][row["kind"]].append(SimpleNamespace(**row["payload"]))
    return details


def get_rules_with_details(system_id: int | None = None, rule_id: int | None = None):
    """Load rules and all child rows with one connection and two database round trips."""
    if system_id is None and rule_id is None:
        return []

    db = SessionLocal()
    try:
        query = db.query(Rule)
        if rule_id is not None:
            query = query.filter(Rule.id == rule_id)
        else:
            query = query.filter(Rule.system_id == system_id)
        rules = query.all()
        if not rules:
            return []

        details = _load_rule_details(db, [rule.id for rule in rules])
        return [(rule, details[rule.id]) for rule in rules]
    finally:
        db.close()


def get_rule_details(rule_id: int):
    return get_rule_details_bulk([rule_id]).get(
        rule_id,
        {
            "targets": [],
            "metrics": [],
            "actions": [],
            "notifications": [],
            "recovery": [],
        },
    )


def get_rule_details_bulk(rule_ids: list[int]):
    """Load all child rows for a set of rules in one query and one session."""
    if not rule_ids:
        return {}

    db = SessionLocal()
    try:
        return _load_rule_details(db, rule_ids)
    finally:
        db.close()
