import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend_v2.app.core.config import AppConfig
from backend_v2.app.core.middleware import install_middlewares
from backend_v2.app.core.observability import MetricsStore


def create_test_app(rate_limit_per_minute: int = 3, request_size_limit_bytes: int = 128) -> FastAPI:
    app = FastAPI()
    config = AppConfig(
        app_name='test',
        app_version='test',
        app_env='test',
        log_level='INFO',
        db_path=Path('test.db'),
        allowed_origins=['http://localhost:3000'],
        session_ttl_hours=24,
        rate_limit_per_minute=rate_limit_per_minute,
        request_size_limit_bytes=request_size_limit_bytes,
        enable_metrics=True,
        ai_timeout_seconds=20,
        max_report_export_rows=100,
        password_hash_iterations=100_000,
    )
    install_middlewares(app, config, MetricsStore(), logging.getLogger('test'))

    @app.get('/ping')
    def ping() -> dict[str, str]:
        return {'status': 'ok'}

    @app.post('/ingest')
    def ingest(payload: dict) -> dict[str, int]:
        return {'size': len(str(payload))}

    return app


def test_security_headers_are_set() -> None:
    client = TestClient(create_test_app())
    response = client.get('/ping')
    assert response.status_code == 200
    assert response.headers.get('X-Content-Type-Options') == 'nosniff'
    assert response.headers.get('X-Frame-Options') == 'DENY'
    assert response.headers.get('X-Request-ID')


def test_rate_limit_returns_429() -> None:
    client = TestClient(create_test_app(rate_limit_per_minute=2))
    first = client.get('/ping')
    second = client.get('/ping')
    third = client.get('/ping')
    assert first.status_code == 200
    assert second.status_code == 200
    assert third.status_code == 429
    assert 'Retry-After' in third.headers


def test_request_size_limit_returns_413() -> None:
    client = TestClient(create_test_app(request_size_limit_bytes=40))
    response = client.post('/ingest', json={'blob': 'x' * 400})
    assert response.status_code == 413
