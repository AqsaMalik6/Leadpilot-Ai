"""Postgres LISTEN/NOTIFY backing /api/leads/stream (SKILL-BACKEND.md §5).

Phase 1: one backend process, so Postgres pub/sub is sufficient — no Redis needed at
this scale. Each organization gets its own NOTIFY channel (`leads_org_<uuid>`), and
GET /api/leads/stream LISTENs on it for the lifetime of the SSE connection. Emits the
exact three event shapes the frontend already expects: new_lead, status_change,
heartbeat (see app/schemas/kpi.py).

Phase 2 upgrade path: swap this module's two functions for Redis pub/sub
(publish/subscribe) once running more than one backend instance — callers
(app/routers/leads.py, app/agent/pipeline.py) don't need to change.
"""

import asyncio
import json
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import asyncpg

from app.config import get_settings

settings = get_settings()


def _channel_name(organization_id: uuid.UUID) -> str:
    return f"leads_org_{str(organization_id).replace('-', '_')}"


def _asyncpg_dsn() -> str:
    # asyncpg's own connect() wants a plain postgresql:// DSN, not SQLAlchemy's
    # postgresql+asyncpg:// driver-qualified one.
    return settings.database_url.replace("postgresql+asyncpg://", "postgresql://")


async def publish_event(organization_id: uuid.UUID, event: dict) -> None:
    conn = await asyncpg.connect(_asyncpg_dsn())
    try:
        await conn.execute("SELECT pg_notify($1, $2)", _channel_name(organization_id), json.dumps(event, default=str))
    finally:
        await conn.close()


@asynccontextmanager
async def subscribe(organization_id: uuid.UUID) -> AsyncIterator[asyncio.Queue]:
    queue: asyncio.Queue = asyncio.Queue()
    conn = await asyncpg.connect(_asyncpg_dsn())

    def _on_notify(_conn, _pid, _channel, payload: str) -> None:
        queue.put_nowait(json.loads(payload))

    channel = _channel_name(organization_id)
    await conn.add_listener(channel, _on_notify)
    try:
        yield queue
    finally:
        await conn.remove_listener(channel, _on_notify)
        await conn.close()
