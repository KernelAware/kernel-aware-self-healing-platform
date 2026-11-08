from datetime import datetime

from sqlalchemy import BigInteger, ForeignKey, String, TIMESTAMP, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from database.connection import Base


class RuleServiceNowConfig(Base):
    __tablename__ = "rule_servicenow_configs"
    __table_args__ = (
        UniqueConstraint("rule_id", name="uq_rule_servicenow_configs_rule_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    rule_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("rules.id"),
        nullable=False,
    )
    instance_url: Mapped[str] = mapped_column(String(255), nullable=False)
    client_id: Mapped[str] = mapped_column(String(255), nullable=False)
    client_secret_encrypted: Mapped[str] = mapped_column(String(1000), nullable=False)
    created_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP,
        server_default=func.current_timestamp(),
    )
