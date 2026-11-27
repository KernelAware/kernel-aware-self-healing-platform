
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = "postgresql+psycopg2://kernelproject:KernelProject1234%40%40%40@postgresql-kernelproject.alwaysdata.net:5432/kernelproject_databse"

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_timeout=3,
    connect_args={
        "connect_timeout": 3,
        # Bound remote queries so a stalled PostgreSQL operation
        # cannot hold a backend worker indefinitely.
        "options": "-c statement_timeout=9000",
    },
)


SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
