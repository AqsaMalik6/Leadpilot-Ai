"""Groq wiring for the OpenAI Agents SDK (SKILL-BACKEND.md §3).

The Agents SDK is a model-agnostic orchestration layer (guardrails, handoffs,
tool-calling, tracing) — pointing its underlying OpenAI client at Groq's
OpenAI-compatible endpoint instead of api.openai.com is the officially supported way
to run it on a different provider. Zero OpenAI spend; both pipeline stages run on Groq.
"""

from agents import AsyncOpenAI, set_default_openai_api, set_default_openai_client, set_tracing_disabled

from app.config import get_settings

settings = get_settings()

groq_client = AsyncOpenAI(base_url=settings.groq_base_url, api_key=settings.groq_api_key or "no-key-set")

# Groq serves the Chat Completions API, not OpenAI's newer Responses API.
set_default_openai_client(groq_client, use_for_tracing=False)
set_default_openai_api("chat_completions")
# Tracing would otherwise try to upload traces to OpenAI's platform using an OpenAI
# key we don't have — disable it rather than let it fail silently in the background.
set_tracing_disabled(True)


def groq_configured() -> bool:
    return bool(settings.groq_api_key)
