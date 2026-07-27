"""Password hashing + signed session-cookie tokens.

The session_id cookie value is a signed, opaque token referencing a `sessions` row,
signed with SESSION_COOKIE_SECRET — the same env var already scaffolded in
frontend/.env.local.example (today it only signs lp_overlay there). Reusing it means
the frontend can eventually verify the cookie locally in middleware.ts without a
network round-trip to this backend. This is NOT "the same pattern as the JBD
project" — JBD's hardcoded secure=false and demo-mode bypass are not carried over
(SKILL-BACKEND.md §1, §6).
"""

import uuid

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.config import get_settings

settings = get_settings()
_hasher = PasswordHasher()
_serializer = URLSafeTimedSerializer(settings.session_cookie_secret, salt="leadpilot-session")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False
    except Exception:
        return False


def sign_session_token(session_id: uuid.UUID) -> str:
    return _serializer.dumps({"sid": str(session_id)})


def verify_session_token(token: str) -> uuid.UUID | None:
    try:
        data = _serializer.loads(token, max_age=settings.session_ttl_seconds)
        return uuid.UUID(data["sid"])
    except (BadSignature, SignatureExpired, KeyError, ValueError):
        return None
