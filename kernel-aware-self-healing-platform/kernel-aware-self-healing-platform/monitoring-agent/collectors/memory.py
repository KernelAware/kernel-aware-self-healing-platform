"""
memory.py

Collects Linux memory and swap information using psutil.
"""

import psutil


def get_memory_metrics():
    """
    Returns memory and swap usage statistics.
    """

    memory = psutil.virtual_memory()
    swap = psutil.swap_memory()

    return {
        "memory": {
            "total_gb": round(memory.total / (1024 ** 3), 2),
            "available_gb": round(memory.available / (1024 ** 3), 2),
            "used_gb": round(memory.used / (1024 ** 3), 2),
            "free_gb": round(memory.free / (1024 ** 3), 2),
            "usage_percent": memory.percent
        },

        "swap": {
            "total_gb": round(swap.total / (1024 ** 3), 2),
            "used_gb": round(swap.used / (1024 ** 3), 2),
            "free_gb": round(swap.free / (1024 ** 3), 2),
            "usage_percent": swap.percent
        }
    }


if __name__ == "__main__":

    import json

    print(json.dumps(get_memory_metrics(), indent=4))