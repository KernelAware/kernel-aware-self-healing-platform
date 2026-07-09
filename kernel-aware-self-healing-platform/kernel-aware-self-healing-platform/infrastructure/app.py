import logging

from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session

import crud
import model
import schema

from database import SessionLocal, engine

model.Base.metadata.create_all(bind=engine)

app = FastAPI()

logging.basicConfig(
    filename="app.log",
    level=logging.INFO,
    format="%(asctime)s - %(message)s"
)

logger = logging.getLogger("system")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def home():
    logger.info("Home endpoint called")
    return {"Hello": "World"}

@app.post("/incidents", response_model=schema.IncidentResponse)
def create_incident(incident: schema.IncidentCreate,db: Session = Depends(get_db)):
    logger.info("Create incident")
    return crud.create_incident(db, incident)

@app.get("/incidents", response_model=list[schema.IncidentResponse])
def get_incidents(db: Session = Depends(get_db)):
    logger.info("Get incidents")
    return crud.get_incidents(db)

@app.get("/incidents/{incident_id}", response_model=schema.IncidentResponse)
def get_incident(incident_id: int,db: Session = Depends(get_db)):
    incident = crud.get_incident(db, incident_id)

    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")

    return incident

@app.put("/incidents/{incident_id}", response_model=schema.IncidentResponse)
def update_incident(incident_id: int,incident: schema.IncidentCreate,db: Session = Depends(get_db)):
    updated = crud.update_incident(db, incident_id, incident)

    if updated is None:
        raise HTTPException(status_code=404, detail="Incident not found")

    logger.info("Update incident")

    return updated

@app.delete("/incidents/{incident_id}")
def delete_incident(incident_id: int,db: Session = Depends(get_db)):
    deleted = crud.delete_incident(db, incident_id)

    if deleted is None:
        raise HTTPException(status_code=404, detail="Incident not found")

    logger.info("Delete incident")

    return {"message": "Incident deleted"}