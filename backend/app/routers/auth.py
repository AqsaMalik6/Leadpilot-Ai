import re
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cookies import clear_session_cookie, issue_session_cookie
from app.core.security import hash_password, verify_password
from app.db import get_db
from app.dependencies import get_current_user
from app.models.agent_config import AgentConfig
from app.models.lead import LeadChannel
from app.models.organization import Organization
from app.models.user import Session as SessionModel
from app.models.user import User
from app.schemas.auth import LoginInput, SessionUser, SignupInput

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug or "org"


def _to_session_user(user: User) -> SessionUser:
    return SessionUser(
        id=str(user.id),
        org_id=str(user.organization_id),
        name=user.full_name,
        email=user.email,
        role=user.role,
        onboarding_completed_at=user.onboarding_completed_at.isoformat() if user.onboarding_completed_at else None,
    )


@router.post("/signup")
async def signup(payload: SignupInput, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    existing = (await db.execute(select(User).where(User.email == payload.email))).scalar_one_or_none()
    if existing:
        return {"ok": False, "errors": {"formErrors": [], "fieldErrors": {"email": ["An account with this email already exists"]}}}

    base_slug = _slugify(payload.company)
    slug = base_slug
    suffix = 1
    while (await db.execute(select(Organization).where(Organization.slug == slug))).scalar_one_or_none():
        suffix += 1
        slug = f"{base_slug}-{suffix}"

    org = Organization(name=payload.company, slug=slug, plan="trial", billing_status="trialing")
    db.add(org)
    await db.flush()

    user = User(
        organization_id=org.id,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role="owner",
        full_name=payload.name,
    )
    user.last_login_at = datetime.now(timezone.utc)
    db.add(user)
    await db.flush()

    db.add(AgentConfig(organization_id=org.id, persona=f"Warm, direct, and efficient — introduces itself as \"{org.name}'s AI assistant,\" never pretends to be human, and keeps replies under 3 sentences."))
    db.add(
        LeadChannel(
            organization_id=org.id,
            channel_type="website_form",
            config={"form_key": str(org.id)},
            is_active=True,
        )
    )
    await db.commit()

    await issue_session_cookie(response, db, user.id, request.client.host if request.client else None, request.headers.get("user-agent"))
    await db.commit()
    return {"ok": True, "user": _to_session_user(user)}


@router.post("/login")
async def login(payload: LoginInput, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    user = (await db.execute(select(User).where(User.email == payload.email))).scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        return {"ok": False, "errors": {"formErrors": ["Invalid email or password"], "fieldErrors": {}}}

    user.last_login_at = datetime.now(timezone.utc)
    await issue_session_cookie(response, db, user.id, request.client.host if request.client else None, request.headers.get("user-agent"))
    await db.commit()
    return {"ok": True, "user": _to_session_user(user)}


@router.post("/logout")
async def logout(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    from app.core.security import verify_session_token

    token = request.cookies.get("session_id")
    if token:
        session_uuid = verify_session_token(token)
        if session_uuid:
            session_row = (await db.execute(select(SessionModel).where(SessionModel.id == session_uuid))).scalar_one_or_none()
            if session_row:
                from datetime import datetime, timezone

                session_row.revoked_at = datetime.now(timezone.utc)
                await db.commit()

    clear_session_cookie(response)
    return {"ok": True}


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return {"user": _to_session_user(user)}


@router.post("/forgot-password", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def forgot_password():
    # Phase 2 — needs a transactional reset-token flow beyond MVP's scope (SKILL-BACKEND.md §2.1)
    raise HTTPException(status_code=501, detail="Not implemented in Phase 1 — see SKILL-BACKEND.md §2.1")


@router.post("/reset-password", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def reset_password():
    raise HTTPException(status_code=501, detail="Not implemented in Phase 1 — see SKILL-BACKEND.md §2.1")
