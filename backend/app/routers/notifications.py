from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.dependencies import get_current_user
from app.models.agent_config import AgentConfig
from app.models.notification import Notification
from app.models.user import User

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    notifications = (
        await db.execute(
            select(Notification).where(Notification.organization_id == user.organization_id).order_by(Notification.created_at.desc()).limit(50)
        )
    ).scalars().all()
    config = (await db.execute(select(AgentConfig).where(AgentConfig.organization_id == user.organization_id))).scalar_one()
    return {
        "notifications": [
            {
                "id": str(n.id),
                "type": n.type,
                "channel": n.channel,
                "status": n.status,
                "payload": n.payload,
                "leadId": str(n.lead_id) if n.lead_id else None,
                "sentAt": n.sent_at.isoformat() if n.sent_at else None,
                "createdAt": n.created_at.isoformat(),
            }
            for n in notifications
        ],
        "rules": config.notification_rules,
    }


@router.put("/rules")
async def update_rules(payload: dict, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Persisted for real (agent_configs.notification_rules). Enforced for the "email"
    # channel by notify_sales_team (app/agent/tools.py) — the only channel with a real
    # send path today. "slack" is stored but not enforced: no real Slack connection
    # exists yet (Phase 2, same as the Slack/HubSpot integration cards).
    config = (await db.execute(select(AgentConfig).where(AgentConfig.organization_id == user.organization_id))).scalar_one()
    config.notification_rules = payload
    await db.commit()
    return {"ok": True, "rules": payload}
