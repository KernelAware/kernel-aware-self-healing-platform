from datetime import datetime

from sqlalchemy import BigInteger, ForeignKey, String, TIMESTAMP, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from database.connection import Base


class RuleJiraConfig(Base):
    __tablename__ = "rule_jira_configs"
    __table_args__ = (UniqueConstraint("rule_id", name="uq_rule_jira_configs_rule_id"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    rule_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("rules.id"),
        nullable=False,
    )
    site_url: Mapped[str] = mapped_column(String(255), nullable=False)
    account_email: Mapped[str] = mapped_column(String(255), nullable=False)
    api_token_encrypted: Mapped[str] = mapped_column(String(1000), nullable=False)
    project_key: Mapped[str] = mapped_column(String(50), nullable=False)
    issue_type: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP,
        server_default=func.current_timestamp(),
    )
