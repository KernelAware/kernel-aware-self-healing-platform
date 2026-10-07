from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# DATABASE_URL = "mysql+mysqlconnector://pasindu:1234@localhost:3306/user_rules"
DATABASE_URL = "postgresql+psycopg2://kernelsentineldb:KernelProject1234@postgresql-kernelsentineldb.alwaysdata.net:5432/kernelsentineldb_user_rules"

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False
)