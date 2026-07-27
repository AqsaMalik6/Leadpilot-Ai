"""SKILL-DIGITAL-FTE-UPGRADE.md §2 — one-time local Gmail OAuth connection.

Run once (`venv\\Scripts\\python.exe -m scripts.gmail_oauth_setup`) to connect a real
Gmail inbox. Requires GMAIL_OAUTH_CLIENT_ID/GMAIL_OAUTH_CLIENT_SECRET in .env — create
an "OAuth client ID" of type "Desktop app" in Google Cloud Console (APIs & Services ->
Credentials), enable the Gmail API for that project, and add your own Google account
as a test user under the OAuth consent screen (no domain verification needed for a
Desktop app client, and http://localhost redirect URIs are allowed — unlike Calendly).

This is a genuine one-time local step no automated process can do on your behalf
(creating the Google Cloud project/OAuth client requires your own Google account
login) — same reason Slack/HubSpot OAuth stayed disabled earlier in this project.
"""

import asyncio
import json
import sys

from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

from app.config import get_settings
from app.core.encryption import encrypt_credentials
from app.db import SessionLocal
from app.models.gmail import GmailAccount
from app.models.organization import Organization
from app.services.gmail_service import GMAIL_SCOPES
from sqlalchemy import select


async def main(org_slug: str) -> None:
    settings = get_settings()
    if not settings.gmail_oauth_client_id or not settings.gmail_oauth_client_secret:
        print("Set GMAIL_OAUTH_CLIENT_ID and GMAIL_OAUTH_CLIENT_SECRET in .env first — see this script's docstring.")
        sys.exit(1)

    flow = InstalledAppFlow.from_client_config(
        {
            "installed": {
                "client_id": settings.gmail_oauth_client_id,
                "client_secret": settings.gmail_oauth_client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": ["http://localhost"],
            }
        },
        scopes=GMAIL_SCOPES,
    )
    # Opens a browser tab for the consent screen, listens on localhost for the redirect.
    creds = flow.run_local_server(port=0)
    email_address = build("gmail", "v1", credentials=creds).users().getProfile(userId="me").execute()["emailAddress"]

    async with SessionLocal() as db:
        org = (await db.execute(select(Organization).where(Organization.slug == org_slug))).scalar_one_or_none()
        if org is None:
            print(f"No organization with slug={org_slug!r} found.")
            sys.exit(1)

        existing = (
            await db.execute(select(GmailAccount).where(GmailAccount.organization_id == org.id))
        ).scalar_one_or_none()
        token_blob = encrypt_credentials(json.dumps({"token": creds.token, "refresh_token": creds.refresh_token}))
        if existing is not None:
            existing.email_address = email_address
            existing.oauth_tokens_encrypted = token_blob
            existing.is_active = True
        else:
            db.add(GmailAccount(organization_id=org.id, email_address=email_address, oauth_tokens_encrypted=token_blob, is_active=True))
        await db.commit()
    print(f"Gmail account {email_address} connected — gmail_poll_job will pick it up on its next cycle.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python -m scripts.gmail_oauth_setup <organization-slug>")
        sys.exit(1)
    asyncio.run(main(sys.argv[1]))
