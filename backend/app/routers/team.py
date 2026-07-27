import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.db import get_db
from app.dependencies import get_current_user, require_roles
from app.models.user import User
from app.schemas.team import TeamInviteInput
from app.services.email_service import send_email

router = APIRouter(prefix="/api/team", tags=["team"])


def _to_team_member(user: User) -> dict:
    return {
        "id": str(user.id),
        "name": user.full_name,
        "email": user.email,
        "role": user.role,
        "avatarSrc": None,
        "invitedAt": user.created_at.isoformat(),
        "status": "active" if user.last_login_at else "invited",
    }


@router.get("")
async def list_team(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    members = (await db.execute(select(User).where(User.organization_id == user.organization_id))).scalars().all()
    return {"team": [_to_team_member(m) for m in members]}


@router.post("/invite")
async def invite(
    payload: TeamInviteInput,
    user: User = Depends(require_roles("owner", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Roles-beyond-owner support (Phase 2, per the edited MVP scope note): creates the
    invited user immediately with a random temp password and emails them (or logs to
    console if no RESEND_API_KEY is set — see app/services/email_service.py)."""
    existing = (await db.execute(select(User).where(User.email == payload.email))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists")

    temp_password = uuid.uuid4().hex[:12]
    new_user = User(
        organization_id=user.organization_id,
        email=payload.email,
        password_hash=hash_password(temp_password),
        role=payload.role,
        full_name=payload.email.split("@")[0],
        onboarding_completed_at=None,
    )
    db.add(new_user)
    await db.commit()

    await send_email(
        payload.email,
        "You've been invited to LeadPilot AI",
        f"You've been invited to join your team's LeadPilot AI workspace.\n\nTemporary password: {temp_password}\nLog in and change it at your earliest convenience.",
    )
    return {"ok": True, "member": _to_team_member(new_user)}


@router.delete("/{user_id}")
async def remove_member(user_id: str, user: User = Depends(require_roles("owner", "admin")), db: AsyncSession = Depends(get_db)):
    member = (
        await db.execute(select(User).where(User.id == user_id, User.organization_id == user.organization_id))
    ).scalar_one_or_none()
    if member is None:
        raise HTTPException(status_code=404, detail="Not found")
    if member.id == user.id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")
    member.is_active = False
    await db.commit()
    return {"ok": True}
