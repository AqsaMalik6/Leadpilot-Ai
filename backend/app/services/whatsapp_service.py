"""WhatsApp Business Cloud API outbound send, with a console/log fallback when no
token is configured. Phase 2 per SKILL-BACKEND.md (edited): "WhatsApp + email intake
channels via MCP connectors."

Honest implementation note: this ships as an in-process Agents SDK-callable
send function today, not a standalone MCP server. The `openai-agents` package does
ship real MCP client support (`agents.mcp.MCPServerStdio` / `MCPServerSse`) — wiring
a dedicated MCP server process for WhatsApp/email is a clean Phase 2.5 upgrade once
there's a real WhatsApp Business account to test against; it would change how this
function is *exposed* to the agent, not what it does.
"""

import logging

import httpx

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger("leadpilot.whatsapp")


async def send_whatsapp_message(to_phone: str, text: str) -> bool:
    if not settings.whatsapp_token or not settings.whatsapp_phone_number_id:
        logger.info("[whatsapp:console-fallback] to=%s\n%s", to_phone, text)
        return True

    url = f"https://graph.facebook.com/v20.0/{settings.whatsapp_phone_number_id}/messages"
    headers = {"Authorization": f"Bearer {settings.whatsapp_token}"}
    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "text",
        "text": {"body": text},
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
        return True
    except httpx.HTTPError:
        logger.exception("WhatsApp send failed, falling back to console log")
        logger.info("[whatsapp:console-fallback] to=%s\n%s", to_phone, text)
        return False
