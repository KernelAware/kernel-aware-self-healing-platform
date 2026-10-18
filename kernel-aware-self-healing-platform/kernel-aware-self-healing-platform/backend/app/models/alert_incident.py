from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Float, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from database.connection import Base


class AlertIncident(Base):
    """Persisted alert lifecycle records, separate from the legacy incidents table."""

    __tablename__ = "alert_incidents"

    incident_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    fingerprint: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    system_id: Mapped[int | None] = mapped_column(BigInteger, index=True)
    rule_id: Mapped[int | None] = mapped_column(BigInteger, index=True)
    monitor_type: Mapped[str] = mapped_column(String(30), index=True, nullable=False)
    target_type: Mapped[str | None] = mapped_column(String(30))
    target: Mapped[str | None] = mapped_column(String(255))
    metric: Mapped[str | None] = mapped_column(String(150))
    current_value: Mapped[float | None] = mapped_column(Float)
    threshold: Mapped[float | None] = mapped_column(Float)
    operator: Mapped[str | None] = mapped_column(String(30))
    severity: Mapped[str | None] = mapped_column(String(30))
    priority: Mapped[str | None] = mapped_column(String(30))
    status: Mapped[str] = mapped_column(String(30), index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    incident_detail: Mapped[dict] = mapped_column(JSON, nullable=False)
    alert_payload: Mapped[dict | None] = mapped_column(JSON)
