from __future__ import annotations

import csv
import io
import json
import re
import logging
import uuid
from collections import Counter
from datetime import datetime, timezone
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from backend_v2.app.core.config import AppConfig, get_config
from backend_v2.app.core.database import initialize_database, managed_connection
from backend_v2.app.core.logging import configure_logging, get_logger, log_event
from backend_v2.app.core.middleware import install_middlewares
from backend_v2.app.core.observability import metrics_store
from backend_v2.app.core.security import (
    generate_token,
    hash_password,
    mask_token,
    session_expiry_iso,
    utc_now_iso,
    verify_password,
)
from backend_v2.app.models.schemas import (
    AiPromptOptimizeRequest,
    AiRecommendationRequest,
    ApiKeyCreateRequest,
    DetectRequest,
    ForgotPasswordRequest,
    LoginRequest,
    PayloadCreateRequest,
    PayloadUpdateRequest,
    RegisterRequest,
    ScanCreateRequest,
    SettingsUpdateRequest,
)
from backend_v2.app.services.ai import request_gemini_recommendation, request_prompt_optimization
from backend_v2.app.services.scanner import generate_findings, persist_scan_results
from backend_v2.app.services.seed import seed_database


config: AppConfig = get_config()
configure_logging(config.log_level)
logger = get_logger('sqli_sentinel.api')

app = FastAPI(title=config.app_name, version=config.app_version)
allow_origins = config.allowed_origins or ['http://localhost:3000']
allow_credentials = '*' not in allow_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=allow_credentials,
    allow_methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allow_headers=['*'],
)
install_middlewares(app, config, metrics_store, logger)


def parse_timestamp(value: str) -> datetime:
    normalized = value.replace('Z', '+00:00')
    return datetime.fromisoformat(normalized)


def safe_json_loads(value: str, default: Any) -> Any:
    try:
        return json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return default


def serialize_user(row: Any) -> dict[str, Any]:
    return {
        'id': row['id'],
        'email': row['email'],
        'name': row['name'],
        'role': row['role'],
    }


def serialize_scan(row: Any) -> dict[str, Any]:
    return {
        'id': row['id'],
        'targetUrl': row['target_url'],
        'status': row['status'],
        'timestamp': row['created_at'],
        'vulnerabilitiesFound': row['vulnerabilities_found'],
        'requestsTotal': row['requests_total'],
        'successRate': row['success_rate'],
        'duration': row['duration'],
        'depth': row['depth'],
        'summary': row['summary'],
        'payloadStrategy': row['payload_strategy'],
        'followRedirects': bool(row['follow_redirects']),
        'useRandomUserAgent': bool(row['use_random_user_agent']),
    }


def serialize_payload(row: Any) -> dict[str, Any]:
    return {
        'id': row['id'],
        'type': row['type'],
        'payload': row['payload'],
        'successRate': row['success_rate'],
        'description': row['description'],
        'category': row['category'],
        'enabled': bool(row['enabled']),
        'createdAt': row['created_at'],
    }


def serialize_vulnerability(row: Any) -> dict[str, Any]:
    return {
        'id': row['id'],
        'scanId': row['scan_id'],
        'url': row['url'],
        'parameter': row['parameter'],
        'payload': row['payload'],
        'payloadType': row['payload_type'],
        'riskScore': row['risk_score'],
        'severity': row['severity'],
        'errorPattern': row['error_pattern'],
        'responseTime': row['response_time'],
        'timestamp': row['created_at'],
        'evidence': row['evidence'],
        'detectionReason': row['detection_reason'] if 'detection_reason' in row.keys() else '',
    }


def serialize_request(row: Any) -> dict[str, Any]:
    return {
        'id': row['id'],
        'scanId': row['scan_id'],
        'method': row['method'],
        'url': row['url'],
        'parameters': safe_json_loads(row['parameters_json'], {}),
        'payload': row['payload'],
        'response': row['response'],
        'responseTime': row['response_time'],
        'statusCode': row['status_code'],
        'timestamp': row['created_at'],
        'detected': bool(row['detected']),
        'fingerprint': row['fingerprint'] if 'fingerprint' in row.keys() else '',
        'ruleMatches': safe_json_loads(row['rule_matches_json'], []),
    }


def serialize_activity(row: Any) -> dict[str, Any]:
    return {
        'id': row['id'],
        'type': row['type'],
        'description': row['description'],
        'status': row['status'],
        'timestamp': row['created_at'],
        'metadata': safe_json_loads(row['metadata_json'], {}) if 'metadata_json' in row.keys() else {},
    }


def cleanup_expired_sessions(connection) -> None:
    connection.execute('DELETE FROM sessions WHERE expires_at <= ?', (utc_now_iso(),))


def record_activity(
    connection,
    activity_type: str,
    description: str,
    status: str,
    metadata: dict[str, Any] | None = None,
) -> None:
    connection.execute(
        'INSERT INTO activities (id, type, description, status, created_at, metadata_json) VALUES (?, ?, ?, ?, ?, ?)',
        (
            f'activity-{uuid.uuid4().hex[:8]}',
            activity_type,
            description,
            status,
            utc_now_iso(),
            json.dumps(metadata or {}),
        ),
    )


def record_audit_event(
    connection,
    *,
    actor_id: str | None,
    event_type: str,
    severity: str,
    entity_type: str,
    entity_id: str,
    metadata: dict[str, Any] | None = None,
) -> None:
    connection.execute(
        """
        INSERT INTO audit_events (id, actor_id, event_type, severity, entity_type, entity_id, metadata_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            f'audit-{uuid.uuid4().hex[:10]}',
            actor_id,
            event_type,
            severity,
            entity_type,
            entity_id,
            json.dumps(metadata or {}),
            utc_now_iso(),
        ),
    )


def get_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail='Sessiya topilmadi.')
    scheme, _, token = authorization.partition(' ')
    if scheme.lower() != 'bearer' or not token.strip():
        raise HTTPException(status_code=401, detail="Authorization header noto'g'ri.")
    return token.strip()


def get_current_user(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    token = get_bearer_token(authorization)
    with managed_connection() as connection:
        cleanup_expired_sessions(connection)
        row = connection.execute(
            """
            SELECT u.id, u.email, u.name, u.role, s.id AS session_id, s.expires_at AS session_expires_at
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token = ?
            """,
            (token,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=401, detail='Sessiya yaroqsiz yoki muddati tugagan.')
        expires_at = parse_timestamp(row['session_expires_at'])
        if expires_at <= datetime.now(timezone.utc):
            connection.execute('DELETE FROM sessions WHERE id = ?', (row['session_id'],))
            raise HTTPException(status_code=401, detail='Sessiya muddati tugagan.')
        return {
            'user': serialize_user(row),
            'session': {
                'id': row['session_id'],
                'expiresAt': row['session_expires_at'],
            },
            'token': token,
        }


def get_recent_activity(connection, limit: int = 8) -> list[dict[str, Any]]:
    rows = connection.execute(
        'SELECT * FROM activities ORDER BY datetime(created_at) DESC LIMIT ?',
        (limit,),
    ).fetchall()
    return [serialize_activity(row) for row in rows]


def get_analytics_snapshot(connection) -> dict[str, Any]:
    base = connection.execute(
        """
        SELECT
            COUNT(*) AS total_scans,
            COALESCE(SUM(vulnerabilities_found), 0) AS total_vulnerabilities,
            COALESCE(AVG(success_rate), 0) AS avg_success_rate
        FROM scans
        """
    ).fetchone()
    severity_rows = connection.execute(
        """
        SELECT severity, COUNT(*) AS count
        FROM vulnerabilities
        GROUP BY severity
        """
    ).fetchall()
    average_response = connection.execute('SELECT COALESCE(AVG(response_time), 0) AS avg_response FROM requests').fetchone()['avg_response']
    severity_counter = {row['severity']: row['count'] for row in severity_rows}
    return {
        'totalScans': int(base['total_scans']),
        'totalVulnerabilities': int(base['total_vulnerabilities']),
        'criticalCount': int(severity_counter.get('Critical', 0)),
        'highCount': int(severity_counter.get('High', 0)),
        'mediumCount': int(severity_counter.get('Medium', 0)),
        'lowCount': int(severity_counter.get('Low', 0)),
        'averageResponseTime': round(float(average_response), 2),
        'successRate': round(float(base['avg_success_rate']), 2),
    }


def get_system_status(connection) -> dict[str, Any]:
    cleanup_expired_sessions(connection)
    snapshot = metrics_store.snapshot()
    active_sessions = connection.execute('SELECT COUNT(*) AS count FROM sessions').fetchone()['count']
    scans_total = connection.execute('SELECT COUNT(*) AS count FROM scans').fetchone()['count']
    vulnerabilities_total = connection.execute('SELECT COUNT(*) AS count FROM vulnerabilities').fetchone()['count']
    uptime_seconds = int((datetime.now(timezone.utc) - app.state.started_at).total_seconds()) if hasattr(app.state, 'started_at') else 0
    cpu_usage = min(95, round(8 + snapshot['avg_latency_ms'] / 8 + snapshot['error_rate'], 2))
    memory_usage = min(95, round(14 + scans_total * 0.25 + vulnerabilities_total * 0.12, 2))
    return {
        'cpuUsage': cpu_usage,
        'memoryUsage': memory_usage,
        'activeSessions': active_sessions,
        'uptime': max(0, uptime_seconds),
        'lastUpdate': utc_now_iso(),
    }


def build_scan_overview(
    scan: dict[str, Any],
    vulnerabilities: list[dict[str, Any]],
    requests: list[dict[str, Any]],
    parameters: list[dict[str, Any]],
) -> dict[str, Any]:
    severity_order = ['Critical', 'High', 'Medium', 'Low']
    severity_counter = Counter(item['severity'] for item in vulnerabilities)
    category_counter = Counter(item['payloadType'] for item in vulnerabilities)
    top_finding = vulnerabilities[0] if vulnerabilities else None
    average_response = round(sum(item['responseTime'] for item in requests) / len(requests), 2) if requests else 0
    average_risk = round(sum(item['riskScore'] for item in vulnerabilities) / len(vulnerabilities), 1) if vulnerabilities else 18.0
    confidence = min(99, max(40, int(scan['successRate'] + len(vulnerabilities) * 3 + len(category_counter) * 2)))
    affected_parameters = sorted({item['parameter'] for item in vulnerabilities})
    parameter_summary = [f"{item['key']} ({item['method']})" for item in parameters]

    if top_finding:
        risk_level = top_finding['severity']
        narrative = (
            f"Natijada {len(vulnerabilities)} ta signal qayd etildi. Eng yuqori xavf {top_finding['parameter']} parametri bilan bog'liq bo'lib, "
            f"{top_finding['payloadType']} kategoriyasida {top_finding['severity']} daraja va {top_finding['riskScore']} risk ball bilan belgilandi. "
            f"Skan jami {len(requests)} ta request modeli va {len(parameters)} ta parametr asosida baholandi."
        )
    else:
        risk_level = 'Low'
        narrative = (
            f"Skan heuristik rejimda {len(parameters)} ta parametr va {len(requests)} ta request modeli asosida bajarildi. "
            'Kuchli SQLi signali topilmadi, lekin input validation va prepared statement nazorati saqlab qolinishini tavsiya qilamiz.'
        )

    follow_redirects_state = "yoqilgan" if scan['followRedirects'] else "o'chirilgan"
    random_agent_state = "yoqilgan" if scan['useRandomUserAgent'] else "o'chirilgan"
    important_notes = [
        'Tahlil xavfsiz heuristik rejimda bajarildi, tizim tashqi targetga real hujum payload yubormadi.',
        f"Payload strategiyasi {scan['payloadStrategy']} va chuqurlik {scan['depth']} bo'yicha baholash o'tkazildi.",
        f"Redirect kuzatuvi: {follow_redirects_state}, random User-Agent: {random_agent_state}.",
        f"O'rtacha javob vaqti {average_response} ms, ishonch ko'rsatkichi {confidence}% deb baholandi.",
    ]
    if top_finding:
        important_notes.append(
            f"Ustuvor ko'rib chiqish uchun {top_finding['parameter']} parametri va {top_finding['payloadType']} turi bo'yicha remediation boshlash tavsiya etiladi."
        )

    return {
        'riskLevel': risk_level,
        'riskScore': average_risk,
        'confidence': confidence,
        'averageResponseTime': average_response,
        'detectedSignals': len(vulnerabilities),
        'parameterCount': len(parameters),
        'affectedParameters': affected_parameters,
        'parameterSummary': parameter_summary,
        'categories': [{'name': name, 'count': count} for name, count in category_counter.items()],
        'severityBreakdown': [
            {'name': name, 'count': severity_counter.get(name, 0)}
            for name in severity_order
            if severity_counter.get(name, 0) > 0 or name == risk_level
        ],
        'topFindings': vulnerabilities[:3],
        'narrative': narrative,
        'importantNotes': important_notes,
    }


def fetch_scan_bundle(connection, scan_id: str, request_limit: int = 200) -> dict[str, Any]:
    scan = connection.execute('SELECT * FROM scans WHERE id = ?', (scan_id,)).fetchone()
    if not scan:
        raise HTTPException(status_code=404, detail='Scan topilmadi.')
    parameter_rows = connection.execute(
        'SELECT key, value, method FROM scan_parameters WHERE scan_id = ? ORDER BY id ASC',
        (scan_id,),
    ).fetchall()
    request_rows = connection.execute(
        'SELECT * FROM requests WHERE scan_id = ? ORDER BY datetime(created_at) DESC LIMIT ?',
        (scan_id, request_limit),
    ).fetchall()
    vulnerability_rows = connection.execute(
        'SELECT * FROM vulnerabilities WHERE scan_id = ? ORDER BY risk_score DESC',
        (scan_id,),
    ).fetchall()
    scan_payload = serialize_scan(scan)
    parameters = [dict(row) for row in parameter_rows]
    requests = [serialize_request(row) for row in request_rows]
    vulnerabilities = [serialize_vulnerability(row) for row in vulnerability_rows]
    return {
        'scan': scan_payload,
        'parameters': parameters,
        'requests': requests,
        'vulnerabilities': vulnerabilities,
        'overview': build_scan_overview(scan_payload, vulnerabilities, requests, parameters),
    }


def seed_demo_scan_if_needed() -> None:
    with managed_connection() as connection:
        scan_count = connection.execute('SELECT COUNT(*) AS count FROM scans').fetchone()['count']
        if scan_count > 0:
            return
        payloads = [
            serialize_payload(row)
            for row in connection.execute('SELECT * FROM payloads WHERE enabled = 1 ORDER BY success_rate DESC').fetchall()
        ]
        findings = generate_findings(
            'https://example.com/login',
            [
                {'key': 'username', 'value': 'admin', 'method': 'POST'},
                {'key': 'password', 'value': 'secret', 'method': 'POST'},
            ],
            payloads,
            3,
            'balanced',
        )
        persist_scan_results(
            connection,
            scan_id=f'scan-{uuid.uuid4().hex[:8]}',
            target_url='https://example.com/login',
            parameters=[
                {'key': 'username', 'value': 'admin', 'method': 'POST'},
                {'key': 'password', 'value': 'secret', 'method': 'POST'},
            ],
            findings=findings,
            depth=3,
            payload_strategy='balanced',
            follow_redirects=True,
            use_random_user_agent=True,
        )


@app.on_event('startup')
def on_startup() -> None:
    app.state.started_at = datetime.now(timezone.utc)
    initialize_database()
    seed_database()
    seed_demo_scan_if_needed()
    log_event(
        logger,
        logging.INFO,
        'backend_startup_complete',
        env=config.app_env,
        version=config.app_version,
        db_path=str(config.db_path),
    )


@app.get('/api/health')
def health() -> dict[str, str]:
    return {'status': 'ok', 'version': config.app_version}


@app.get('/api/health/live')
def live_health() -> dict[str, str]:
    return {'status': 'alive'}


@app.get('/api/health/ready')
def ready_health() -> dict[str, str]:
    try:
        with managed_connection() as connection:
            connection.execute('SELECT 1').fetchone()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f'Database ready emas: {exc}') from exc
    return {'status': 'ready'}


@app.get('/api/metrics')
def metrics_endpoint() -> PlainTextResponse:
    if not config.enable_metrics:
        raise HTTPException(status_code=404, detail='Metrics o‘chirilgan.')
    return PlainTextResponse(content=metrics_store.render_prometheus(), media_type='text/plain; version=0.0.4')

    

@app.get('/api/observability')
def observability(_current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    with managed_connection() as connection:
        return {
            'metrics': metrics_store.snapshot(),
            'systemStatus': get_system_status(connection),
        }


@app.post('/api/auth/register')
def register(payload: RegisterRequest) -> dict[str, Any]:
    with managed_connection() as connection:
        cleanup_expired_sessions(connection)
        existing = connection.execute('SELECT id FROM users WHERE email = ?', (payload.email,)).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail='Bu email allaqachon mavjud.')
        user_id = f'user-{uuid.uuid4().hex[:8]}'
        connection.execute(
            'INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            (user_id, payload.email, payload.name, hash_password(payload.password), 'analyst', utc_now_iso()),
        )
        token = generate_token()
        connection.execute(
            'INSERT INTO sessions (id, user_id, token, created_at, expires_at) VALUES (?, ?, ?, ?, ?)',
            (f'session-{uuid.uuid4().hex[:8]}', user_id, token, utc_now_iso(), session_expiry_iso()),
        )
        record_activity(connection, 'user_registered', f"{payload.email} foydalanuvchisi ro'yxatdan o'tdi", 'success')
        record_audit_event(
            connection,
            actor_id=user_id,
            event_type='user.register',
            severity='info',
            entity_type='user',
            entity_id=user_id,
            metadata={'email': payload.email},
        )
        return {'token': token, 'user': {'id': user_id, 'email': payload.email, 'name': payload.name, 'role': 'analyst'}}


@app.post('/api/auth/login')
def login(payload: LoginRequest) -> dict[str, Any]:
    with managed_connection() as connection:
        cleanup_expired_sessions(connection)
        user = connection.execute('SELECT * FROM users WHERE email = ?', (payload.email,)).fetchone()
        if not user or not verify_password(payload.password, user['password_hash']):
            record_activity(connection, 'user_login_failed', f"{payload.email} uchun login urinish muvaffaqiyatsiz", 'warning')
            raise HTTPException(status_code=401, detail="Email yoki parol noto'g'ri.")
        token = generate_token()
        connection.execute(
            'INSERT INTO sessions (id, user_id, token, created_at, expires_at) VALUES (?, ?, ?, ?, ?)',
            (f'session-{uuid.uuid4().hex[:8]}', user['id'], token, utc_now_iso(), session_expiry_iso()),
        )
        record_activity(connection, 'user_login', f"{user['email']} tizimga kirdi", 'success')
        record_audit_event(
            connection,
            actor_id=user['id'],
            event_type='user.login',
            severity='info',
            entity_type='session',
            entity_id=token[:12],
            metadata={'email': user['email']},
        )
        return {
            'token': token,
            'user': {'id': user['id'], 'email': user['email'], 'name': user['name'], 'role': user['role']},
        }


@app.get('/api/auth/me')
def auth_me(current_session: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return current_session


@app.post('/api/auth/logout')
def logout(current_session: dict[str, Any] = Depends(get_current_user)) -> dict[str, str]:
    with managed_connection() as connection:
        connection.execute('DELETE FROM sessions WHERE id = ?', (current_session['session']['id'],))
        record_activity(connection, 'user_logout', f"{current_session['user']['email']} tizimdan chiqdi", 'info')
        record_audit_event(
            connection,
            actor_id=current_session['user']['id'],
            event_type='user.logout',
            severity='info',
            entity_type='session',
            entity_id=current_session['session']['id'],
            metadata={},
        )
        return {'message': 'Sessiya yakunlandi.'}


@app.post('/api/auth/forgot-password')
def forgot_password(payload: ForgotPasswordRequest) -> dict[str, str]:
    with managed_connection() as connection:
        record_activity(connection, 'password_reset_requested', 'Parol tiklash so‘rovi qabul qilindi', 'info')
    return {'message': f'{payload.email} uchun tiklash havolasi navbatga qo‘yildi.'}


@app.get('/api/dashboard/summary')
def dashboard_summary(_current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    with managed_connection() as connection:
        analytics = get_analytics_snapshot(connection)
        scans = [
            serialize_scan(row)
            for row in connection.execute('SELECT * FROM scans ORDER BY datetime(created_at) DESC LIMIT 5').fetchall()
        ]
        return {
            'analytics': analytics,
            'systemStatus': get_system_status(connection),
            'recentActivity': get_recent_activity(connection, 6),
            'recentScans': scans,
        }


@app.get('/api/scans')
def list_scans(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0, le=20_000),
    _current_user: dict[str, Any] = Depends(get_current_user),
) -> list[dict[str, Any]]:
    with managed_connection() as connection:
        rows = connection.execute(
            'SELECT * FROM scans ORDER BY datetime(created_at) DESC LIMIT ? OFFSET ?',
            (limit, offset),
        ).fetchall()
        return [serialize_scan(row) for row in rows]


@app.post('/api/scans')
def create_scan(payload: ScanCreateRequest, current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    with managed_connection() as connection:
        enabled_payloads = [
            serialize_payload(row)
            for row in connection.execute('SELECT * FROM payloads WHERE enabled = 1 ORDER BY success_rate DESC').fetchall()
        ]
        if not enabled_payloads:
            raise HTTPException(status_code=400, detail='Faol payload topilmadi.')
        findings = generate_findings(
            str(payload.target_url),
            [item.model_dump() for item in payload.parameters],
            enabled_payloads,
            payload.depth,
            payload.payload_strategy,
        )
        scan_id = f'scan-{uuid.uuid4().hex[:8]}'
        persist_scan_results(
            connection,
            scan_id=scan_id,
            target_url=str(payload.target_url),
            parameters=[item.model_dump() for item in payload.parameters],
            findings=findings,
            depth=payload.depth,
            payload_strategy=payload.payload_strategy,
            follow_redirects=payload.follow_redirects,
            use_random_user_agent=payload.use_random_user_agent,
        )
        detected_findings = [finding for finding in findings if finding.detected]
        for finding in detected_findings:
            metrics_store.record_suspicious_signal(finding.payload_type)
        record_audit_event(
            connection,
            actor_id=current_user['user']['id'],
            event_type='scan.create',
            severity='info',
            entity_type='scan',
            entity_id=scan_id,
            metadata={
                'target': str(payload.target_url),
                'depth': payload.depth,
                'detected': len(detected_findings),
            },
        )
        bundle = fetch_scan_bundle(connection, scan_id)
        return {
            'scan': bundle['scan'],
            'requests': len(bundle['requests']),
            'vulnerabilities': len(bundle['vulnerabilities']),
            'overview': bundle['overview'],
        }


@app.get('/api/scans/{scan_id}')
def get_scan(
    scan_id: str,
    request_limit: int = Query(default=200, ge=1, le=1000),
    _current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    with managed_connection() as connection:
        return fetch_scan_bundle(connection, scan_id, request_limit=request_limit)


@app.get('/api/payloads')
def list_payloads(
    payload_type: str | None = None,
    _current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    with managed_connection() as connection:
        if payload_type and payload_type != 'All':
            rows = connection.execute('SELECT * FROM payloads WHERE type = ? ORDER BY success_rate DESC', (payload_type,)).fetchall()
        else:
            rows = connection.execute('SELECT * FROM payloads ORDER BY success_rate DESC').fetchall()
        payloads = [serialize_payload(row) for row in rows]
        return {
            'payloads': payloads,
            'stats': {
                'total': len(payloads),
                'enabled': len([item for item in payloads if item['enabled']]),
                'averageSuccess': round(sum(item['successRate'] for item in payloads) / len(payloads), 2) if payloads else 0,
            },
        }


@app.post('/api/payloads')
def create_payload(payload: PayloadCreateRequest, current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    with managed_connection() as connection:
        payload_id = f'payload-{uuid.uuid4().hex[:8]}'
        connection.execute(
            'INSERT INTO payloads (id, type, payload, success_rate, description, category, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            (payload_id, payload.type, payload.payload, payload.success_rate, payload.description, payload.category, int(payload.enabled), utc_now_iso()),
        )
        record_activity(connection, 'payload_created', f"{payload.type} turidagi payload qo'shildi", 'success')
        record_audit_event(
            connection,
            actor_id=current_user['user']['id'],
            event_type='payload.create',
            severity='info',
            entity_type='payload',
            entity_id=payload_id,
            metadata={'type': payload.type},
        )
        row = connection.execute('SELECT * FROM payloads WHERE id = ?', (payload_id,)).fetchone()
        return {'payload': serialize_payload(row)}


@app.patch('/api/payloads/{payload_id}')
def update_payload(payload_id: str, payload: PayloadUpdateRequest, current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    with managed_connection() as connection:
        connection.execute('UPDATE payloads SET enabled = ? WHERE id = ?', (int(payload.enabled), payload_id))
        row = connection.execute('SELECT * FROM payloads WHERE id = ?', (payload_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail='Payload topilmadi.')
        record_activity(connection, 'payload_updated', f"{row['type']} payload holati yangilandi", 'info')
        record_audit_event(
            connection,
            actor_id=current_user['user']['id'],
            event_type='payload.update',
            severity='info',
            entity_type='payload',
            entity_id=payload_id,
            metadata={'enabled': payload.enabled},
        )
        return {'payload': serialize_payload(row)}


@app.get('/api/monitor')
def monitor(
    scan_id: str | None = None,
    limit: int = Query(default=50, ge=1, le=500),
    _current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    with managed_connection() as connection:
        if not scan_id:
            latest_scan = connection.execute('SELECT id FROM scans ORDER BY datetime(created_at) DESC LIMIT 1').fetchone()
            scan_id = latest_scan['id'] if latest_scan else None
        if not scan_id:
            return {'requests': [], 'stats': {'totalRequests': 0, 'detected': 0, 'averageResponseTime': 0, 'errorRate': 0}, 'progress': {}}
        request_rows = connection.execute(
            'SELECT * FROM requests WHERE scan_id = ? ORDER BY datetime(created_at) DESC LIMIT ?',
            (scan_id, limit),
        ).fetchall()
        requests = [serialize_request(row) for row in request_rows]
        total_requests = len(requests)
        detected = len([item for item in requests if item['detected']])
        avg_response = round(sum(item['responseTime'] for item in requests) / total_requests, 2) if requests else 0
        error_rate = round((len([item for item in requests if item['statusCode'] >= 500]) / total_requests) * 100, 2) if requests else 0
        return {
            'requests': requests,
            'stats': {
                'totalRequests': total_requests,
                'detected': detected,
                'averageResponseTime': avg_response,
                'errorRate': error_rate,
            },
            'progress': {
                'collected': min(100, 45 + total_requests * 4),
                'analyzed': min(100, 35 + detected * 10),
                'flagged': min(100, 20 + detected * 12),
            },
        }


@app.get('/api/analytics')
def analytics(_current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    with managed_connection() as connection:
        analytics_data = get_analytics_snapshot(connection)
        timeline_rows = connection.execute(
            """
            SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS scans, COALESCE(SUM(vulnerabilities_found), 0) AS vulnerabilities
            FROM scans
            GROUP BY day
            ORDER BY day ASC
            LIMIT 14
            """
        ).fetchall()
        payload_effectiveness_rows = connection.execute(
            'SELECT type, AVG(success_rate) AS avg_success FROM payloads GROUP BY type'
        ).fetchall()
        vulnerabilities = [
            serialize_vulnerability(row)
            for row in connection.execute('SELECT * FROM vulnerabilities ORDER BY datetime(created_at) DESC LIMIT 25').fetchall()
        ]
        return {
            'analytics': analytics_data,
            'timeline': [
                {'name': parse_timestamp(f"{row['day']}T00:00:00+00:00").strftime('%d-%m'), 'scans': row['scans'], 'vulnerabilities': row['vulnerabilities']}
                for row in timeline_rows
            ],
            'severityDistribution': [
                {'name': key, 'value': analytics_data[f'{key.lower()}Count']}
                for key in ['Critical', 'High', 'Medium', 'Low']
            ],
            'payloadEffectiveness': [
                {'name': row['type'], 'success': round(row['avg_success'], 2)}
                for row in payload_effectiveness_rows
            ],
            'detectionTrend': [
                {'time': parse_timestamp(item['timestamp']).strftime('%H:%M'), 'detected': 1 if item['riskScore'] >= 55 else 0, 'missed': 0 if item['riskScore'] >= 55 else 1}
                for item in vulnerabilities[:8]
            ],
        }


@app.get('/api/reports')
def reports(
    search: str = '',
    severity: str = 'All',
    limit: int = Query(default=200, ge=1, le=5000),
    offset: int = Query(default=0, ge=0, le=20_000),
    _current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    with managed_connection() as connection:
        normalized_query = f"%{search.lower()}%"
        if severity != 'All':
            rows = connection.execute(
                """
                SELECT * FROM vulnerabilities
                WHERE severity = ?
                  AND (? = '' OR lower(url) LIKE ? OR lower(parameter) LIKE ? OR lower(payload_type) LIKE ?)
                ORDER BY risk_score DESC
                LIMIT ? OFFSET ?
                """,
                (severity, search, normalized_query, normalized_query, normalized_query, limit, offset),
            ).fetchall()
            stat_rows = connection.execute(
                """
                SELECT severity, COUNT(*) AS count FROM vulnerabilities
                WHERE severity = ?
                  AND (? = '' OR lower(url) LIKE ? OR lower(parameter) LIKE ? OR lower(payload_type) LIKE ?)
                GROUP BY severity
                """,
                (severity, search, normalized_query, normalized_query, normalized_query),
            ).fetchall()
        else:
            rows = connection.execute(
                """
                SELECT * FROM vulnerabilities
                WHERE (? = '' OR lower(url) LIKE ? OR lower(parameter) LIKE ? OR lower(payload_type) LIKE ?)
                ORDER BY risk_score DESC
                LIMIT ? OFFSET ?
                """,
                (search, normalized_query, normalized_query, normalized_query, limit, offset),
            ).fetchall()
            stat_rows = connection.execute(
                """
                SELECT severity, COUNT(*) AS count FROM vulnerabilities
                WHERE (? = '' OR lower(url) LIKE ? OR lower(parameter) LIKE ? OR lower(payload_type) LIKE ?)
                GROUP BY severity
                """,
                (search, normalized_query, normalized_query, normalized_query),
            ).fetchall()

        vulnerabilities = [serialize_vulnerability(row) for row in rows]
        stats_counter = {row['severity']: row['count'] for row in stat_rows}
        return {
            'vulnerabilities': vulnerabilities,
            'stats': {
                'total': sum(stats_counter.values()),
                'critical': stats_counter.get('Critical', 0),
                'high': stats_counter.get('High', 0),
                'medium': stats_counter.get('Medium', 0),
                'low': stats_counter.get('Low', 0),
            },
        }


@app.get('/api/reports/export')
def export_reports(
    format: str = Query(default='json', pattern='^(json|csv|pdf)$'),
    _current_user: dict[str, Any] = Depends(get_current_user),
):
    with managed_connection() as connection:
        vulnerabilities = [
            serialize_vulnerability(row)
            for row in connection.execute(
                'SELECT * FROM vulnerabilities ORDER BY risk_score DESC LIMIT ?',
                (config.max_report_export_rows,),
            ).fetchall()
        ]
        if format == 'json':
            content = json.dumps(vulnerabilities, indent=2).encode('utf-8')
            return StreamingResponse(
                io.BytesIO(content),
                media_type='application/json',
                headers={'Content-Disposition': 'attachment; filename=reports.json'},
            )

        if format == 'csv':
            buffer = io.StringIO()
            writer = csv.DictWriter(
                buffer,
                fieldnames=['id', 'scanId', 'url', 'parameter', 'payloadType', 'severity', 'riskScore', 'responseTime', 'detectionReason'],
            )
            writer.writeheader()
            for item in vulnerabilities:
                writer.writerow({key: item.get(key, '') for key in writer.fieldnames})
            return StreamingResponse(
                io.BytesIO(buffer.getvalue().encode('utf-8')),
                media_type='text/csv',
                headers={'Content-Disposition': 'attachment; filename=reports.csv'},
            )

        pdf_buffer = io.BytesIO()
        pdf = canvas.Canvas(pdf_buffer, pagesize=A4)
        _width, height = A4
        y = height - 50
        pdf.setTitle('SQLI Sentinel Report')
        pdf.setFont('Helvetica-Bold', 16)
        pdf.drawString(40, y, 'SQLI Sentinel Vulnerability Report')
        y -= 28
        pdf.setFont('Helvetica', 10)
        for item in vulnerabilities[: min(50, len(vulnerabilities))]:
            if y < 80:
                pdf.showPage()
                y = height - 50
                pdf.setFont('Helvetica', 10)
            pdf.drawString(40, y, f"{item['severity']} | {item['parameter']} | score {item['riskScore']}")
            y -= 14
            pdf.drawString(52, y, item['url'][:95])
            y -= 18
        pdf.save()
        pdf_buffer.seek(0)
        return StreamingResponse(
            pdf_buffer,
            media_type='application/pdf',
            headers={'Content-Disposition': 'attachment; filename=reports.pdf'},
        )


@app.get('/api/settings')
def get_settings(_current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    with managed_connection() as connection:
        settings = connection.execute('SELECT * FROM settings WHERE id = 1').fetchone()
        api_keys = connection.execute('SELECT * FROM api_keys WHERE active = 1 ORDER BY datetime(created_at) DESC').fetchall()
        return {
            'settings': {
                'timeout': settings['timeout'],
                'requestRate': settings['request_rate'],
                'payloadStrategy': settings['payload_strategy'],
                'riskScoringModel': settings['risk_scoring_model'],
                'followRedirects': bool(settings['follow_redirects']),
                'useRandomUserAgent': bool(settings['use_random_user_agent']),
                'verifySsl': bool(settings['verify_ssl']),
                'notifyCritical': bool(settings['notify_critical']),
                'notifyScanComplete': bool(settings['notify_scan_complete']),
                'notifyWeekly': bool(settings['notify_weekly']),
            },
            'apiKeys': [
                {'id': row['id'], 'name': row['name'], 'tokenPreview': mask_token(row['token']), 'createdAt': row['created_at']}
                for row in api_keys
            ],
        }


@app.put('/api/settings')
def update_settings(payload: SettingsUpdateRequest, current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    with managed_connection() as connection:
        connection.execute(
            """
            UPDATE settings
            SET timeout = ?, request_rate = ?, payload_strategy = ?, risk_scoring_model = ?,
                follow_redirects = ?, use_random_user_agent = ?, verify_ssl = ?,
                notify_critical = ?, notify_scan_complete = ?, notify_weekly = ?
            WHERE id = 1
            """,
            (
                payload.timeout,
                payload.request_rate,
                payload.payload_strategy,
                payload.risk_scoring_model,
                int(payload.follow_redirects),
                int(payload.use_random_user_agent),
                int(payload.verify_ssl),
                int(payload.notify_critical),
                int(payload.notify_scan_complete),
                int(payload.notify_weekly),
            ),
        )
        record_activity(connection, 'settings_updated', 'Platform sozlamalari yangilandi', 'success')
        record_audit_event(
            connection,
            actor_id=current_user['user']['id'],
            event_type='settings.update',
            severity='info',
            entity_type='settings',
            entity_id='1',
            metadata=payload.model_dump(),
        )
        return {'message': 'Sozlamalar saqlandi.'}


@app.post('/api/settings/api-keys')
def create_api_key(payload: ApiKeyCreateRequest, current_session: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    with managed_connection() as connection:
        key_id = f'key-{uuid.uuid4().hex[:8]}'
        token = generate_token()
        connection.execute(
            'INSERT INTO api_keys (id, user_id, name, token, active, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            (key_id, current_session['user']['id'], payload.name, token, 1, utc_now_iso()),
        )
        record_activity(connection, 'api_key_created', f"{payload.name} nomli API kaliti yaratildi", 'success')
        record_audit_event(
            connection,
            actor_id=current_session['user']['id'],
            event_type='apikey.create',
            severity='high',
            entity_type='apikey',
            entity_id=key_id,
            metadata={'name': payload.name},
        )
        return {'apiKey': {'id': key_id, 'name': payload.name, 'token': token}}


@app.delete('/api/settings/api-keys/{key_id}')
def delete_api_key(key_id: str, current_session: dict[str, Any] = Depends(get_current_user)) -> dict[str, str]:
    with managed_connection() as connection:
        connection.execute('UPDATE api_keys SET active = 0 WHERE id = ?', (key_id,))
        record_activity(connection, 'api_key_revoked', f'{key_id} API kaliti bekor qilindi', 'info')
        record_audit_event(
            connection,
            actor_id=current_session['user']['id'],
            event_type='apikey.revoke',
            severity='high',
            entity_type='apikey',
            entity_id=key_id,
            metadata={},
        )
        return {'message': 'API kaliti bekor qilindi.'}


@app.get('/api/audit/events')
def list_audit_events(
    limit: int = Query(default=100, ge=1, le=1000),
    _current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    with managed_connection() as connection:
        rows = connection.execute(
            'SELECT * FROM audit_events ORDER BY datetime(created_at) DESC LIMIT ?',
            (limit,),
        ).fetchall()
        return {
            'events': [
                {
                    'id': row['id'],
                    'actorId': row['actor_id'],
                    'eventType': row['event_type'],
                    'severity': row['severity'],
                    'entityType': row['entity_type'],
                    'entityId': row['entity_id'],
                    'metadata': safe_json_loads(row['metadata_json'], {}),
                    'timestamp': row['created_at'],
                }
                for row in rows
            ]
        }


@app.post('/api/ai/prompt-optimizer')
def ai_prompt_optimizer(payload: AiPromptOptimizeRequest, _current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    response = request_prompt_optimization(mode=payload.mode, target=payload.target, prompt=payload.prompt)
    return {
        'provider': response['provider'],
        'model': response['model'],
        'optimizedPrompt': response['optimizedPrompt'],
        'improvements': response['improvements'],
    }


@app.post('/api/ai/recommendations')
def ai_recommendations(payload: AiRecommendationRequest, _current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    with managed_connection() as connection:
        findings_query = 'SELECT * FROM vulnerabilities ORDER BY risk_score DESC LIMIT 5'
        params: tuple[Any, ...] = ()
        if payload.top_finding_id:
            findings_query = (
                'SELECT * FROM vulnerabilities WHERE id = ? '
                'UNION ALL SELECT * FROM vulnerabilities WHERE id != ? ORDER BY risk_score DESC LIMIT 5'
            )
            params = (payload.top_finding_id, payload.top_finding_id)
        findings = [serialize_vulnerability(row) for row in connection.execute(findings_query, params).fetchall()]
        monitor_items = [
            serialize_request(row)
            for row in connection.execute('SELECT * FROM requests ORDER BY datetime(created_at) DESC LIMIT 5').fetchall()
        ]
        response = request_gemini_recommendation(
            mode=payload.mode,
            target=payload.target,
            prompt=payload.prompt,
            findings=findings,
            monitor_items=monitor_items if payload.include_monitor_data else [],
        )
        return {
            'provider': response['provider'],
            'model': response['model'],
            'recommendations': response['recommendations'],
            'context': {
                'topFinding': findings[0] if findings else None,
                'monitorItems': monitor_items,
            },
        }


# ── SQL Injection Detection ─────────────────────────────────────────────────────

_DETECT_RULES: dict[str, dict[str, Any]] = {
    'comment_sequence': {
        'pattern': re.compile(r'(--|#|/\*)'),
        'weight': 10,
        'label': 'SQL Comment Sequence',
        'description': 'SQL comment belgilari topildi (-- , # yoki /*). Bu belgilar qolgan SQL kodini izohga aylantirish uchun ishlatiladi.',
    },
    'union_select': {
        'pattern': re.compile(r'\bunion\b\s+\bselect\b', re.IGNORECASE),
        'weight': 25,
        'label': 'UNION SELECT Pattern',
        'description': 'UNION SELECT pattern aniqlandi. Bu SQL natijalariga qo\'shimcha ma\'lumot qo\'shish uchun ishlatiladi.',
    },
    'boolean_tautology': {
        'pattern': re.compile(r"('\"|\")?\s*(or|and)\s+['\"]?\d+['\"]?\s*=\s*['\"]?\d+['\"]?", re.IGNORECASE),
        'weight': 22,
        'label': 'Boolean Tautology',
        'description': 'Boolean tautologiya aniqlandi (masalan: OR 1=1). Bu autentifikatsiyani chetlab o\'tish uchun ishlatiladi.',
    },
    'stacked_query': {
        'pattern': re.compile(r';\s*(select|insert|update|delete|drop|alter|create)\b', re.IGNORECASE),
        'weight': 28,
        'label': 'Stacked Query',
        'description': 'Stacked query (ko\'p so\'rov) pattern aniqlandi. Bu bitta inputda bir nechta SQL buyruqlarini bajarish uchun ishlatiladi.',
    },
    'time_delay': {
        'pattern': re.compile(r'\b(sleep|pg_sleep|benchmark|waitfor\s+delay)\s*\(', re.IGNORECASE),
        'weight': 20,
        'label': 'Time Delay Function',
        'description': 'Vaqtga asoslangan SQL funksiyalar topildi (SLEEP, BENCHMARK va h.k.). Bu blind SQL injection uchun ishlatiladi.',
    },
    'information_schema': {
        'pattern': re.compile(r'\binformation_schema\b', re.IGNORECASE),
        'weight': 18,
        'label': 'Information Schema Access',
        'description': 'information_schema jadvaliga murojaat aniqlandi. Bu ma\'lumotlar bazasi tuzilmasini o\'rganish uchun ishlatiladi.',
    },
    'hex_encoding': {
        'pattern': re.compile(r'0x[0-9a-fA-F]{2,}'),
        'weight': 12,
        'label': 'Hex Encoding',
        'description': 'Hexadecimal kodlash aniqlandi. Bu WAF (Web Application Firewall) ni chetlab o\'tish uchun ishlatiladi.',
    },
}


def _severity_label(score: int) -> str:
    if score >= 85:
        return 'Critical'
    if score >= 65:
        return 'High'
    if score >= 40:
        return 'Medium'
    return 'Low'


@app.post('/api/detect')
def detect_sqli(payload: DetectRequest, _current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    """Foydalanuvchi kiritgan matnni SQL injection patternlari uchun tekshiradi."""
    user_input = payload.input
    matched_rules: list[dict[str, Any]] = []
    total_weight = 0

    for rule_name, rule_config in _DETECT_RULES.items():
        matches = rule_config['pattern'].findall(user_input)
        if matches:
            weight = rule_config['weight']
            total_weight += weight
            matched_rules.append({
                'rule': rule_name,
                'label': rule_config['label'],
                'description': rule_config['description'],
                'matchCount': len(matches),
                'weight': weight,
            })

    risk_score = min(98, total_weight + len(matched_rules) * 5)
    detected = risk_score >= 15
    severity = _severity_label(risk_score)

    if detected:
        rule_labels = [r['label'] for r in matched_rules]
        analysis = (
            f"Kiritilgan matnda {len(matched_rules)} ta SQL injection pattern aniqlandi: "
            f"{', '.join(rule_labels)}. "
            f"Umumiy xavf darajasi {severity} ({risk_score} ball) deb baholandi. "
            'Bu turdagi inputlarni filtrlash va prepared statements ishlatish tavsiya etiladi.'
        )
    else:
        analysis = (
            'Kiritilgan matnda kuchli SQL injection signali topilmadi. '
            'Shunga qaramay, barcha foydalanuvchi inputlarini sanitize qilish va parametrli so\'rovlardan foydalanish tavsiya etiladi.'
        )

    log_event(logger, 'sqli_detection', input_length=len(user_input), detected=detected, risk_score=risk_score, severity=severity)

    return {
        'detected': detected,
        'riskScore': risk_score,
        'severity': severity,
        'matchedRules': matched_rules,
        'analysis': analysis,
        'inputLength': len(user_input),
    }
