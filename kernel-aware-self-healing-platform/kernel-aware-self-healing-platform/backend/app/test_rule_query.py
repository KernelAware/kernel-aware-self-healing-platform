
import time

from repository.user_rules import get_rule_by_system_id

system_id = 1

start_time = time.perf_counter()

rules = get_rule_by_system_id(system_id)

end_time = time.perf_counter()

print(f"System ID: {system_id}")
print(f"Number of rules retrieved: {len(rules)}")
print(f"Time taken: {end_time - start_time:.4f} seconds")
