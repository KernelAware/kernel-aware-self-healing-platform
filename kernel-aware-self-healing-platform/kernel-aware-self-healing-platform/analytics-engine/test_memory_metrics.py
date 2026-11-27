
from load_data.user_rules.rule_loader import load_rules

SYSTEM_ID = 3


def main():
    rules = load_rules(SYSTEM_ID)

    print(f"Total rules loaded: {len(rules)}")

    for rule in rules:
        if rule["rule"]["monitor_type"].lower() == "memory":
            print("\nMemory rule found:")
            print(rule)
            return

    print("No memory rules found.")


if __name__ == "__main__":
    main()
