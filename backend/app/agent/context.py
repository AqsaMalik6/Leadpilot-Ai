import uuid
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession


@dataclass
class AgentRunContext:
    """Passed as the Agents SDK RunContextWrapper context — carries what the
    function_tools in tools.py need to actually write to the database mid-run."""

    db: AsyncSession
    organization_id: uuid.UUID
    lead_id: uuid.UUID
    conversation_id: uuid.UUID
    calendly_url: str | None
