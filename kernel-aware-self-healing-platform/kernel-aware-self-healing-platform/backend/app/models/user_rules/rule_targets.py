from sqlalchemy import (
    BigInteger,
    String,
    ForeignKey
)
from sqlalchemy.orm import Mapped, mapped_column

from database.connection import Base


class RuleTarget(Base):
    __tablename__ = "rule_targets"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    rule_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("user_rules.id"),
        nullable=False
    )

    target_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False
    )

    target: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )