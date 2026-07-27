from datetime import datetime
from typing import Literal

from app.schemas.common import CamelModel
from app.schemas.lead import LeadListItem, LeadStatus


class KpiSummary(CamelModel):
    leads_today: int
    leads_today_delta: int
    qualified_today: int
    qualified_rate: float
    booked_today: int
    avg_response_time_seconds: float
    avg_response_time_delta: float


class KpiTimeseriesPoint(CamelModel):
    date: str
    new_leads: int
    qualified: int
    booked: int
    rejected: int
    avg_response_time_seconds: float


class DashboardOverview(CamelModel):
    summary: KpiSummary
    timeseries: list[KpiTimeseriesPoint]
    recent_leads: list[LeadListItem]


class SseNewLeadEvent(CamelModel):
    type: Literal["new_lead"] = "new_lead"
    lead: LeadListItem


class SseStatusChangeEvent(CamelModel):
    type: Literal["status_change"] = "status_change"
    lead_id: str
    status: LeadStatus


class SseHeartbeatEvent(CamelModel):
    type: Literal["heartbeat"] = "heartbeat"
    timestamp: datetime
