from pydantic import BaseModel

class IncidentCreate(BaseModel):
    server: str
    status: str

class IncidentResponse(BaseModel):
    id: int
    server: str
    status: str

    class Config:
        from_attributes = True