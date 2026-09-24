"""
memory.py

Collects Linux memory and swap information using psutil.
"""

import psutil


def get_memory_metrics():
    memory = psutil.virtual_memory()
    swap = psutil.swap_memory()

    return {
        "memory": {
            "total_bytes": memory.total,
            "available_bytes": memory.available,
            "used_bytes": memory.used,
            "free_bytes": memory.free,
            "usage_percent": memory.percent
        },
        "swap": {
            "total_bytes": swap.total,
            "used_bytes": swap.used,
            "free_bytes": swap.free,
            "usage_percent": swap.percent
        }
    }


if __name__ == "__main__":

    import json

    print(json.dumps(get_memory_metrics(), indent=4))