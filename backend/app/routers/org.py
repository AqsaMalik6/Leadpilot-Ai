from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.dependencies import get_current_organization, require_roles
from app.models.organization import Organization
from app.models.user import User

router = APIRouter(prefix="/api/org", tags=["org"])


@router.get("")
async def get_org(org: Organization = Depends(get_current_organization)):
    return {"organization": {"id": str(org.id), "name": org.name, "slug": org.slug}}


@router.put("/settings")
async def update_settings(
    payload: dict,
    user: User = Depends(require_roles("owner", "admin")),
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    if "name" in payload:
        org.name = payload["name"]
    if "brandingConfig" in payload:
        org.branding_config = {**org.branding_config, **payload["brandingConfig"]}
    await db.commit()
    return {"ok": True, "organization": {"id": str(org.id), "name": org.name, "slug": org.slug}}
