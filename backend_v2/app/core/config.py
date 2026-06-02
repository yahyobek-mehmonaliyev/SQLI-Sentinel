from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


def _env_bool(name: str, default: bool) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {'1', 'true', 'yes', 'on'}


def _env_int(name: str, default: int, minimum: int, maximum: int) -> int:
    raw = os.environ.get(name)
    if raw is None:
        return default
    try:
        value = int(raw)
    except ValueError:
        return default
    return max(minimum, min(maximum, value))


def _env_csv(name: str, default: list[str]) -> list[str]:
    value = os.environ.get(name, '')
    if not value.strip():
        return default
    return [item.strip() for item in value.split(',') if item.strip()]


@dataclass(frozen=True)
class AppConfig:
    app_name: str
    app_version: str
    app_env: str
    log_level: str
    db_path: Path
    allowed_origins: list[str]
    session_ttl_hours: int
    rate_limit_per_minute: int
    request_size_limit_bytes: int
    enable_metrics: bool
    ai_timeout_seconds: int
    max_report_export_rows: int
    password_hash_iterations: int

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() in {'prod', 'production'}


@lru_cache(maxsize=1)
def get_config() -> AppConfig:
    default_db = Path(__file__).resolve().parents[3] / 'backend_v2' / 'data' / 'sqli_sentinel.db'
    db_path = Path(os.environ.get('SQLI_SENTINEL_DB_PATH', str(default_db))).resolve()

    return AppConfig(
        app_name=os.environ.get('SQLI_SENTINEL_APP_NAME', 'SQLI Sentinel Backend'),
        app_version=os.environ.get('SQLI_SENTINEL_APP_VERSION', '2.0.0'),
        app_env=os.environ.get('SQLI_SENTINEL_ENV', 'development'),
        log_level=os.environ.get('SQLI_SENTINEL_LOG_LEVEL', 'INFO').upper(),
        db_path=db_path,
        allowed_origins=_env_csv('SQLI_SENTINEL_ALLOWED_ORIGINS', ['http://localhost:3000', 'http://127.0.0.1:3000']),
        session_ttl_hours=_env_int('SQLI_SENTINEL_SESSION_TTL_HOURS', 24, 1, 168),
        rate_limit_per_minute=_env_int('SQLI_SENTINEL_RATE_LIMIT_PER_MINUTE', 120, 30, 3000),
        request_size_limit_bytes=_env_int('SQLI_SENTINEL_REQUEST_SIZE_LIMIT_BYTES', 262_144, 65_536, 10_485_760),
        enable_metrics=_env_bool('SQLI_SENTINEL_ENABLE_METRICS', True),
        ai_timeout_seconds=_env_int('SQLI_SENTINEL_AI_TIMEOUT_SECONDS', 20, 5, 120),
        max_report_export_rows=_env_int('SQLI_SENTINEL_MAX_REPORT_EXPORT_ROWS', 5_000, 100, 100_000),
        password_hash_iterations=_env_int('SQLI_SENTINEL_PBKDF2_ITERATIONS', 210_000, 100_000, 600_000),
    )
