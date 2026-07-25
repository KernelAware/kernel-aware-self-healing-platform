from fastapi import FastAPI, Response
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

# Import metric updater functions
from exporter import update_network_metrics
from exporter_memory import update_memory_metrics


# Create FastAPI application
app = FastAPI(
    title="Kernel-Aware Monitoring Agent",
    description="Monitoring agent for collecting and exposing Linux system metrics",
    version="1.0.0"
)


@app.get("/")
def root():
    """
    Basic endpoint to check whether the monitoring agent is running.
    """
    return {
        "status": "running",
        "service": "Kernel-Aware Monitoring Agent"
    }


@app.get("/health")
def health():
    """
    Health check endpoint.
    """
    return {
        "status": "healthy"
    }


@app.get("/metrics")
def metrics():
    """
    Collect the latest system metrics and expose them
    in Prometheus-compatible format.
    """
    # print(">>> Prometheus requested metrics")

    # Collect and update network metrics
    update_network_metrics()

    # Collect and update memory metrics
    update_memory_metrics()

    # Generate all registered Prometheus metrics
    prometheus_data = generate_latest()

    return Response(
        content=prometheus_data,
        media_type=CONTENT_TYPE_LATEST
    )