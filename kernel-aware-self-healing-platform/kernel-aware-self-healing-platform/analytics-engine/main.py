
import asyncio
import logging
import os
from contextlib import asynccontextmanager, suppress

import requests
from fastapi import FastAPI

from load_data.database.db_connection.connection import SessionLocal
from load_data.systems_details.system_repository import get_active_systems
from analyzer.server_analyzer import analyze_server
from lifecycle import ANALYTICS_GENERATION
from incident_management.manager import (
    republish_active_disk_incidents,
    retry_pending_incidents,
)


logger = logging.getLogger(__name__)
logging.getLogger().setLevel(logging.INFO)

ANALYSIS_INTERVAL_SECONDS = 15

INCIDENT_RETRY_INTERVAL_SECONDS = float(
    os.environ.get("INCIDENT_RETRY_INTERVAL_SECONDS", "5")
)

BACKEND_URL = os.environ.get(
    "KAISP_BACKEND_URL",
    "http://localhost:8000",
).rstrip("/")


def _load_active_systems():
    db = SessionLocal()

    try:
        return get_active_systems(db)

    except Exception:
        logger.exception(
            "Analysis cycle failed while loading active systems"
        )
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
            analyze_server(
                system=system,
                disk_alerts_enabled=disk_alerts_enabled,
            )

        except Exception:
            completed = False
            logger.exception(
                "Analysis failed for system %s",
                system,
            )

    return completed


def _report_monitoring_lifecycle(system, generation, stage):
    try:
        response = requests.post(
            f"{BACKEND_URL}/monitoring/lifecycle",
            json={
                "system_id": system,
                "generation": generation,
                "stage": stage,
            },
            timeout=3,
        )

        response.raise_for_status()

        return response.json()

    except Exception as error:
        logger.warning(
            "Unable to report Analytics lifecycle stage %s "
            "for system %s (%s)",
            stage,
            system,
            type(error).__name__,
        )
        return None


def _report_monitoring_ready(systems, generation):
    results = [
        _report_monitoring_lifecycle(
            system,
            generation,
            "completed",
        )
        for system in systems
    ]

    for system, state in zip(systems, results):
        if not isinstance(state, dict) or state.get("ready") is not True:
            continue

        active_ids = {
            str(
                incident.get("incident_id")
                or incident.get("id")
            )
            for incident in state.get("active_alerts", [])
            if incident.get("incident_id") or incident.get("id")
        }

        reconciliation = republish_active_disk_incidents(
            generation,
            active_ids,
        )

        if reconciliation["failed"]:
            logger.warning(
                "Active Disk reconciliation completed with failures: "
                "system_id=%s result=%s",
                system,
                reconciliation,
            )

    return all(
        isinstance(result, dict)
        for result in results
    )


async def _sleep_until_next_cycle(cycle_started_at):
    loop = asyncio.get_running_loop()

    next_cycle_at = (
        cycle_started_at + ANALYSIS_INTERVAL_SECONDS
    )

    await asyncio.sleep(
        max(0, next_cycle_at - loop.time())
    )

    return loop.time()


async def analysis_loop():
    generation = ANALYTICS_GENERATION

    first_round_complete = False
    lifecycle_started = False
    cycle_started_at = None

    while True:
        systems = await asyncio.to_thread(
            _load_active_systems
        )

        if systems is None:
            if first_round_complete and cycle_started_at is not None:
                cycle_started_at = await _sleep_until_next_cycle(
                    cycle_started_at
                )
            else:
                await asyncio.sleep(
                    ANALYSIS_INTERVAL_SECONDS
                )

            continue

        if not lifecycle_started:
            lifecycle_started = all(
                await asyncio.gather(
                    *(
                        asyncio.to_thread(
                            _report_monitoring_lifecycle,
                            system,
                            generation,
                            "started",
                        )
                        for system in systems
                    )
                )
            )

        if first_round_complete:
            # Re-register readiness after a Backend restart without
            # resetting the current Analytics generation or active-alert snapshot.
            await asyncio.to_thread(
                _report_monitoring_ready,
                systems,
                generation,
            )

        completed = await asyncio.to_thread(
            run_analysis,
            systems,
            disk_alerts_enabled=first_round_complete,
        )

        if completed:
            await asyncio.to_thread(
                _report_monitoring_ready,
                systems,
                generation,
            )

            if not first_round_complete:
                # Start the alert cycle at 0 and run its first pass immediately.
                first_round_complete = True

                cycle_started_at = (
                    asyncio.get_running_loop().time()
                )

                continue

        if first_round_complete and cycle_started_at is not None:
            cycle_started_at = await _sleep_until_next_cycle(
                cycle_started_at
            )

        else:
            await asyncio.sleep(
                ANALYSIS_INTERVAL_SECONDS
            )


async def incident_retry_loop():
    while True:
        try:
            result = await asyncio.to_thread(
                retry_pending_incidents
            )

            if result["failed"]:
                logger.warning(
                    "Incident retry pass completed with failures: %s",
                    result,
                )

        except asyncio.CancelledError:
            raise

        except Exception:
            logger.exception(
                "Incident retry worker pass failed"
            )

        await asyncio.sleep(
            max(0.5, INCIDENT_RETRY_INTERVAL_SECONDS)
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    if not root_logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(
            logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s")
        )
        root_logger.addHandler(handler)

    for logger_name in (
        "analyzer",
        "detection",
        "incident_management",
        "load_data",
    ):
        application_logger = logging.getLogger(logger_name)
        application_logger.disabled = False
        application_logger.setLevel(logging.INFO)
        application_logger.propagate = True

    analysis_task = asyncio.create_task(
        analysis_loop(),
        name="analytics-loop",
    )

    retry_task = asyncio.create_task(
        incident_retry_loop(),
        name="incident-retry-loop",
    )

    def report_task_failure(task):
        if task.cancelled():
            return
        error = task.exception()
        if error is not None:
            logger.exception(
                "Analytics background task failed: %s",
                task.get_name(),
                exc_info=(type(error), error, error.__traceback__),
            )

    analysis_task.add_done_callback(report_task_failure)
    retry_task.add_done_callback(report_task_failure)

    try:
        yield

    finally:
        for task in (analysis_task, retry_task):
            task.cancel()

        for task in (analysis_task, retry_task):
            with suppress(asyncio.CancelledError):
                await task


app = FastAPI(
    title="Analytics Engine",
    lifespan=lifespan,
)


@app.get("/health")
def health():
    return {
        "status": "healthy",
    }
