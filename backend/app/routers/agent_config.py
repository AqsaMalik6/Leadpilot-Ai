from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.client import groq_configured
from app.agent.pipeline import build_system_prompt, fast_ack
from app.db import get_db
from app.dependencies import get_current_user
from app.models.agent_config import AgentConfig, AgentConfigHistory
from app.models.user import User
from app.schemas.agent_config import AgentConfig as AgentConfigSchema
from app.schemas.agent_config import AgentConfigUpdate

router = APIRouter(prefix="/api/agent", tags=["agent"])


def _to_schema(config: AgentConfig) -> AgentConfigSchema:
    return AgentConfigSchema(
        persona=config.persona,
        qualifying_questions=config.qualifying_questions,
        handoff_threshold=config.handoff_threshold_score,
        calendly_url=config.calendly_link,
        guardrails=config.guardrails,
        active=config.active,
    )


@router.get("/config")
async def get_config(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    config = (await db.execute(select(AgentConfig).where(AgentConfig.organization_id == user.organization_id))).scalar_one()
    return _to_schema(config)


@router.put("/config")
async def update_config(payload: AgentConfigUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    config = (await db.execute(select(AgentConfig).where(AgentConfig.organization_id == user.organization_id))).scalar_one()

    db.add(
        AgentConfigHistory(
            agent_config_id=config.id,
            changed_by_user_id=user.id,
            snapshot=_to_schema(config).model_dump(mode="json", by_alias=True),
        )
    )

    config.persona = payload.persona
    config.qualifying_questions = [q.model_dump(by_alias=True) for q in payload.qualifying_questions]
    config.handoff_threshold_score = payload.handoff_threshold
    config.calendly_link = payload.calendly_url
    config.guardrails = payload.guardrails
    config.active = payload.active
    await db.commit()
    await db.refresh(config)
    return _to_schema(config)


@router.post("/config/preview")
async def preview_config(payload: AgentConfigUpdate, sample_message: str = "Hi, I'm looking into this for my team."):
    """Runs a config against a sample message without saving — safe testing
    (SKILL-BACKEND.md §2.5)."""
    fake_config = AgentConfig(
        persona=payload.persona,
        qualifying_questions=[q.model_dump(by_alias=True) for q in payload.qualifying_questions],
        guardrails=payload.guardrails,
        handoff_threshold_score=payload.handoff_threshold,
        calendly_link=payload.calendly_url,
        active=payload.active,
    )
    if not groq_configured():
        return {"reply": "GROQ_API_KEY isn't configured — set it in .env to preview real replies.", "systemPrompt": build_system_prompt(fake_config)}

    reply = await fast_ack(fake_config, sample_message)
    return {"reply": reply, "systemPrompt": build_system_prompt(fake_config)}
