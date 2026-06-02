from __future__ import annotations

import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

from backend_v2.app.core.config import get_config


def _get_secret_key() -> str:
    return os.environ.get('SQLI_SENTINEL_SECRET', 'sqli-sentinel-dev-secret')


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def utc_now_iso() -> str:
    return utc_now().isoformat()


def hash_password(password: str) -> str:
    iterations = get_config().password_hash_iterations
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), iterations)
    return f'{iterations}${salt}${digest.hex()}'


def verify_password(password: str, password_hash: str) -> bool:
    try:
        parts = password_hash.split('$')
        if len(parts) == 2:
            # Legacy format: salt$digest
            iterations = 100_000
            salt, digest = parts
        else:
            iterations_str, salt, digest = parts
            iterations = int(iterations_str)
        candidate = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), iterations)
        return hmac.compare_digest(candidate.hex(), digest)
    except (ValueError, TypeError):
        return False


def generate_token() -> str:
    return secrets.token_urlsafe(32)


def session_expiry_iso(hours: int | None = None) -> str:
    ttl_hours = hours if hours is not None else get_config().session_ttl_hours
    return (utc_now() + timedelta(hours=ttl_hours)).isoformat()


def token_signature(token: str) -> str:
    digest = hmac.new(_get_secret_key().encode('utf-8'), token.encode('utf-8'), hashlib.sha256)
    return digest.hexdigest()


def constant_time_equals(left: str, right: str) -> bool:
    return hmac.compare_digest(left, right)


def session_expiry_seconds(hours: int | None = None) -> int:
    ttl_hours = hours if hours is not None else get_config().session_ttl_hours
    return ttl_hours * 3600


def mask_token(token: str) -> str:
    if len(token) < 10:
        return '*' * len(token)
    return f'{token[:6]}...{token[-4:]}'
