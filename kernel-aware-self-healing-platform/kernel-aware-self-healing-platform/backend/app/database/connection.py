from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = "postgresql+psycopg2://kernelsentineldb:KernelProject1234@postgresql-kernelsentineldb.alwaysdata.net:5432/kernelsentineldb_user_rules"

engine = create_engine(
    DATABASE_URL,
    connect_args={
        "connect_timeout": 5,
        "options": "-c statement_timeout=10000",
    },
    pool_timeout=5,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False
)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()