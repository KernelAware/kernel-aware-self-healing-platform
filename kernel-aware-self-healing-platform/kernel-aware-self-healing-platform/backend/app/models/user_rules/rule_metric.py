from datetime import datetime

from sqlalchemy import (
    BigInteger,
    String,
    Double,
    Integer,
    TIMESTAMP,
    ForeignKey,
    func
)
from sqlalchemy.orm import Mapped, mapped_column

from database.connection import Base



class RuleMetric(Base):
    __tablename__ = "rule_metrics"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    rule_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("rules.id"),
        nullable=False
    )

    metric: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    operator: Mapped[str | None] = mapped_column(
        String(30)
    )

    threshold: Mapped[float | None] = mapped_column(
        Double
    )

    duration_seconds: Mapped[int | None] = mapped_column(
        Integer,
        default=0
    )

    created_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP,
        server_default=func.current_timestamp()
    )