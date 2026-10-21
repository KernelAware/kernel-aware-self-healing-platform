from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# DATABASE_URL = "mysql+pymysql://pasindu:@localhost:3306/monitoring"
DATABASE_URL = "postgresql+psycopg2://kernelsentineldb:KernelProject1234@postgresql-kernelsentineldb.alwaysdata.net:5432/kernelsentineldb_user_rules"


engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()