import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from load_data.database.db_connection.connection import SessionLocal
from load_data.systems_details.system_repository import get_active_systems
from analyzer.server_analyzer import analyze_server

logger = logging.getLogger(__name__)


def run_analysis():

    db = SessionLocal()

    try:
        systems = get_active_systems(db)

        for system in systems:
            try:
                analyze_server(system=system)

            except Exception:
                logger.exception("Analysis failed for system %s", system)

    except Exception:
        logger.exception("Analysis cycle failed while loading active systems")

    finally:
        db.close()


async def analysis_loop():
    while True:
        await asyncio.to_thread(run_analysis)
        await asyncio.sleep(15)


@asynccontextmanager
async def lifespan(app: FastAPI):

    task = asyncio.create_task(
        analysis_loop()
    )

    yield

    task.cancel()


app = FastAPI(
    title="Analytics Engine",
    lifespan=lifespan
)


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }
