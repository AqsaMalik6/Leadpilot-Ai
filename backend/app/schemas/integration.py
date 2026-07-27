from datetime import datetime
from typing import Literal

from app.schemas.common import CamelModel

IntegrationProvider = Literal["whatsapp", "email", "website_form", "calendly", "slack", "hubspot"]
IntegrationStatus = Literal["connected", "not_connected", "error"]


class Integration(CamelModel):
    id: str
    provider: IntegrationProvider
    label: str
    description: str
    logo_src: str | None = None
    status: IntegrationStatus
    connected_at: datetime | None = None
    config_href: str
