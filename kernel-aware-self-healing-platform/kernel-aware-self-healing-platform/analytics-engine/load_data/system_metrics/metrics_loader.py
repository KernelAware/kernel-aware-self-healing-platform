
import json
import logging
import os
import re
from urllib.parse import quote, quote_plus

import requests


PROCESS_METRIC_MAP = {
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

# Used by canonical_metric_name() for Process metric aliases.
METRIC_MAP = PROCESS_METRIC_MAP.copy()

SERVICE_METRIC_MAP = {
    "CPU Usage (%)": "service_cpu_usage_percent",
    "Memory Usage (%)": "service_memory_usage_percent",
    "Disk Usage (%)": "service_disk_usage_bytes",
}

CPU_METRIC_MAP = {
    "cpu_usage_percent": "cpu_usage_percent",
    "cpu_load_1min": "cpu_load_1min",
    "cpu_load_5min": "cpu_load_5min",
    "cpu_load_15min": "cpu_load_15min",
    "cpu_core_usage_percent": "cpu_core_usage_percent",
    "cpu_freq_current_mhz": "cpu_freq_current_mhz",
    "cpu_freq_min_mhz": "cpu_freq_min_mhz",
    "cpu_freq_max_mhz": "cpu_freq_max_mhz",
    "cpu_times_user": "cpu_times_user",
    "cpu_times_system": "cpu_times_system",
    "cpu_times_iowait": "cpu_times_iowait",
    "cpu_times_steal": "cpu_times_steal",
    "cpu_ctx_switches": "cpu_ctx_switches",
    "cpu_ctx_switches_total": "cpu_ctx_switches_total",
    "cpu_interrupts": "cpu_interrupts",
    "cpu_interrupts_total": "cpu_interrupts_total",
    "cpu_soft_interrupts": "cpu_soft_interrupts",
    "cpu_soft_interrupts_total": "cpu_soft_interrupts_total",
}

PROMETHEUS_URL = os.environ.get(
    "PROMETHEUS_URL",
    "http://localhost:9090",
).rstrip("/")

PROCESS_METRIC_REFRESH_INTERVAL_SECONDS = float(
    os.environ.get("PROCESS_METRIC_REFRESH_INTERVAL_SECONDS", "15")
)

logger = logging.getLogger(__name__)

try:
    PROMETHEUS_SCRAPE_INTERVAL_SECONDS = float(
        os.environ.get("PROMETHEUS_SCRAPE_INTERVAL_SECONDS", "5")
    )

    if not 0 < PROMETHEUS_SCRAPE_INTERVAL_SECONDS < 3600:
        raise ValueError("scrape interval is outside the supported range")

except ValueError:
    logger.warning(
        "Invalid PROMETHEUS_SCRAPE_INTERVAL_SECONDS; "
        "using configured default of 5 seconds"
    )
    PROMETHEUS_SCRAPE_INTERVAL_SECONDS = 5.0


def query_prometheus(query: str):
    """Execute an instant Prometheus query."""

    url = f"{PROMETHEUS_URL}/api/v1/query"

    try:
        response = requests.get(
            url,
            params={"query": query},
            timeout=10,
        )

        _raise_for_prometheus_http_error(
            response,
            "/api/v1/query",
            query,
        )

        data = response.json()

    except requests.RequestException as error:
        logger.error(
            "Prometheus query request failed: GET /api/v1/query (%s)",
            type(error).__name__,
        )
        raise RuntimeError("Prometheus query request failed") from None

    except ValueError as error:
        logger.error(
            "Prometheus returned invalid JSON: GET /api/v1/query (%s)",
            type(error).__name__,
        )
        raise

    if data.get("status") != "success":
        body = _safe_prometheus_error_body(response, query)

        logger.error(
            "Prometheus query returned a non-success response: "
            "endpoint=/api/v1/query body=%s",
            body,
        )

        raise RuntimeError(f"Prometheus query failed: {body}")

    return data.get("data", {}).get("result", [])


def query_prometheus_range(
    query: str,
    start: float,
    end: float,
    step: float,
):
    """Run a Prometheus range query and return its matrix result."""

    url = f"{PROMETHEUS_URL}/api/v1/query_range"

    try:
        response = requests.get(
            url,
            params={
                "query": query,
                "start": start,
                "end": end,
                "step": step,
            },
            timeout=20,
        )

        _raise_for_prometheus_http_error(
            response,
            "/api/v1/query_range",
            query,
        )

        data = response.json()

    except requests.RequestException as error:
        logger.error(
            "Prometheus range query failed: "
            "GET /api/v1/query_range (%s)",
            type(error).__name__,
        )
        raise RuntimeError("Prometheus range query failed") from None

    except ValueError as error:
        logger.error(
            "Prometheus returned invalid range-query JSON: "
            "GET /api/v1/query_range (%s)",
            type(error).__name__,
        )
        raise

    if data.get("status") != "success":
        body = _safe_prometheus_error_body(response, query)

        logger.error(
            "Prometheus range query returned a non-success response: "
            "endpoint=/api/v1/query_range body=%s",
            body,
        )

        raise RuntimeError(f"Prometheus range query failed: {body}")

    return data.get("data", {}).get("result", [])


def _safe_prometheus_error_body(response, query: str) -> str:
    """Return a bounded error body without echoing the query or label values."""

    try:
        body = response.text or "<empty response body>"
    except Exception:
        body = "<response body unavailable>"

    # Remove the submitted expression from Prometheus parser errors.
    for expression in (
        query,
        quote(query, safe=""),
        quote_plus(query),
        query.replace('"', '\\"'),
    ):
        if expression:
            body = body.replace(expression, "<PromQL omitted>")

    # Remove quoted label values from error messages.
    for label_name, matcher_value in re.findall(
        r'([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*("(?:\\.|[^"\\])*")',
        query,
    ):
        if label_name == "__name__":
            continue

        body = body.replace(
            matcher_value,
            '"<label value omitted>"',
        )

        body = body.replace(
            matcher_value.replace('"', '\\"'),
            '\\"<label value omitted>\\"',
        )

    max_length = 1200

    if len(body) > max_length:
        body = body[:max_length] + "…"

    return body


def _raise_for_prometheus_http_error(
    response,
    endpoint: str,
    query: str,
) -> None:
    if response.status_code < 400:
        return

    body = _safe_prometheus_error_body(response, query)

    logger.error(
        "Prometheus HTTP error: endpoint=%s status=%s response_body=%s",
        endpoint,
        response.status_code,
        body,
    )

    raise RuntimeError(
        f"Prometheus HTTP {response.status_code} "
        f"from {endpoint}: {body}"
    )


def get_cpu_metrics():
    return query_prometheus("process_cpu_percent")


def get_memory_metrics():
    return query_prometheus("process_memory_rss_bytes")


def get_disk_metrics(system_id=None):
    if system_id is None:
        return query_prometheus("disk_usage_percent")

    return get_disk_metric(
        system_id,
        "disk_usage_percent",
    )


def get_network_metrics():
    return query_prometheus("network_byte_sent_total")


def canonical_process_metric(metric) -> str:
    metric_name = (
        metric.get("metric")
        if isinstance(metric, dict)
        else str(metric)
    )

    prometheus_metric = canonical_metric_name(metric_name)

    if not prometheus_metric.startswith("process_"):
        raise ValueError(
            f"Unsupported Process metric: {metric_name}"
        )

    if not re.fullmatch(
        r"[a-zA-Z_:][a-zA-Z0-9_:]*",
        prometheus_metric,
    ):
        raise ValueError(
            f"Invalid Prometheus metric name: {metric_name}"
        )

    return prometheus_metric


def canonical_metric_name(metric_name: str) -> str:
    return METRIC_MAP.get(
        str(metric_name or ""),
        str(metric_name or ""),
    )


def process_target_labels(process_name: str) -> dict[str, str]:
    """Translate the dashboard's enriched process target into exporter labels."""

    target = str(process_name)

    name, separator, metadata = target.partition("@")

    labels = {
        "name": name,
    }

    if separator:
        for field in metadata.split("@"):
            key, equals, value = field.partition("=")

            if equals and key == "pid" and value.isdigit():
                labels["pid"] = value

    return labels


def build_metric_selector(
    metric_name: str,
    labels=None,
) -> str:
    """Build a selector for an exact Prometheus series."""

    if not re.fullmatch(
        r"[a-zA-Z_:][a-zA-Z0-9_:]*",
        str(metric_name or ""),
    ):
        raise ValueError("Invalid Prometheus metric name")

    # The metric name is already the selector head.
    # Do not add __name__ again as a label matcher.
    selectors = {
        key: value
        for key, value in dict(labels or {}).items()
        if key != "__name__"
    }

    if not selectors:
        return metric_name

    for label_name in selectors:
        if not re.fullmatch(
            r"[a-zA-Z_][a-zA-Z0-9_]*",
            str(label_name or ""),
        ):
            raise ValueError("Invalid Prometheus label name")

    label_selector = ",".join(
        f"{label_name}={json.dumps(str(label_value))}"
        for label_name, label_value in sorted(selectors.items())
    )

    return f"{metric_name}{{{label_selector}}}"


def get_process_metric_selector(
    system_id,
    process_name,
    metric,
    require_freshness=False,
):
    prometheus_metric = canonical_process_metric(metric)

    labels = {
        "system_id": str(system_id),
        **process_target_labels(process_name),
    }

    selector = build_metric_selector(
        prometheus_metric,
        labels,
    )

    if require_freshness:
        freshness = max(
            PROMETHEUS_SCRAPE_INTERVAL_SECONDS,
            PROCESS_METRIC_REFRESH_INTERVAL_SECONDS,
        ) * 1.25

        selector = (
            f"({selector}) and "
            f"((time() - timestamp({selector})) <= {freshness:g})"
        )

    return prometheus_metric, selector


def get_process_metric(
    system_id,
    process_name,
    metric,
    require_freshness=False,
):
    prometheus_metric, selector = get_process_metric_selector(
        system_id,
        process_name,
        metric,
        require_freshness,
    )

    logger.debug(
        "Process Prometheus query: canonical_metric=%s target=%s selector=%s",
        prometheus_metric,
        process_name,
        selector,
    )

    return query_prometheus(selector)


def get_service_metric(system_id, service_details, metric):
    service_name = service_details.split("@pid=")[0]

    prometheus_metric = SERVICE_METRIC_MAP[metric["metric"]]

    query = f"""
        {prometheus_metric}{{
            system_id="{system_id}",
            name="{service_name}"
        }}
    """

    return query_prometheus(query)


def get_cpu_metric(system_id, metric):
    prometheus_metric = CPU_METRIC_MAP[metric["metric"]]

    labels = [
        f'system_id="{system_id}"'
    ]

    core = metric.get("core")

    if (
        prometheus_metric == "cpu_core_usage_percent"
        and core is not None
    ):
        labels.append(f'core="{core}"')

    query = f"{prometheus_metric}{{{', '.join(labels)}}}"

    return query_prometheus(query)


def get_disk_metric(
    system_id,
    metric_name,
    labels=None,
    require_freshness=False,
):
    """Query a disk metric by its exported name and actual Prometheus system label."""

    if not re.fullmatch(
        r"[a-zA-Z_:][a-zA-Z0-9_:]*",
        str(metric_name or ""),
    ):
        raise ValueError("Invalid Prometheus metric name")

    selectors = {
        "system_id": str(system_id),
    }

    for label_name, label_value in (labels or {}).items():
        if not re.fullmatch(
            r"[a-zA-Z_][a-zA-Z0-9_]*",
            str(label_name or ""),
        ):
            raise ValueError("Invalid Prometheus label name")

        selectors[str(label_name)] = str(label_value)

    selector = build_metric_selector(
        metric_name,
        selectors,
    )

    if require_freshness:
        freshness = PROMETHEUS_SCRAPE_INTERVAL_SECONDS * 1.25

        selector = (
            f"({selector}) and "
            f"((time() - timestamp({selector})) <= {freshness:g})"
        )

    return query_prometheus(selector)
