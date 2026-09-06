from fastapi import FastAPI

from rules.rule_loader import load_rules
from policies.policy_checker import check_policy
from engine.decision import make_decision
from action_planner.actions import create_action_plan

app = FastAPI(title="Decision Engine")


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/incidents")
def process_incident(incident: dict):

    rules = load_rules(incident)
    policy = check_policy(rules)
    print(policy)

    decision = make_decision(
        incident,
        rules,
        policy
    )
    print(decision)
    action = create_action_plan(decision , incident , rules , policy)

    return {
        "incident": incident,
        "decision": decision,
        "action": action
    }