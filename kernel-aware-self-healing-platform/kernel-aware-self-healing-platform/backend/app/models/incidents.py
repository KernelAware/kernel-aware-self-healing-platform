from sqlalchemy import Column, DateTime, Integer, JSON, String, func

from database.connection import Base


class Incident(Base):
    """ORM mapping for the existing PostgreSQL incidents table."""

    __tablename__ = "incidents"

    id = Column(String(40), primary_key=True)
    rule_id = Column(Integer, nullable=True)
    system_id = Column(Integer, nullable=False)
    category = Column(String(30), nullable=False)
    target = Column(String(255), nullable=False)
    metric = Column(String(150), nullable=False)
    severity = Column(String(30), nullable=False)
    priority = Column(String(30), nullable=False)
    status = Column(String(20), nullable=False)
    opened_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    detail = Column(JSON, nullable=False)
    alert = Column(JSON, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
