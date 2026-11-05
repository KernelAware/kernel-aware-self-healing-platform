import logging
import os
import time

import httpx

BACKEND_URL = os.environ.get("KAISP_BACKEND_URL", "http://localhost:8000").rstrip("/")
RULE_LOOKUP_ATTEMPTS = 3
RULE_LOOKUP_RETRY_DELAY_SECONDS = 0.25
logger = logging.getLogger(__name__)

def load_rules(incident: dict) -> dict:
    rule_id = incident["rule_id"]

    for attempt in range(1, RULE_LOOKUP_ATTEMPTS + 1):
        try:
            response = httpx.get(
                f"{BACKEND_URL}/get_user_rule",
                params={"rule_id": rule_id},
                timeout=5.0,
            )
            response.raise_for_status()
            break
        except httpx.HTTPStatusError as error:
            status_code = error.response.status_code
            if status_code not in {502, 503, 504} or attempt == RULE_LOOKUP_ATTEMPTS:
                raise
            logger.warning(
                "Transient rule lookup failure: rule_id=%s upstream_status=%s attempt=%s/%s",
                rule_id,
                status_code,
                attempt,
                RULE_LOOKUP_ATTEMPTS,
            )
            time.sleep(RULE_LOOKUP_RETRY_DELAY_SECONDS * (2 ** (attempt - 1)))
        except httpx.RequestError:
            if attempt == RULE_LOOKUP_ATTEMPTS:
                raise
            logger.warning(
                "Transient rule lookup request failure: rule_id=%s attempt=%s/%s",
                rule_id,
                attempt,
                RULE_LOOKUP_ATTEMPTS,
            )
            time.sleep(RULE_LOOKUP_RETRY_DELAY_SECONDS * (2 ** (attempt - 1)))

    rule = response.json()

    if not isinstance(rule, list) or not rule:
        raise ValueError("Rule does not exist")
    return rule[0]
