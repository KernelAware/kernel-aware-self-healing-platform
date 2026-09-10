import requests

BACKEND_URL =  "http://localhost:8000"

def notify_backend(incident_detail, alert):
    response = requests.post(
        f"{BACKEND_URL}/alert_incidents",
        json={
            "incident_detail": incident_detail,
            "alert": alert
        },
        timeout=10,
    )

    response.raise_for_status()

    return response.json()

def save_incident(decision):
    pass