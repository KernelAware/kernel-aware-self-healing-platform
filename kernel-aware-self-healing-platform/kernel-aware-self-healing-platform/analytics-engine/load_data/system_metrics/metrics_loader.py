import json
import logging
import os
import re
from urllib.parse import quote, quote_plus

import requests


METRIC_MAP = {
    "CPU Usage (%)": "process_cpu_percent",
    "Memory Usage (%)": "process_memory_percent",
    "Disk Usage (%)": "disk_usage_percent",
    "Disk Read": "process_disk_read_bytes",
    "Disk Write": "process_disk_write_bytes",
    "disk_read_bytes": "process_disk_read_bytes",
    "disk_write_bytes": "process_disk_write_bytes",
    "Thread Count": "process_threads",
    "Open Files": "process_open_files",
}

PROMETHEUS_URL = os.environ.get("PROMETHEUS_URL", "http://localhost:9090").rstrip("/")
logger = logging.getLogger(__name__)
try:
    PROMETHEUS_SCRAPE_INTERVAL_SECONDS = float(
        os.environ.get("PROMETHEUS_SCRAPE_INTERVAL_SECONDS", "5")
    )
    if not 0 < PROMETHEUS_SCRAPE_INTERVAL_SECONDS < 3600:
        raise ValueError("scrape interval is outside the supported range")
except ValueError:
    logger.warning("Invalid PROMETHEUS_SCRAPE_INTERVAL_SECONDS; using configured default of 5 seconds")
    PROMETHEUS_SCRAPE_INTERVAL_SECONDS = 5.0


def query_prometheus(query: str):
    url = f"{PROMETHEUS_URL}/api/v1/query"
    try:
        response = requests.get(
            url,
            params={"query": query},
            timeout=10,
        )
        _raise_for_prometheus_http_error(response, "/api/v1/query", query)
        data = response.json()
    except requests.RequestException as error:
        logger.error("Prometheus query request failed: GET /api/v1/query (%s)", type(error).__name__)
        raise RuntimeError("Prometheus query request failed") from None
    except ValueError as error:
        logger.error("Prometheus returned invalid JSON: GET /api/v1/query (%s)", type(error).__name__)
        raise
    if data.get("status") != "success":
        body = _safe_prometheus_error_body(response, query)
        logger.error("Prometheus query returned a non-success response: endpoint=/api/v1/query body=%s", body)
        raise RuntimeError(f"Prometheus query failed: {body}")
    return data.get("data", {}).get("result", [])


def query_prometheus_range(query: str, start: float, end: float, step: float):
    """Run a Prometheus range query and return its matrix result."""
    url = f"{PROMETHEUS_URL}/api/v1/query_range"
    try:
        response = requests.get(
            url,
            params={"query": query, "start": start, "end": end, "step": step},
            timeout=20,
        )
        _raise_for_prometheus_http_error(response, "/api/v1/query_range", query)
        data = response.json()
    except requests.RequestException as error:
        logger.error("Prometheus range query failed: GET /api/v1/query_range (%s)", type(error).__name__)
        raise RuntimeError("Prometheus range query failed") from None
    except ValueError as error:
        logger.error("Prometheus returned invalid range-query JSON: GET /api/v1/query_range (%s)", type(error).__name__)
        raise
    if data.get("status") != "success":
        body = _safe_prometheus_error_body(response, query)
        logger.error("Prometheus range query returned a non-success response: endpoint=/api/v1/query_range body=%s", body)
        raise RuntimeError(f"Prometheus range query failed: {body}")
    return data.get("data", {}).get("result", [])


def _safe_prometheus_error_body(response, query: str) -> str:
    """Return a bounded error body without echoing the query or label values."""
    try:
        body = response.text or "<empty response body>"
    except Exception:
        body = "<response body unavailable>"

    # Prometheus can include query fragments in parser errors. Keep its useful
    # diagnostic while removing the submitted expression and quoted label values.
    for expression in (query, quote(query, safe=""), quote_plus(query), query.replace('"', '\\"')):
        if expression:
            body = body.replace(expression, "<PromQL omitted>")
    for label_name, matcher_value in re.findall(
        r'([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*("(?:\\.|[^"\\])*")', query
    ):
        if label_name == "__name__":
            continue
        body = body.replace(matcher_value, '"<label value omitted>"')
        body = body.replace(matcher_value.replace('"', '\\"'), '\\"<label value omitted>\\"')

    max_length = 1200
    if len(body) > max_length:
        body = body[:max_length] + "…"
    return body


def _raise_for_prometheus_http_error(response, endpoint: str, query: str) -> None:
    if response.status_code < 400:
        return
    body = _safe_prometheus_error_body(response, query)
    logger.error(
        "Prometheus HTTP error: endpoint=%s status=%s response_body=%s",
        endpoint,
        response.status_code,
        body,
    )
    raise RuntimeError(f"Prometheus HTTP {response.status_code} from {endpoint}: {body}")


def get_cpu_metrics():
    return query_prometheus("process_cpu_percent")


def get_memory_metrics():
    return query_prometheus("process_memory_rss_bytes")


def get_disk_metrics(system_id=None):
    if system_id is None:
        return query_prometheus("disk_usage_percent")
    return get_disk_metric(system_id, "disk_usage_percent")


def get_network_metrics():
    return query_prometheus("network_byte_sent_total")


def get_process_metric(system_id, process_name, metric):
    metric_name = metric.get("metric") if isinstance(metric, dict) else str(metric)
    prometheus_metric = METRIC_MAP.get(metric_name, metric_name)
    if not prometheus_metric.startswith("process_"):
        raise ValueError(f"Unsupported Process metric: {metric_name}")

    labels = {
        "system_id": str(system_id),
        "name": str(process_name),
    }
    label_selector = ",".join(f"{key}={json.dumps(value)}" for key, value in labels.items())
    return query_prometheus(f"{prometheus_metric}{{{label_selector}}}")


def build_metric_selector(metric_name: str, labels=None) -> str:
    """Build a selector for an exact Prometheus series."""
    if not re.fullmatch(r"[a-zA-Z_:][a-zA-Z0-9_:]*", str(metric_name or "")):
        raise ValueError("Invalid Prometheus metric name")
    # Prometheus returns __name__ in each sample's metric-label map. The name
    # is already the selector head; adding it again as a matcher is invalid.
    selectors = {
        key: value
        for key, value in dict(labels or {}).items()
        if key != "__name__"
    }
    if not selectors:
        return metric_name
    for label_name in selectors:
        if not re.fullmatch(r"[a-zA-Z_][a-zA-Z0-9_]*", str(label_name or "")):
            raise ValueError("Invalid Prometheus label name")
    label_selector = ",".join(
        f"{label_name}={json.dumps(str(label_value))}"
        for label_name, label_value in sorted(selectors.items())
    )
    return f"{metric_name}{{{label_selector}}}"


def get_disk_metric(system_id, metric_name, labels=None, require_freshness=False):
    """Query a disk metric by its exported name and actual Prometheus system label."""
    if not re.fullmatch(r"[a-zA-Z_:][a-zA-Z0-9_:]*", str(metric_name or "")):
        raise ValueError("Invalid Prometheus metric name")
    selectors = {"system_id": str(system_id)}
    for label_name, label_value in (labels or {}).items():
        if not re.fullmatch(r"[a-zA-Z_][a-zA-Z0-9_]*", str(label_name or "")):
            raise ValueError("Invalid Prometheus label name")
        selectors[str(label_name)] = str(label_value)
    selector = build_metric_selector(metric_name, selectors)
    if require_freshness:
        freshness = PROMETHEUS_SCRAPE_INTERVAL_SECONDS * 1.25
        selector = f"({selector}) and ((time() - timestamp({selector})) <= {freshness:g})"
    return query_prometheus(selector)
