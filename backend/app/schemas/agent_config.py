from typing import Literal

from pydantic import Field

from app.schemas.common import CamelModel

QualifyingField = Literal["budget", "timeline", "need", "companySize", "authority"]


class QualifyingQuestion(CamelModel):
    id: str
    field: QualifyingField
    prompt: str
    required: bool


GmailReplyMode = Literal["auto_send", "review_first"]


class AgentConfig(CamelModel):
    persona: str
    qualifying_questions: list[QualifyingQuestion] = Field(min_length=1, max_length=8)
    handoff_threshold: int = Field(ge=0, le=100)
    calendly_url: str | None = None
    guardrails: list[str]
    active: bool
    gmail_reply_mode: GmailReplyMode = "auto_send"


class AgentConfigUpdate(CamelModel):
    persona: str
    qualifying_questions: list[QualifyingQuestion] = Field(min_length=1, max_length=8)
    handoff_threshold: int = Field(ge=0, le=100)
    calendly_url: str | None = None
    guardrails: list[str]
    active: bool
    gmail_reply_mode: GmailReplyMode = "auto_send"
