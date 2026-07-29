from sqlalchemy import Column, Integer, String
from database import Base

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    server = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False)