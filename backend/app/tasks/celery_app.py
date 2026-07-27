"""Phase 2 upgrade path (SKILL-BACKEND.md §4): off by default. Phase 1 runs
everything through FastAPI BackgroundTasks/asyncio (app/agent/pipeline.py is called
directly). Flip USE_CELERY=true once Redis is actually running locally and you want
weekly_summary_digest/usage_billing_sync on a real schedule (Celery beat) rather than
a manually-triggered script.
"""

from celery import Celery

from app.config import get_settings

settings = get_settings()

celery_app = Celery("leadpilot", broker=settings.redis_url, backend=settings.redis_url)
celery_app.conf.update(task_serializer="json", accept_content=["json"], result_serializer="json", timezone="UTC")

celery_app.conf.beat_schedule = {
    "weekly-summary-digest": {
        "task": "app.tasks.jobs.weekly_summary_digest",
        "schedule": 60 * 60 * 24 * 7,
    },
    "usage-billing-sync": {
        "task": "app.tasks.jobs.usage_billing_sync",
        "schedule": 60 * 60 * 24,
    },
}
