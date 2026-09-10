from engine.decision_strategies.process_decisions import ProcessDecision
from engine.decision_strategies.helth_decisions import HealthDecision
from engine.decision_strategies.network_decisions import NetworkDecision


STRATEGIES = {
    "process": ProcessDecision(),
    "health": HealthDecision(),
    "network": NetworkDecision()
}


def get_strategy(incident):
    incident_type = incident["incident_type"]

    return STRATEGIES.get(incident_type)


def make_decision(incident,rule , policy):
    strategy = get_strategy(incident)

    if strategy is None:
        return {
            "decision": "NO_ACTION",
            "action": None,
            "reason": "No decision strategy available"
        }

    return strategy.decide(incident, rule , policy)