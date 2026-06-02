from __future__ import annotations

import logging
import time
import uuid
from collections import defaultdict, deque
from threading import Lock

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from backend_v2.app.core.config import AppConfig
from backend_v2.app.core.logging import log_event, reset_request_id, set_request_id
from backend_v2.app.core.observability import MetricsStore


class SlidingWindowRateLimiter:
    def __init__(self, window_seconds: int = 60) -> None:
        self.window_seconds = window_seconds
        self._lock = Lock()
        self._requests: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str, limit: int) -> tuple[bool, int]:
        now = time.time()
        cutoff = now - self.window_seconds
        with self._lock:
            bucket = self._requests[key]
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()
            if len(bucket) >= limit:
                retry_after = max(1, int(self.window_seconds - (now - bucket[0])))
                return False, retry_after
            bucket.append(now)
            return True, 0


def _client_identifier(request: Request) -> str:
    if request.client and request.client.host:
        return request.client.host
    forwarded_for = request.headers.get('x-forwarded-for', '')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip() or 'unknown'
    return 'unknown'


def install_middlewares(app: FastAPI, config: AppConfig, metrics: MetricsStore, logger) -> None:
    limiter = SlidingWindowRateLimiter(window_seconds=60)

    @app.middleware('http')
    async def hardening_middleware(request: Request, call_next):
        request_id = request.headers.get('x-request-id', '')[:64] or uuid.uuid4().hex[:16]
        token = set_request_id(request_id)
        start_time = time.perf_counter()
        client = _client_identifier(request)
        path = request.url.path
        method = request.method

        content_length_header = request.headers.get('content-length')
        if content_length_header and content_length_header.isdigit():
            content_length = int(content_length_header)
            if content_length > config.request_size_limit_bytes:
                metrics.record_request(path, 413, 0)
                log_event(
                    logger,
                    logging.WARNING,
                    'request_rejected_size_limit',
                    request_id=request_id,
                    method=method,
                    path=path,
                    client=client,
                    content_length=content_length,
                    request_size_limit=config.request_size_limit_bytes,
                )
                response = JSONResponse(
                    status_code=413,
                    content={'detail': f"Request hajmi limitdan oshdi ({config.request_size_limit_bytes} bytes)."},
                )
                response.headers['X-Request-ID'] = request_id
                return response

        rate_key = f'{client}:{path}'
        allowed, retry_after = limiter.check(rate_key, config.rate_limit_per_minute)
        if not allowed:
            metrics.record_rate_limited(path)
            metrics.record_request(path, 429, 0)
            log_event(
                logger,
                logging.WARNING,
                'request_rate_limited',
                request_id=request_id,
                method=method,
                path=path,
                client=client,
                retry_after=retry_after,
            )
            response = JSONResponse(status_code=429, content={'detail': 'Juda ko‘p so‘rov yuborildi. Birozdan so‘ng qayta urinib ko‘ring.'})
            response.headers['Retry-After'] = str(retry_after)
            response.headers['X-Request-ID'] = request_id
            return response

        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        except Exception:
            latency_ms = (time.perf_counter() - start_time) * 1000
            metrics.record_request(path, 500, latency_ms)
            logger.exception(
                'unhandled_request_exception',
                extra={
                    'request_id': request_id,
                    'extra_fields': {
                        'method': method,
                        'path': path,
                        'client': client,
                        'latency_ms': round(latency_ms, 2),
                    },
                },
            )
            raise
        finally:
            if 'status_code' in locals():
                latency_ms = (time.perf_counter() - start_time) * 1000
                metrics.record_request(path, status_code, latency_ms)
                log_level = logging.WARNING if status_code >= 400 else logging.INFO
                log_event(
                    logger,
                    log_level,
                    'http_request_completed',
                    request_id=request_id,
                    method=method,
                    path=path,
                    status_code=status_code,
                    latency_ms=round(latency_ms, 2),
                    client=client,
                )
                response.headers['X-Request-ID'] = request_id
                response.headers['X-Content-Type-Options'] = 'nosniff'
                response.headers['X-Frame-Options'] = 'DENY'
                response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
                response.headers['Permissions-Policy'] = 'geolocation=(), camera=(), microphone=()'
                response.headers['Cache-Control'] = 'no-store'
                response.headers['Pragma'] = 'no-cache'
            reset_request_id(token)
