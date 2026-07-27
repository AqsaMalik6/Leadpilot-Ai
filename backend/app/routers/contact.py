from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import get_db
from app.models.notification import ContactSubmission
from app.schemas.auth import ContactInput
from app.services.email_service import send_email

router = APIRouter(prefix="/api/contact", tags=["contact"])
settings = get_settings()


@router.post("")
async def submit_contact(payload: ContactInput, db: AsyncSession = Depends(get_db)):
    """Persists + emails — the frontend's stub today just validates and discards
    this; same ContactInputSchema either way (SKILL-BACKEND.md §2.11)."""
    submission = ContactSubmission(name=payload.name, email=payload.email, company=payload.company, message=payload.message)
    db.add(submission)
    await db.commit()

    sent = await send_email(
        settings.contact_notification_email,
        f"New contact form submission from {payload.name}",
        f"Name: {payload.name}\nEmail: {payload.email}\nCompany: {payload.company or 'n/a'}\n\n{payload.message}",
    )
    if sent:
        from datetime import datetime, timezone

        submission.notified_at = datetime.now(timezone.utc)
        await db.commit()

    return {"ok": True}
