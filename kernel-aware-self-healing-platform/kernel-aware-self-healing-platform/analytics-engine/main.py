from fastapi import FastAPI
from contextlib import asynccontextmanager
import asyncio

from load_data.database.db_connection.connection import SessionLocal
from load_data.systems_details.system_repository import get_active_systems
from analyzer.server_analyzer import analyze_server


def run_analysis():

    db = SessionLocal()

    try:
        systems = get_active_systems(db)

        for system in systems:
            try:
                analyze_server(
                    system=system
                )

            except Exception as error:
                print(
                    f"Error analyzing system {system}: {error}"
                )

    except Exception as error:
        print("Analysis cycle error:", error)

    finally:
        db.close()


async def analysis_loop():
    while True:
        run_analysis()
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