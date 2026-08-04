import uuid
from datetime import datetime
from typing import Literal

from pydantic import Field

from app.schemas.common import CamelModel

OutboundSource = Literal["osm", "geoapify", "github"]
OutboundStatus = Literal["found", "added_to_campaign", "contacted", "rejected"]


class OutboundLead(CamelModel):
    id: uuid.UUID
    business_name: str
    category: str
    address: str | None = None
    phone: str | None = None
    website: str | None = None
    email: str | None = None
    location: str | None = None
    tech_stack: list[str] | None = None
    github_org_or_user: str | None = None
    lat: float | None = None
    lng: float | None = None
    source: OutboundSource
    status: OutboundStatus
    found_at: datetime | None = None


class SearchRequest(CamelModel):
    category: str
    location: str
    max_results: int = Field(default=15, ge=1, le=50)


class AddToCampaignRequest(CamelModel):
    lead_ids: list[uuid.UUID]
