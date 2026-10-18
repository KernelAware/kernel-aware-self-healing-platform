import logging
import os

import httpx

BACKEND_URL = os.environ.get("KAISP_BACKEND_URL", "http://localhost:8000").rstrip("/")
logger = logging.getLogger(__name__)


def load_rules(system_id):
    url = f"{BACKEND_URL}/get_user_rules"
    try:
        response = httpx.get(
            url,
            params={"system_id": system_id},
            timeout=10.0,
        )

        response.raise_for_status()
        rules = response.json()
    except httpx.HTTPError as error:
        logger.error("Rule loading request failed: GET %s (system_id=%s): %s", url, system_id, error)
        raise
    except ValueError as error:
        logger.error("Rule loading response was not valid JSON: GET %s (system_id=%s): %s", url, system_id, error)
        raise

    logger.info("Loaded %d rules for system %s", len(rules), system_id)
    return rules
