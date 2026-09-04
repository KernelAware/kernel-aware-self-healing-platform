from datetime import datetime

from sqlalchemy import (
    BigInteger,
    String,
    TIMESTAMP,
    ForeignKey,
    func
)
from sqlalchemy.orm import Mapped, mapped_column

from database.connection import Base


class Rule(Base):
    __tablename__ = "user_rules"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    system_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("systems_details.id"),
        nullable=True
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    status: Mapped[str | None] = mapped_column(
        String(20),
        default="ENABLED"
    )

    priority: Mapped[str | None] = mapped_column(
        String(20),
        default="MEDIUM"
    )

    severity: Mapped[str | None] = mapped_column(
        String(20),
        default="WARNING"
    )

    owner: Mapped[str | None] = mapped_column(
        String(100)
    )

    environment: Mapped[str | None] = mapped_column(
        String(100)
    )

    region: Mapped[str | None] = mapped_column(
        String(100)
    )

    monitor_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False
    )

    target_type: Mapped[str | None] = mapped_column(
        String(30)
    )

    target: Mapped[str | None] = mapped_column(
        String(30)
    )

    created_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP,
        server_default=func.current_timestamp()
    )