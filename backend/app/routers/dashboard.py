from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.dependencies import get_current_user
from app.models.lead import Lead
from app.models.user import User
from app.routers.leads import _to_list_item

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/overview")
async def overview(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """ONE collapsed endpoint (SKILL-BACKEND.md §2.10) — the original spec's separate
    /kpis + /trends were never both called by the frontend; this matches
    DashboardOverviewSchema exactly: {summary, timeseries, recentLeads}."""
    org_id = user.organization_id
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)

    base = select(Lead).where(Lead.organization_id == org_id, Lead.is_demo.is_(False))

    leads_today = (await db.execute(select(func.count()).select_from(Lead).where(Lead.organization_id == org_id, Lead.is_demo.is_(False), Lead.created_at >= today_start))).scalar_one()
    leads_yesterday = (await db.execute(select(func.count()).select_from(Lead).where(Lead.organization_id == org_id, Lead.is_demo.is_(False), Lead.created_at >= yesterday_start, Lead.created_at < today_start))).scalar_one()
    qualified_today = (await db.execute(select(func.count()).select_from(Lead).where(Lead.organization_id == org_id, Lead.is_demo.is_(False), Lead.created_at >= today_start, Lead.status.in_(["qualified", "booked"])))).scalar_one()
    booked_today = (await db.execute(select(func.count()).select_from(Lead).where(Lead.organization_id == org_id, Lead.is_demo.is_(False), Lead.created_at >= today_start, Lead.status == "booked"))).scalar_one()

    total_today = leads_today or 1
    qualified_rate = qualified_today / total_today if leads_today else 0.0

    avg_response_today = (
        await db.execute(
            select(func.avg(Lead.response_time_seconds)).where(
                Lead.organization_id == org_id, Lead.is_demo.is_(False), Lead.created_at >= today_start, Lead.response_time_seconds.is_not(None)
            )
        )
    ).scalar_one()
    avg_response_yesterday = (
        await db.execute(
            select(func.avg(Lead.response_time_seconds)).where(
                Lead.organization_id == org_id,
                Lead.is_demo.is_(False),
                Lead.created_at >= yesterday_start,
                Lead.created_at < today_start,
                Lead.response_time_seconds.is_not(None),
            )
        )
    ).scalar_one()

    summary = {
        "leadsToday": leads_today,
        "leadsTodayDelta": leads_today - leads_yesterday,
        "qualifiedToday": qualified_today,
        "qualifiedRate": round(qualified_rate, 2),
        "bookedToday": booked_today,
        "avgResponseTimeSeconds": round(float(avg_response_today or 0), 1),
        "avgResponseTimeDelta": round(float(avg_response_today or 0) - float(avg_response_yesterday or 0), 1),
    }

    timeseries = []
    for i in range(29, -1, -1):
        day_start = today_start - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        day_leads = (
            await db.execute(
                select(Lead.status, func.count(), func.avg(Lead.response_time_seconds))
                .where(Lead.organization_id == org_id, Lead.is_demo.is_(False), Lead.created_at >= day_start, Lead.created_at < day_end)
                .group_by(Lead.status)
            )
        ).all()
        counts = {status: count for status, count, _ in day_leads}
        avg_resp = next((float(avg) for _, _, avg in day_leads if avg is not None), 0.0)
        timeseries.append(
            {
                "date": day_start.date().isoformat(),
                "newLeads": sum(counts.values()),
                "qualified": counts.get("qualified", 0),
                "booked": counts.get("booked", 0),
                "rejected": counts.get("rejected", 0),
                "avgResponseTimeSeconds": round(avg_resp, 1),
            }
        )

    recent = (await db.execute(base.order_by(Lead.created_at.desc()).limit(10))).scalars().all()

    return {
        "summary": summary,
        "timeseries": timeseries,
        "recentLeads": [_to_list_item(l) for l in recent],
    }
