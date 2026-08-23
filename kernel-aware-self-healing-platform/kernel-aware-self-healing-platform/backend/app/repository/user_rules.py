from database.connection import SessionLocal


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
            "success": True,
            "rule_id": rule.id
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()