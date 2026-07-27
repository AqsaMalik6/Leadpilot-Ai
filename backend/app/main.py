import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

import app.models  # noqa: F401 — registers every model with Base's metadata/registry
from app.agent import client as _agent_client  # noqa: F401 — wires the Groq client at import time
from app.config import get_settings
from app.jobs.follow_up_sweep import follow_up_sweep_loop
from app.jobs.gmail_poll import gmail_poll_loop
from app.routers import (
    agent_config,
    auth,
    billing,
    cms,
    contact,
    demo,
    dashboard,
    integrations,
    intake,
    leads,
    notifications,
    onboarding,
    org,
    team,
    webhooks_calendly,
)

settings = get_settings()
logger = logging.getLogger("leadpilot.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # SKILL-DIGITAL-FTE-UPGRADE.md §0/§2/§3 — the app's first two recurring background
    # jobs, plain asyncio.create_task loops (no Celery/Redis, matching the hard
    # constraint of no paid hosting). gmail_poll_loop no-ops until a gmail_accounts row
    # exists (requires the user's own Google OAuth credentials — see app/jobs/gmail_poll.py).
    tasks = [asyncio.create_task(follow_up_sweep_loop()), asyncio.create_task(gmail_poll_loop())]
    yield
    for task in tasks:
        task.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)


app = FastAPI(title="LeadPilot AI Backend", version="0.1.0", lifespan=lifespan)

# Not required for the browser under the server-to-server integration model
# (SKILL-BACKEND.md: FastAPI is called only from the Next.js server) — kept
# configurable for local tooling (curl/Postman/tests) against a non-Next.js origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "environment": settings.environment, "groqConfigured": bool(settings.groq_api_key)}


app.include_router(auth.router)
app.include_router(onboarding.router)
app.include_router(intake.router)
app.include_router(demo.router)
app.include_router(leads.router)
app.include_router(agent_config.router)
app.include_router(integrations.router)
app.include_router(notifications.router)
app.include_router(team.router)
app.include_router(org.router)
app.include_router(billing.router)
app.include_router(dashboard.router)
app.include_router(contact.router)
app.include_router(cms.router)
app.include_router(webhooks_calendly.router)
