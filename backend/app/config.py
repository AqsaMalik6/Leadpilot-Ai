from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/leadpilot"

    # Sessions / cookies (SESSION_COOKIE_SECRET is shared with frontend/.env.local.example)
    session_cookie_secret: str = "dev-only-secret-change-me"
    session_cookie_name: str = "session_id"
    session_ttl_seconds: int = 60 * 60 * 24 * 7

    # Encryption for integration credentials at rest (Phase 1: single Fernet key)
    integration_encryption_key: str = "changeme-32-byte-fernet-key-base64-01="

    # Groq (OpenAI Agents SDK points its OpenAI client at Groq's endpoint — see app/agent/client.py)
    groq_api_key: str = ""
    groq_base_url: str = "https://api.groq.com/openai/v1"
    groq_fast_model: str = "llama-3.1-8b-instant"
    groq_reasoning_model: str = "llama-3.3-70b-versatile"

    # Email (Resend). Empty key -> console/log fallback provider, never a hard failure.
    resend_api_key: str = ""
    email_from_address: str = "LeadPilot AI <noreply@leadpilot.ai>"
    contact_notification_email: str = "founder@leadpilot.ai"

    # WhatsApp Cloud API. Empty token -> console/log fallback provider.
    whatsapp_token: str = ""
    whatsapp_phone_number_id: str = ""
    # SKILL-DIGITAL-FTE-UPGRADE.md §4 — kept ON by default: WhatsApp is already real and
    # verified working in this project (real token, real delivered message), so the
    # doc's "off for now, Gmail is priority" default doesn't apply here. Flip to false to
    # disable without touching code.
    whatsapp_channel_enabled: bool = True

    # Calendly OAuth (Phase 1 integration)
    calendly_client_id: str = ""
    calendly_client_secret: str = ""
    default_calendly_url: str = ""
    # SKILL-DIGITAL-FTE-UPGRADE.md §5 — shared secret for verifying Calendly's webhook
    # signing signature. Empty -> webhook rejects everything (fails closed, not open).
    calendly_webhook_secret: str = ""

    # SKILL-DIGITAL-FTE-UPGRADE.md §2 — Gmail OAuth (installed-app flow, run once via
    # scripts/gmail_oauth_setup.py). Empty until the user creates a Google Cloud OAuth
    # client and supplies these — gmail_poll_job simply finds zero active accounts and
    # no-ops until then, same honest "real but needs your keys" pattern as WhatsApp/Resend.
    gmail_oauth_client_id: str = ""
    gmail_oauth_client_secret: str = ""
    # SKILL-MULTI-TENANT-CONNECT.md — self-serve web OAuth connect flow. Must be a
    # "Web application" OAuth client in Google Cloud Console (the desktop-app client
    # above is a different, incompatible client type) and must exactly match an
    # "Authorized redirect URI" registered there. Empty -> /start returns a clear
    # config error instead of a broken redirect.
    gmail_redirect_uri: str = ""
    # Where the callback sends the customer's browser back to after connecting.
    frontend_base_url: str = "http://localhost:3000"

    # SKILL-MULTI-TENANT-CONNECT.md — WhatsApp self-serve connect via the unofficial
    # linked-device protocol (Baileys sidecar), not Meta's official Business API.
    # Shared secret authenticating sidecar<->backend internal calls (never exposed
    # publicly). Empty -> internal endpoints reject everything (fails closed).
    whatsapp_sidecar_shared_secret: str = ""
    whatsapp_sidecar_url: str = "http://127.0.0.1:8020"

    # SKILL-OUTBOUND.md — free outbound lead prospecting. OSM Overpass needs no key at
    # all. Geoapify (free daily-quota tier, no card) and GitHub (free personal access
    # token) are optional — empty -> that source is skipped with a clear log line
    # rather than a hard failure, same "real but needs your keys" pattern as
    # WhatsApp/Resend/Gmail above.
    geoapify_api_key: str = ""
    github_token: str = ""

    # Billing — dummy/mock only, per product owner: no real Stripe account exists.
    # Any plan the user submits is accepted; nothing here ever calls the real Stripe API.
    stripe_mode: str = "dummy"

    # Background jobs: off by default (plain asyncio/BackgroundTasks). Flip to true
    # only once Redis is actually running locally — see README.
    use_celery: bool = False
    redis_url: str = "redis://localhost:6379/0"

    # CORS is not required for the browser under the server-to-server integration
    # model (see SKILL-BACKEND.md), but kept configurable for local tooling/tests.
    cors_origins: list[str] = ["http://localhost:3000"]

    environment: str = "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()
