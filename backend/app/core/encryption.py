"""Phase 1 at-rest encryption for integration credentials — a single Fernet key from
env (INTEGRATION_ENCRYPTION_KEY). Upgrade path to KMS-managed envelope encryption is
Phase 2 (SKILL-BACKEND.md §6), once handling real customer OAuth tokens at scale.

Any string works as the configured key — it's hashed into a valid 32-byte Fernet key,
so there's no separate "generate a proper Fernet key" setup step for local dev.
"""

import base64
import hashlib

from cryptography.fernet import Fernet

from app.config import get_settings

settings = get_settings()


def _derive_fernet_key(secret: str) -> bytes:
    digest = hashlib.sha256(secret.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


_fernet = Fernet(_derive_fernet_key(settings.integration_encryption_key))


def encrypt_credentials(plaintext: str) -> bytes:
    return _fernet.encrypt(plaintext.encode("utf-8"))


def decrypt_credentials(ciphertext: bytes) -> str:
    return _fernet.decrypt(ciphertext).decode("utf-8")
