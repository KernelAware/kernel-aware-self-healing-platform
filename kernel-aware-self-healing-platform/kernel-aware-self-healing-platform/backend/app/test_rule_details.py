
import time

from repository.user_rules import (
    get_rule_by_system_id,
    get_rule_details,
)

rules = get_rule_by_system_id(1)

print(f"Rules retrieved: {len(rules)}")

start_time = time.perf_counter()

for rule in rules:
    get_rule_details(rule.id)

end_time = time.perf_counter()

print(
    f"Time to retrieve related data for all rules: "
    f"{end_time - start_time:.4f} seconds"
)
