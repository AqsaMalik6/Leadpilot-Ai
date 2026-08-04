from fastapi import APIRouter, HTTPException
import httpx
import logging

router = APIRouter()
logger = logging.getLogger("leadpilot.whatsapp_status")

SIDE_CAR_URL = "http://127.0.0.1:8020/sessions/test/status"

@router.get("/whatsapp_status")
async def whatsapp_status():
    """Return the health/status of the WhatsApp side‑car.
    Calls the side‑car health endpoint and forwards the JSON response.
    """
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(SIDE_CAR_URL)
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        logger.exception("Failed to get WhatsApp side‑car status")
        raise HTTPException(status_code=502, detail="WhatsApp side‑car unavailable")
