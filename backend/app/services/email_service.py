"""Resend-backed email, with a console/log fallback when no API key is configured —
never a hard failure just because a third-party key isn't set yet (SKILL-BACKEND.md
env inventory: RESEND_API_KEY)."""

import logging

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger("leadpilot.email")


async def send_email(to: str, subject: str, body: str) -> bool:
    if not settings.resend_api_key:
        logger.info("[email:console-fallback] to=%s subject=%r\n%s", to, subject, body)
        return True

    import resend

    resend.api_key = settings.resend_api_key
    try:
        resend.Emails.send(
            {
                "from": settings.email_from_address,
                "to": [to],
                "subject": subject,
                "text": body,
            }
        )
        return True
    except Exception:
        logger.exception("Resend send failed, falling back to console log")
        logger.info("[email:console-fallback] to=%s subject=%r\n%s", to, subject, body)
        return False
