from sqlalchemy import Column, Integer, String
from database import Base

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    server = Column(String, nullable=False)
    status = Column(String, nullable=False)