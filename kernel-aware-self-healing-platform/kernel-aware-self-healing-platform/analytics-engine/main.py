import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
import requests

from load_data.database.db_connection.connection import SessionLocal
from load_data.systems_details.system_repository import get_active_systems
from analyzer.server_analyzer import analyze_server
from lifecycle import ANALYTICS_GENERATION

logger = logging.getLogger(__name__)
ANALYSIS_INTERVAL_SECONDS = 15
BACKEND_URL = os.environ.get("KAISP_BACKEND_URL", "http://localhost:8000").rstrip("/")


def _load_active_systems():

    db = SessionLocal()

    try:
        return get_active_systems(db)
    except Exception:
        logger.exception("Analysis cycle failed while loading active systems")
        return None
    finally:
        db.close()


def run_analysis(systems=None, *, disk_alerts_enabled=True):
    """Run one complete pass over the supplied systems.

    The first pass still evaluates Disk metrics and violation timers, but it
    cannot open new Disk incidents. That gives the service an explicit
    warm-up round before normal alerting begins.
    """
    if systems is None:
        systems = _load_active_systems()
    if systems is None:
        return False

    completed = True
    for system in systems:
        try:
            analyze_server(system=system, disk_alerts_enabled=disk_alerts_enabled)

        except Exception:
            completed = False
            logger.exception("Analysis failed for system %s", system)

    return completed


def _report_monitoring_lifecycle(system, generation, stage):
    try:
        response = requests.post(
            f"{BACKEND_URL}/monitoring/lifecycle",
            json={"system_id": system, "generation": generation, "stage": stage},
            timeout=3,
        )
        response.raise_for_status()
        return True
    except Exception as error:
        logger.warning(
            "Unable to report Analytics lifecycle stage %s for system %s (%s)",
            stage,
            system,
            type(error).__name__,
        )
        return False


def _report_monitoring_ready(systems, generation):
    results = [
        _report_monitoring_lifecycle(system, generation, "completed")
        for system in systems
    ]
    return all(results)


async def _sleep_until_next_cycle(cycle_started_at):
    loop = asyncio.get_running_loop()
    next_cycle_at = cycle_started_at + ANALYSIS_INTERVAL_SECONDS
    await asyncio.sleep(max(0, next_cycle_at - loop.time()))
    return loop.time()


async def analysis_loop():
    generation = ANALYTICS_GENERATION
    first_round_complete = False
    lifecycle_started = False
    cycle_started_at = None

    while True:
        systems = await asyncio.to_thread(_load_active_systems)
        if systems is None:
            if first_round_complete and cycle_started_at is not None:
                cycle_started_at = await _sleep_until_next_cycle(cycle_started_at)
            else:
                await asyncio.sleep(ANALYSIS_INTERVAL_SECONDS)
            continue

        if not lifecycle_started:
            lifecycle_started = all(
                await asyncio.gather(*(
                    asyncio.to_thread(_report_monitoring_lifecycle, system, generation, "started")
                    for system in systems
                ))
            )

        completed = await asyncio.to_thread(
            run_analysis,
            systems,
            disk_alerts_enabled=first_round_complete,
        )

        if completed:
            await asyncio.to_thread(_report_monitoring_ready, systems, generation)
            if not first_round_complete:
                # Start the alert cycle at 0 and run its first pass immediately.
                first_round_complete = True
                cycle_started_at = asyncio.get_running_loop().time()
                continue

        if first_round_complete and cycle_started_at is not None:
            cycle_started_at = await _sleep_until_next_cycle(cycle_started_at)
        else:
            await asyncio.sleep(ANALYSIS_INTERVAL_SECONDS)


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
