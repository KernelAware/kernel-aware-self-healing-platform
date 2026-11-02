from engine.decision_strategies.process_decisions import ProcessDecision
from engine.decision_strategies.helth_decisions import HealthDecision
from engine.decision_strategies.network_decisions import NetworkDecision
from engine.decision_strategies.disk_decisions import DiskDecision


STRATEGIES = {
    "process": ProcessDecision(),
    "health": HealthDecision(),
    "network": NetworkDecision(),
    "disk": DiskDecision(),
}


def get_strategy(incident):
    incident_type = str(incident.get("monitor_type") or incident.get("incident_type") or "").lower()
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
