from fastapi import FastAPI
import time

from prometheus_client import get_metrics
from rules.rule_loader import load_rules
from detection.detector import detect
from incident_classification.classifier import classify
from incident_management.manager import manage_incident

app = FastAPI(title="Analytics Engine")


@app.get("/health")
def health():
    return {"status": "healthy"}


def run_analysis():
    metrics = get_metrics()
    rules = load_rules()

    events = detect(metrics, rules)

    for event in events:
        incident = classify(event)
        manage_incident(incident)


if __name__ == "__main__":
    while True:
        run_analysis()
        time.sleep(5)