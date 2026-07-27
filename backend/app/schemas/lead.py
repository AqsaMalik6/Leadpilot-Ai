from datetime import datetime
from typing import Literal

from pydantic import Field

from app.schemas.common import CamelModel

Channel = Literal["website_form", "whatsapp", "email", "gmail"]
LeadStatus = Literal["new", "qualified", "booked", "rejected"]
MessageRole = Literal["lead", "agent", "system"]
QualificationField = Literal["budget", "timeline", "need", "companySize", "authority"]
# SKILL-DIGITAL-FTE-UPGRADE.md §1/§6 — additive to LeadStatus, never replaces it.
PipelineStage = Literal["new", "contacted", "qualified", "meeting_scheduled", "proposal_sent", "won", "lost"]
Temperature = Literal["hot", "warm", "cold"]


class TranscriptMessage(CamelModel):
    id: str
    role: MessageRole
    text: str
    timestamp: datetime
    typing_duration_ms: int | None = None


class QualificationAnswer(CamelModel):
    question: str
    answer: str
    field: QualificationField


class Qualification(CamelModel):
    budget: str | None = None
    timeline: str | None = None
    need: str | None = None
    company_size: str | None = None
    decision_authority: bool | None = None
    answers: list[QualificationAnswer] = Field(default_factory=list)
    score: int | None = Field(default=None, ge=0, le=100)


class Lead(CamelModel):
    id: str
    name: str
    company: str | None = None
    email: str | None = None
    phone: str | None = None
    channel: Channel
    status: LeadStatus
    created_at: datetime
    responded_at: datetime | None = None
    response_time_seconds: int | None = None
    transcript: list[TranscriptMessage] = Field(default_factory=list)
    qualification: Qualification
    calendly_booking_url: str | None = None
    booked_at: datetime | None = None
    rejection_reason: str | None = None
    is_live: bool
    pipeline_stage: PipelineStage
    temperature: Temperature
    follow_up_count: int
    next_follow_up_at: datetime | None = None


class LeadListItem(CamelModel):
    id: str
    name: str
    company: str | None = None
    email: str | None = None
    phone: str | None = None
    channel: Channel
    status: LeadStatus
    created_at: datetime
    responded_at: datetime | None = None
    response_time_seconds: int | None = None
    calendly_booking_url: str | None = None
    booked_at: datetime | None = None
    rejection_reason: str | None = None
    is_live: bool
    qualification_score: int | None = None
    pipeline_stage: PipelineStage
    temperature: Temperature
    follow_up_count: int
    next_follow_up_at: datetime | None = None


class LeadFilters(CamelModel):
    status: LeadStatus | None = None
    channel: Channel | None = None
    search: str | None = None
