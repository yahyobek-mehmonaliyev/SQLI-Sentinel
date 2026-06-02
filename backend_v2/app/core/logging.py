from __future__ import annotations

import json
import logging
import sys
from contextvars import ContextVar, Token
from datetime import datetime, timezone
from typing import Any


_request_id_context: ContextVar[str | None] = ContextVar('request_id', default=None)
_LOG_MARKER = '_sqli_sentinel_logging_configured'


def set_request_id(request_id: str) -> Token[str | None]:
    return _request_id_context.set(request_id)


def reset_request_id(token: Token[str | None]) -> None:
    _request_id_context.reset(token)


def get_request_id() -> str | None:
    return _request_id_context.get()


class JsonLogFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
        }

        request_id = getattr(record, 'request_id', None) or get_request_id()
        if request_id:
            payload['request_id'] = request_id

        extra_fields = getattr(record, 'extra_fields', {})
        if isinstance(extra_fields, dict):
            for key, value in extra_fields.items():
                payload[key] = value

        if record.exc_info:
            payload['exception'] = self.formatException(record.exc_info)

        return json.dumps(payload, ensure_ascii=False, default=str)


def configure_logging(level: str = 'INFO') -> None:
    root_logger = logging.getLogger()
    if getattr(root_logger, _LOG_MARKER, False):
        root_logger.setLevel(level)
        return

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonLogFormatter())

    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(level)
    setattr(root_logger, _LOG_MARKER, True)


def get_logger(name: str = 'sqli_sentinel') -> logging.Logger:
    return logging.getLogger(name)


def log_event(
    logger: logging.Logger,
    level: int,
    message: str,
    *,
    request_id: str | None = None,
    **fields: Any,
) -> None:
    logger.log(
        level,
        message,
        extra={
            'request_id': request_id,
            'extra_fields': fields,
        },
    )
