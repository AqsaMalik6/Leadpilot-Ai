"""SKILL-MULTI-TENANT-CONNECT.md §2 — self-serve Gmail connect. Replaces the
developer-only CLI flow (scripts/gmail_oauth_setup.py, an InstalledAppFlow that opens
a local browser) with a real web OAuth flow any customer can click through from their
own dashboard.

Two hops, not one direct link, because of how sessions work here: the session_id
cookie lives on the frontend's origin and is only ever forwarded server-side by
backendFetch — a raw browser navigation straight to this backend wouldn't carry it.
So org resolution happens at /start (behind get_current_user, called via the
frontend's own proxy route so the cookie is forwarded correctly), and the actual
redirect-to-Google is a real top-level navigation from there, not a fetch().
"""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.encryption import encrypt_credentials
from app.db import get_db
from app.dependencies import get_current_user
from app.models.gmail import GmailAccount
from app.models.user import User
from app.services.gmail_service import GMAIL_SCOPES

logger = logging.getLogger("leadpilot.gmail_connect")
settings = get_settings()
router = APIRouter(prefix="/api/integrations/gmail", tags=["gmail-connect"])

# Separate salt from the session-cookie serializer (app/core/security.py) — same
# shared secret, but a signed state token here should never be interchangeable with a
# signed session token there.
_state_serializer = URLSafeTimedSerializer(settings.session_cookie_secret, salt="leadpilot-gmail-oauth-state")
_STATE_MAX_AGE_SECONDS = 600  # 10 minutes — long enough for a real consent click-through, short enough to limit replay

try:
    from google_auth_oauthlib.flow import Flow

    GOOGLE_OAUTHLIB_AVAILABLE = True
except ImportError:
    logger.warning("google-auth-oauthlib not installed — Gmail web-connect flow disabled")
    GOOGLE_OAUTHLIB_AVAILABLE = False


def _build_flow() -> "Flow":
    client_config = {
        "web": {
            "client_id": settings.gmail_oauth_client_id,
            "client_secret": settings.gmail_oauth_client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }
    return Flow.from_client_config(client_config, scopes=GMAIL_SCOPES, redirect_uri=settings.gmail_redirect_uri)


@router.get("/start")
async def gmail_connect_start(user: User = Depends(get_current_user)):
    if not GOOGLE_OAUTHLIB_AVAILABLE:
        raise HTTPException(status_code=503, detail="Gmail connect isn't available — google-auth-oauthlib isn't installed")
    if not settings.gmail_oauth_client_id or not settings.gmail_oauth_client_secret or not settings.gmail_redirect_uri:
        raise HTTPException(
            status_code=503,
            detail="Gmail connect isn't configured yet — GMAIL_OAUTH_CLIENT_ID/SECRET/gmail_redirect_uri are missing in .env",
        )

    state = _state_serializer.dumps({"org_id": str(user.organization_id), "nonce": uuid.uuid4().hex})
    flow = _build_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        # Forces Google to issue a refresh_token on every connect, not just the first
        # ever consent for this Google account — without this, a customer who
        # disconnects and reconnects (or whose token gets revoked) would get no
        # refresh_token back and the account would silently stop working.
        prompt="consent",
        state=state,
    )
    return {"authUrl": auth_url}


@router.get("/callback")
async def gmail_connect_callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    # No get_current_user dependency here on purpose — this is a fresh top-level
    # navigation from Google with no session cookie for this origin. The signed
    # `state` param is the only trust boundary; it must prove which org this belongs
    # to and that it hasn't been tampered with or replayed after its window closes.
    if error:
        return RedirectResponse(f"{settings.frontend_base_url}/dashboard/integrations?gmail=error&reason={error}")
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code or state")

    try:
        payload = _state_serializer.loads(state, max_age=_STATE_MAX_AGE_SECONDS)
        org_id = uuid.UUID(payload["org_id"])
    except (BadSignature, SignatureExpired, KeyError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid or expired state — please try connecting again")

    flow = _build_flow()
    flow.fetch_token(code=code)
    creds = flow.credentials

    from googleapiclient.discovery import build

    profile = build("gmail", "v1", credentials=creds, cache_discovery=False).users().getProfile(userId="me").execute()
    email_address = profile["emailAddress"]

    import json

    encrypted = encrypt_credentials(json.dumps({"token": creds.token, "refresh_token": creds.refresh_token}))

    existing = (
        await db.execute(select(GmailAccount).where(GmailAccount.organization_id == org_id))
    ).scalar_one_or_none()
    if existing:
        existing.email_address = email_address
        existing.oauth_tokens_encrypted = encrypted
        existing.is_active = True
        existing.status = "connected"
        existing.last_status_message = None
        existing.last_history_id = None  # re-baseline the History API cursor for the (possibly new) account
    else:
        db.add(GmailAccount(organization_id=org_id, email_address=email_address, oauth_tokens_encrypted=encrypted))
    await db.commit()

    logger.info("Gmail connected for org_id=%s email=%s", org_id, email_address)
    return RedirectResponse(f"{settings.frontend_base_url}/dashboard/integrations?gmail=connected")
