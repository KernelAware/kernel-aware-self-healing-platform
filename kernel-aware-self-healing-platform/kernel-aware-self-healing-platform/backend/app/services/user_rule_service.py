from models.user_rules.rule import Rule


def user_rules_service(userRules):
    rule = Rule(
        name=userRules["ruleName"],
        status="ENABLED" if userRules["enabled"] else "DISABLED",
        priority=userRules["priority"],
        severity=userRules["severity"],
        owner=userRules["owner"],
        environment=userRules["environment"],
        region=userRules["region"],
        monitor_type=userRules["monitorSource"],
        target_type=userRules["targets"][0]["type"],
        target=userRules["targets"][0]["name"]
    )

    print(rule.name)
    print(rule.status)
    print(rule.priority)
    print(rule.monitor_type)
    print(rule.target_type)
    print(rule.target)

    return rule