from datetime import datetime

from sqlalchemy import (
    BigInteger,
    String,
    Integer,
    Boolean,
    TIMESTAMP,
    ForeignKey,
    func
)
from sqlalchemy.orm import Mapped, mapped_column

from database.db_connection.connection import Base


class RuleAction(Base):
    __tablename__ = "rule_actions"

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

    action_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    automatic_execution: Mapped[bool | None] = mapped_column(
        Boolean,
        default=False
    )

    approval_required: Mapped[str | None] = mapped_column(
        String(30),
        default="ALWAYS"
    )

    allowed_during: Mapped[str | None] = mapped_column(
        String(40),
        default="ALWAYS"
    )

    max_retry_attempts: Mapped[int | None] = mapped_column(
        Integer,
        default=0
    )

    cooldown_seconds: Mapped[int | None] = mapped_column(
        Integer,
        default=0
    )

    suppress_duplicates: Mapped[bool | None] = mapped_column(
        Boolean,
        default=True
    )

    created_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP,
        server_default=func.current_timestamp()
    )