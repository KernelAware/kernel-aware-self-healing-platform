from datetime import datetime

from sqlalchemy import (
    BigInteger,
    String,
    TIMESTAMP,
    func
)
from sqlalchemy.orm import Mapped, mapped_column

from database.connection import Base


class System(Base):
    __tablename__ = "systems"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    hostname: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    ip_address: Mapped[str | None] = mapped_column(
        String(45),
        nullable=True
    )

    os_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    os_version: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    architecture: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True
    )

    environment: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True
    )

    status: Mapped[str | None] = mapped_column(
        String(30),
        server_default="active",
        nullable=True
    )

    created_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP,
        server_default=func.current_timestamp(),
        nullable=True
    )

    updated_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
        nullable=True
    )