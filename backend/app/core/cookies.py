import uuid
from datetime import datetime, timedelta, timezone

from fastapi import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.security import sign_session_token
from app.models.user import Session as SessionModel

settings = get_settings()


async def issue_session_cookie(response: Response, db: AsyncSession, user_id: uuid.UUID, request_ip: str | None, user_agent: str | None) -> None:
    session_row = SessionModel(
        user_id=user_id,
        expires_at=datetime.now(timezone.utc) + timedelta(seconds=settings.session_ttl_seconds),
        ip_address=request_ip,
        user_agent=user_agent,
    )
    db.add(session_row)
    await db.flush()
    token = sign_session_token(session_row.id)
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        httponly=True,
        secure=settings.environment == "production",
        samesite="lax",
        path="/",
        max_age=settings.session_ttl_seconds,
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(key=settings.session_cookie_name, path="/")
