from datetime import datetime
from typing import Literal

from app.schemas.common import CamelModel

TeamRole = Literal["owner", "admin", "sales_rep"]


class TeamMember(CamelModel):
    id: str
    name: str
    email: str
    role: TeamRole
    avatar_src: str | None = None
    invited_at: datetime
    status: Literal["active", "invited"]


class TeamInviteInput(CamelModel):
    email: str
    role: TeamRole = "sales_rep"
