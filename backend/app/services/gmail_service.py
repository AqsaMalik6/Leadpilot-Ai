"""SKILL-DIGITAL-FTE-UPGRADE.md §2 — Gmail OAuth token refresh, incremental History API
sync, and send. Structure is real and ready; actually exercising it requires the user
to run scripts/gmail_oauth_setup.py once with their own Google Cloud OAuth client
credentials (app/config.py's gmail_oauth_client_id/secret) — same honest "real code,
needs your keys" status WhatsApp/Resend had before those were configured in this project.
"""

import logging

from app.config import get_settings
from app.core.encryption import decrypt_credentials, encrypt_credentials
from app.models.gmail import GmailAccount

logger = logging.getLogger("leadpilot.gmail")

GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.modify"]

# Guarded import: google-api-python-client/google-auth-oauthlib are real dependencies
# (requirements.txt) but this module must never crash app startup just because they
# aren't installed yet in some environment — gmail_poll_job simply finds zero active
# accounts and no-ops regardless (see app/jobs/gmail_poll.py), so a missing package
# here should degrade the same way a missing WHATSAPP_TOKEN does, not take the app down.
try:
    from google.auth.transport.requests import Request as GoogleAuthRequest
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    GMAIL_SDK_AVAILABLE = True
except ImportError:
    logger.warning("google-api-python-client/google-auth-oauthlib not installed — Gmail integration disabled")
    GMAIL_SDK_AVAILABLE = False


def _credentials_from_account(account: GmailAccount) -> Credentials:
    settings = get_settings()
    import json

    token_data = json.loads(decrypt_credentials(account.oauth_tokens_encrypted))
    return Credentials(
        token=token_data.get("token"),
        refresh_token=token_data["refresh_token"],
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.gmail_oauth_client_id,
        client_secret=settings.gmail_oauth_client_secret,
        scopes=GMAIL_SCOPES,
    )


async def refresh_and_store_if_needed(account: GmailAccount, db) -> Credentials:
    """google-auth's Credentials.refresh() is sync/blocking (a plain HTTPS call) — fine
    to call directly here since gmail_poll_job already runs off the main request path.

    Always refreshes proactively rather than checking creds.expired: the stored blob
    only ever persists {token, refresh_token} (no expiry timestamp), so a Credentials
    object rebuilt from it has expiry=None and creds.expired is always False — the
    expired-check branch below would never fire, silently skipping the refresh every
    time. Without this, every real Gmail API call was hitting a stale access token,
    getting a 401, and relying entirely on google_auth_httplib2's own internal
    auto-refresh-on-401 fallback — which works, but never persists the new token back
    to gmail_accounts and costs an extra failed round-trip on every single call."""
    import json

    creds = _credentials_from_account(account)
    if creds.refresh_token:
        creds.refresh(GoogleAuthRequest())
        account.oauth_tokens_encrypted = encrypt_credentials(json.dumps({"token": creds.token, "refresh_token": creds.refresh_token}))
        await db.commit()
    return creds


def gmail_client(creds: Credentials):
    return build("gmail", "v1", credentials=creds, cache_discovery=False)


def fetch_new_messages(creds: Credentials, last_history_id: str | None) -> tuple[list[dict], str | None]:
    """Incremental sync via the History API (§2 correction — not a date-based `after:`
    query, which can miss same-day messages or reprocess duplicates). Returns
    (new message dicts, new history_id cursor to store). If last_history_id is None
    (first-ever sync for this account), just captures the current historyId as the
    starting point without processing a backlog of old mail as if it were new leads."""
    client = gmail_client(creds)
    profile = client.users().getProfile(userId="me").execute()
    current_history_id = str(profile["historyId"])

    if last_history_id is None:
        return [], current_history_id

    messages: list[dict] = []
    seen_ids: set[str] = set()
    page_token = None
    try:
        while True:
            resp = client.users().history().list(
                userId="me", startHistoryId=last_history_id, historyTypes=["messageAdded"], pageToken=page_token
            ).execute()
            for record in resp.get("history", []):
                for added in record.get("messagesAdded", []):
                    msg_id = added["message"]["id"]
                    # Gmail's History API can legitimately list the same message under
                    # more than one history record (e.g. a label change alongside the
                    # add) — without this dedupe, one real inbound email gets fetched
                    # and processed twice, producing two separate leads/replies.
                    if msg_id in seen_ids:
                        continue
                    seen_ids.add(msg_id)
                    full = client.users().messages().get(userId="me", id=msg_id, format="full").execute()
                    messages.append(full)
            page_token = resp.get("nextPageToken")
            if not page_token:
                break
    except Exception:
        logger.exception("Gmail history.list failed — will retry from the same cursor next poll")
        return [], last_history_id

    return messages, current_history_id


def parse_message(message: dict) -> dict:
    """Extracts from-address, display name, subject, and plain-text body from a Gmail
    API 'full' format message resource."""
    import base64
    import re

    headers = {h["name"].lower(): h["value"] for h in message.get("payload", {}).get("headers", [])}
    from_header = headers.get("from", "")
    match = re.match(r'^"?([^"<]*)"?\s*<?([\w\.\-+]+@[\w\.\-]+)>?$', from_header.strip())
    from_name = (match.group(1).strip() if match and match.group(1) else from_header).strip()
    from_email = match.group(2) if match else from_header

    def _extract_text(payload: dict) -> str:
        if payload.get("mimeType") == "text/plain" and "data" in payload.get("body", {}):
            return base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8", errors="ignore")
        for part in payload.get("parts", []):
            text = _extract_text(part)
            if text:
                return text
        return ""

    return {
        "from_email": from_email,
        "from_name": from_name or from_email,
        "subject": headers.get("subject", ""),
        "text": _extract_text(message.get("payload", {})).strip(),
        "thread_id": message.get("threadId"),
    }


def send_reply(creds: Credentials, to_email: str, subject: str, body_text: str, thread_id: str | None = None) -> bool:
    import base64
    from email.mime.text import MIMEText

    try:
        client = gmail_client(creds)
        message = MIMEText(body_text)
        message["to"] = to_email
        message["subject"] = subject
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        body = {"raw": raw}
        if thread_id:
            body["threadId"] = thread_id
        client.users().messages().send(userId="me", body=body).execute()
        return True
    except Exception:
        logger.exception("Gmail send failed, falling back to console log")
        logger.info("[gmail:console-fallback] to=%s subject=%r\n%s", to_email, subject, body_text)
        return False
