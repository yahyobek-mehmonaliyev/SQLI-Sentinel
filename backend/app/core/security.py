from __future__ import annotations

import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone


SECRET_KEY = os.environ.get('SQLI_SENTINEL_SECRET', 'sqli-sentinel-dev-secret')


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def utc_now_iso() -> str:
    return utc_now().isoformat()


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100_000)
    return f'{salt}${digest.hex()}'


def verify_password(password: str, password_hash: str) -> bool:
    salt, digest = password_hash.split('$', 1)
    candidate = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100_000)
    return hmac.compare_digest(candidate.hex(), digest)


def generate_token() -> str:
    return secrets.token_urlsafe(32)


def session_expiry_iso(hours: int = 24) -> str:
    return (utc_now() + timedelta(hours=hours)).isoformat()


def mask_token(token: str) -> str:
    if len(token) < 10:
        return '*' * len(token)
    return f'{token[:6]}...{token[-4:]}'
