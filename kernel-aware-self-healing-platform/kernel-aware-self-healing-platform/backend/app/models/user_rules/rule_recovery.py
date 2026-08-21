from datetime import datetime

from sqlalchemy import (
    BigInteger,
    String,
    Double,
    Integer,
    Boolean,
    TIMESTAMP,
    ForeignKey,
    func
)
from sqlalchemy.orm import Mapped, mapped_column

from database.connection import Base


class RuleRecovery(Base):
    __tablename__ = "rule_recovery"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    rule_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("rules.id"),
        nullable=False,
        unique=True
    )

    verification_required: Mapped[bool | None] = mapped_column(
        Boolean,
        default=True
    )

    metric: Mapped[str | None] = mapped_column(
        String(150)
    )

    operator: Mapped[str | None] = mapped_column(
        String(30)
    )

    recovery_threshold: Mapped[float | None] = mapped_column(
        "RECOVERY_threshold",
        Double
    )

    recovery_duration_seconds: Mapped[int | None] = mapped_column(
        "RECOVERY_duration_seconds",
        Integer,
        default=0
    )

    created_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP,
        server_default=func.current_timestamp()
    )