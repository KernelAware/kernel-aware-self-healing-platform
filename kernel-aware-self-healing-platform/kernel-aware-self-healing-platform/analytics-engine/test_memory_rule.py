
import asyncio
from load_data.user_rules.rule_loader import load_rules


async def main():
    rules = await load_rules(1)

    print(f"Total rules loaded: {len(rules)}")

    for rule in rules:
        if rule["rule"]["monitor_type"].lower() == "memory":
            print("\nMemory rule found:")
            print(rule)
            return

    print("No memory rules found for system_id=1.")


if __name__ == "__main__":
    asyncio.run(main())
