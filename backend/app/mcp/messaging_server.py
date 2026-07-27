"""Real MCP server exposing WhatsApp/email send as MCP tools, run as a stdio
subprocess and connected to by the qualification agent via
agents.mcp.MCPServerStdio (see app/agent/pipeline.py). Replaces the plain
in-process @function_tool wiring that whatsapp_service.py/email_service.py's own
docstrings flagged as the natural next step for real MCP connectors.

Reuses the existing send functions verbatim — this changes how they're exposed
to the agent, not what they do (same console-log fallback when no provider key
is configured).
"""

from mcp.server.fastmcp import FastMCP

from app.services.email_service import send_email
from app.services.whatsapp_service import send_whatsapp_message

mcp = FastMCP("leadpilot-messaging")


@mcp.tool()
async def send_whatsapp(to_phone: str, message: str) -> str:
    """Send a WhatsApp text message to a lead's phone number."""
    ok = await send_whatsapp_message(to_phone, message)
    return "sent" if ok else "failed"


@mcp.tool()
async def send_email_message(to_email: str, subject: str, body: str) -> str:
    """Send an email to a lead or a team member."""
    ok = await send_email(to_email, subject, body)
    return "sent" if ok else "failed"


if __name__ == "__main__":
    mcp.run(transport="stdio")
