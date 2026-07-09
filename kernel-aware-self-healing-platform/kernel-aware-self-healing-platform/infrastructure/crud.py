from sqlalchemy.orm import Session
from model import Incident
from schema import IncidentCreate

def create_incident(db: Session, incident: IncidentCreate):
    db_incident = Incident(
        server=incident.server,
        status=incident.status
    )
    db.add(db_incident)
    db.commit()
    db.refresh(db_incident)
    return db_incident

def get_incidents(db: Session):
    return db.query(Incident).all()

def get_incident(db: Session, incident_id: int):
    return db.query(Incident).filter(Incident.id == incident_id).first()

def update_incident(db: Session, incident_id: int, incident: IncidentCreate):
    db_incident = db.query(Incident).filter(Incident.id == incident_id).first()

    if not db_incident:
        return None

    db_incident.server = incident.server
    db_incident.status = incident.status

    db.commit()
    db.refresh(db_incident)

    return db_incident

def delete_incident(db: Session, incident_id: int):
    db_incident = db.query(Incident).filter(Incident.id == incident_id).first()

    if not db_incident:
        return None

    db.delete(db_incident)
    db.commit()

    return db_incident
