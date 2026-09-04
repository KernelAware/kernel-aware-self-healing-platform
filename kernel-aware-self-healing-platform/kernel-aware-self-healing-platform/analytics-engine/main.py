from fastapi import FastAPI
import time

from load_data.database.db_connection.connection import SessionLocal
from load_data.systems_details.system_repository import get_active_systems
from analyzer.server_analyzer import analyze_server

app = FastAPI(
    title="Analytics Engine"
)


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


def run_analysis():
    db = SessionLocal()

    try:
        systems = get_active_systems(db)
        for system in systems:
            try:
                analyze_server(
                    db=db,
                    system=system
                )

            except Exception as error:
                print(
                    f"Error analyzing system "
                    f"{system['id']}: {error}"
                )

    except Exception as error:
        print(
            "Analysis cycle error:",
            error
        )

    finally:
        db.close()


if __name__ == "__main__":
    while True:
        run_analysis()

        time.sleep(5)