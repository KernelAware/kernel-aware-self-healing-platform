import os

import redis

redis_client = redis.Redis(
    host=os.environ.get("REDIS_HOST", "localhost"),
    port=int(os.environ.get("REDIS_PORT", "6379")),
    db=int(os.environ.get("REDIS_DB", "0")),
    decode_responses=True
)

try:
    redis_client.ping()
except redis.ConnectionError as error:
    print("Redis connection failed:", error)
