"""In-memory token bucket for the public intake/demo endpoints (SKILL-BACKEND.md
§3.4: "Phase 1: an in-memory token bucket; Phase 2: Redis-backed once running
multiple instances"). Deliberately simple — fine for one process, resets on restart.
"""

import time

from fastapi import HTTPException

_BUCKETS: dict[str, list[float]] = {}
WINDOW_SECONDS = 60
MAX_REQUESTS_PER_WINDOW = 20


def check_rate_limit(key: str) -> None:
    now = time.monotonic()
    bucket = _BUCKETS.setdefault(key, [])
    while bucket and bucket[0] < now - WINDOW_SECONDS:
        bucket.pop(0)
    if len(bucket) >= MAX_REQUESTS_PER_WINDOW:
        raise HTTPException(status_code=429, detail="Too many requests — please slow down")
    bucket.append(now)
