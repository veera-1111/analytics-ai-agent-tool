"""
AES-256-GCM envelope encryption for DB credentials stored in DynamoDB.
Key comes from CREDENTIALS_ENCRYPTION_KEY env var (32 raw bytes as hex).
"""

import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def _key() -> bytes:
    hex_key = os.environ.get("CREDENTIALS_ENCRYPTION_KEY", "")
    if not hex_key:
        raise RuntimeError("CREDENTIALS_ENCRYPTION_KEY env var not set")
    return bytes.fromhex(hex_key)


def encrypt(plaintext: str) -> str:
    """Encrypt a string → base64(nonce + ciphertext)."""
    nonce = os.urandom(12)
    ct = AESGCM(_key()).encrypt(nonce, plaintext.encode(), None)
    return base64.b64encode(nonce + ct).decode()


def decrypt(blob: str) -> str:
    """Decrypt base64(nonce + ciphertext) → plaintext string."""
    raw = base64.b64decode(blob)
    nonce, ct = raw[:12], raw[12:]
    return AESGCM(_key()).decrypt(nonce, ct, None).decode()
