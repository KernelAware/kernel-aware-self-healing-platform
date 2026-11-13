"""Shared KAISP system identity configuration."""

import os


def _read_system_id() -> int:
    value = os.getenv("KAISP_SYSTEM_ID", "1")
    try:
        system_id = int(value)
    except (TypeError, ValueError) as error:
        raise RuntimeError(
            "KAISP_SYSTEM_ID must be a positive integer; "
            f"received {value!r}"
        ) from error

    if system_id <= 0:
        raise RuntimeError(
            "KAISP_SYSTEM_ID must be a positive integer; "
            f"received {value!r}"
        )
    return system_id


SYSTEM_ID = _read_system_id()
