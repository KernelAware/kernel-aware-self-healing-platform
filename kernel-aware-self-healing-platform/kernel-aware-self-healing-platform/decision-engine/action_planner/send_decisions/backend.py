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
    response = requests.post(
        f"{BACKEND_URL}/incidents",
        json=decision,
        timeout=10,
    )
    if response.status_code < 400:
        return response.json()
    return None