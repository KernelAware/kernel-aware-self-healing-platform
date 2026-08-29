from datetime import datetime

from sqlalchemy import (
    BigInteger,
    String,
    TIMESTAMP,
    ForeignKey,
    func
)
from sqlalchemy.orm import Mapped, mapped_column

from database.db_connection.connection import Base


class RuleNotification(Base):
    __tablename__ = "rule_notifications"

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

    event_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    channel: Mapped[str] = mapped_column(
        String(30),
        nullable=False
    )

    recipient: Mapped[str | None] = mapped_column(
        String(255)
    )

    created_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP,
        server_default=func.current_timestamp()
    )