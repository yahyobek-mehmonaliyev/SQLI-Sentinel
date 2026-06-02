from __future__ import annotations

import csv
import io
import json
import uuid
from collections import Counter
from datetime import datetime, timezone
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from backend.app.core.database import initialize_database, managed_connection
from backend.app.core.security import (
    generate_token,
    hash_password,
    mask_token,
    session_expiry_iso,
    utc_now_iso,
    verify_password,
)
from backend.app.models.schemas import (
    AiPromptOptimizeRequest,
    AiRecommendationRequest,
    ApiKeyCreateRequest,
    ForgotPasswordRequest,
    LoginRequest,
    PayloadCreateRequest,
    PayloadUpdateRequest,
    RegisterRequest,
    ScanCreateRequest,
    SettingsUpdateRequest,
)
from backend.app.services.ai import request_gemini_recommendation, request_prompt_optimization
from backend.app.services.scanner import generate_findings, persist_scan_results
from backend.app.services.seed import seed_database


app = FastAPI(title='SQLI Sentinel Backend', version='1.1.0')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


def parse_timestamp(value: str) -> datetime:
    return datetime.fromisoformat(value)


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
    }


def serialize_request(row: Any) -> dict[str, Any]:
    return {
        'id': row['id'],
        'scanId': row['scan_id'],
        'method': row['method'],
        'url': row['url'],
        'parameters': json.loads(row['parameters_json']),
        'payload': row['payload'],
        'response': row['response'],
        'responseTime': row['response_time'],
        'statusCode': row['status_code'],
        'timestamp': row['created_at'],
        'detected': bool(row['detected']),
    }


def serialize_activity(row: Any) -> dict[str, Any]:
    return {
        'id': row['id'],
        'type': row['type'],
        'description': row['description'],
        'status': row['status'],
        'timestamp': row['created_at'],
    }


def cleanup_expired_sessions(connection) -> None:
    connection.execute('DELETE FROM sessions WHERE expires_at <= ?', (utc_now_iso(),))


def record_activity(connection, activity_type: str, description: str, status: str) -> None:
    connection.execute(
        'INSERT INTO activities (id, type, description, status, created_at) VALUES (?, ?, ?, ?, ?)',
        (f'activity-{uuid.uuid4().hex[:8]}', activity_type, description, status, utc_now_iso()),
    )


def get_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail='Sessiya topilmadi.')
    scheme, _, token = authorization.partition(' ')
    if scheme.lower() != 'bearer' or not token.strip():
        raise HTTPException(status_code=401, detail='Authorization header noto\'g\'ri.')
    return token.strip()


def get_current_user(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    token = get_bearer_token(authorization)
    with managed_connection() as connection:
        cleanup_expired_sessions(connection)
        row = connection.execute(
            '''
            SELECT u.id, u.email, u.name, u.role, s.id AS session_id, s.expires_at AS session_expires_at
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token = ?
            ''',
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
    scan_count = connection.execute('SELECT COUNT(*) AS count FROM scans').fetchone()['count']
    vulnerabilities = connection.execute('SELECT * FROM vulnerabilities').fetchall()
    requests = connection.execute('SELECT * FROM requests').fetchall()
    severities = Counter(row['severity'] for row in vulnerabilities)
    avg_response = round(sum(row['response_time'] for row in requests) / len(requests), 2) if requests else 0
    success_rate = round(sum(row['success_rate'] for row in connection.execute('SELECT success_rate FROM scans').fetchall()) / scan_count, 2) if scan_count else 0

    return {
        'totalScans': scan_count,
        'totalVulnerabilities': len(vulnerabilities),
        'criticalCount': severities.get('Critical', 0),
        'highCount': severities.get('High', 0),
        'mediumCount': severities.get('Medium', 0),
        'lowCount': severities.get('Low', 0),
        'averageResponseTime': avg_response,
        'successRate': success_rate,
    }


def get_system_status(connection) -> dict[str, Any]:
    cleanup_expired_sessions(connection)
    requests_total = connection.execute('SELECT COUNT(*) AS count FROM requests').fetchone()['count']
    scans_total = connection.execute('SELECT COUNT(*) AS count FROM scans').fetchone()['count']
    vulnerabilities_total = connection.execute('SELECT COUNT(*) AS count FROM vulnerabilities').fetchone()['count']
    cpu_usage = min(82, 18 + requests_total * 3)
    memory_usage = min(88, 24 + scans_total * 7 + vulnerabilities_total * 2)
    active_sessions = connection.execute('SELECT COUNT(*) AS count FROM sessions').fetchone()['count']
    return {
        'cpuUsage': cpu_usage,
        'memoryUsage': memory_usage,
        'activeSessions': active_sessions,
        'uptime': 432000,
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
    confidence = min(99, max(42, int(scan['successRate'] + len(vulnerabilities) * 4 + len(category_counter) * 2)))
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
            "Kuchli SQLi signali topilmadi, lekin input validation va prepared statement nazorati saqlab qolinishini tavsiya qilamiz."
        )

    important_notes = [
        'Tahlil xavfsiz heuristik rejimda bajarildi, tizim tashqi targetga real hujum payload yubormadi.',
        f"Payload strategiyasi {scan['payloadStrategy']} va chuqurlik {scan['depth']} bo'yicha baholash o'tkazildi.",
        f"Redirect kuzatuvi: {'yoqilgan' if scan['followRedirects'] else "o'chirilgan"}, random User-Agent: {'yoqilgan' if scan['useRandomUserAgent'] else "o'chirilgan"}.",
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


def fetch_scan_bundle(connection, scan_id: str) -> dict[str, Any]:
    scan = connection.execute('SELECT * FROM scans WHERE id = ?', (scan_id,)).fetchone()
    if not scan:
        raise HTTPException(status_code=404, detail='Scan topilmadi.')
    parameter_rows = connection.execute(
        'SELECT key, value, method FROM scan_parameters WHERE scan_id = ? ORDER BY id ASC',
        (scan_id,),
    ).fetchall()
    request_rows = connection.execute(
        'SELECT * FROM requests WHERE scan_id = ? ORDER BY datetime(created_at) DESC',
        (scan_id,),
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
        payloads = [serialize_payload(row) for row in connection.execute('SELECT * FROM payloads WHERE enabled = 1 ORDER BY success_rate DESC').fetchall()]
        findings = generate_findings(
            'https://example.com/login',
            [{'key': 'username', 'value': 'admin', 'method': 'POST'}, {'key': 'password', 'value': 'secret', 'method': 'POST'}],
            payloads,
            3,
            'balanced',
        )
        persist_scan_results(
            connection,
            scan_id=f'scan-{uuid.uuid4().hex[:8]}',
            target_url='https://example.com/login',
            parameters=[{'key': 'username', 'value': 'admin', 'method': 'POST'}, {'key': 'password', 'value': 'secret', 'method': 'POST'}],
            findings=findings,
            depth=3,
            payload_strategy='balanced',
            follow_redirects=True,
            use_random_user_agent=True,
        )


@app.on_event('startup')
def on_startup() -> None:
    initialize_database()
    seed_database()
    seed_demo_scan_if_needed()


@app.get('/api/health')
def health() -> dict[str, str]:
    return {'status': 'ok'}


@app.post('/api/auth/register')
def register(payload: RegisterRequest) -> dict[str, Any]:
    with managed_connection() as connection:
        cleanup_expired_sessions(connection)
        existing = connection.execute('SELECT id FROM users WHERE email = ?', (payload.email.lower(),)).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail='Bu email allaqachon mavjud.')
        user_id = f'user-{uuid.uuid4().hex[:8]}'
        connection.execute(
            'INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            (user_id, payload.email.lower(), payload.name, hash_password(payload.password), 'analyst', utc_now_iso()),
        )
        token = generate_token()
        connection.execute(
            'INSERT INTO sessions (id, user_id, token, created_at, expires_at) VALUES (?, ?, ?, ?, ?)',
            (f'session-{uuid.uuid4().hex[:8]}', user_id, token, utc_now_iso(), session_expiry_iso()),
        )
        record_activity(connection, 'user_registered', f"{payload.email.lower()} foydalanuvchisi ro'yxatdan o'tdi", 'success')
        return {'token': token, 'user': {'id': user_id, 'email': payload.email.lower(), 'name': payload.name, 'role': 'analyst'}}


@app.post('/api/auth/login')
def login(payload: LoginRequest) -> dict[str, Any]:
    with managed_connection() as connection:
        cleanup_expired_sessions(connection)
        user = connection.execute('SELECT * FROM users WHERE email = ?', (payload.email.lower(),)).fetchone()
        if not user or not verify_password(payload.password, user['password_hash']):
            raise HTTPException(status_code=401, detail='Email yoki parol noto\'g\'ri.')
        token = generate_token()
        connection.execute(
            'INSERT INTO sessions (id, user_id, token, created_at, expires_at) VALUES (?, ?, ?, ?, ?)',
            (f'session-{uuid.uuid4().hex[:8]}', user['id'], token, utc_now_iso(), session_expiry_iso()),
        )
        record_activity(connection, 'user_login', f"{user['email']} tizimga kirdi", 'success')
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
        return {'message': 'Sessiya yakunlandi.'}


@app.post('/api/auth/forgot-password')
def forgot_password(payload: ForgotPasswordRequest) -> dict[str, str]:
    with managed_connection() as connection:
        record_activity(connection, 'password_reset_requested', f"{payload.email.lower()} uchun tiklash so'rovi yaratildi", 'info')
    return {'message': f'{payload.email} uchun tiklash havolasi navbatga qo\'yildi.'}

@app.get('/api/dashboard/summary')
def dashboard_summary(_current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    with managed_connection() as connection:
        analytics = get_analytics_snapshot(connection)
        scans = [serialize_scan(row) for row in connection.execute('SELECT * FROM scans ORDER BY datetime(created_at) DESC LIMIT 5').fetchall()]
        return {
            'analytics': analytics,
            'systemStatus': get_system_status(connection),
            'recentActivity': get_recent_activity(connection, 6),
            'recentScans': scans,
        }


@app.get('/api/scans')
def list_scans(_current_user: dict[str, Any] = Depends(get_current_user)) -> list[dict[str, Any]]:
    with managed_connection() as connection:
        rows = connection.execute('SELECT * FROM scans ORDER BY datetime(created_at) DESC').fetchall()
        return [serialize_scan(row) for row in rows]


@app.post('/api/scans')
def create_scan(payload: ScanCreateRequest, _current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    with managed_connection() as connection:
        enabled_payloads = [serialize_payload(row) for row in connection.execute('SELECT * FROM payloads WHERE enabled = 1 ORDER BY success_rate DESC').fetchall()]
        if not enabled_payloads:
            raise HTTPException(status_code=400, detail='Faol payload topilmadi.')
        findings = generate_findings(
            payload.target_url,
            [item.model_dump() for item in payload.parameters],
            enabled_payloads,
            payload.depth,
            payload.payload_strategy,
        )
        scan_id = f'scan-{uuid.uuid4().hex[:8]}'
        persist_scan_results(
            connection,
            scan_id=scan_id,
            target_url=payload.target_url,
            parameters=[item.model_dump() for item in payload.parameters],
            findings=findings,
            depth=payload.depth,
            payload_strategy=payload.payload_strategy,
            follow_redirects=payload.follow_redirects,
            use_random_user_agent=payload.use_random_user_agent,
        )
        bundle = fetch_scan_bundle(connection, scan_id)
        return {
            'scan': bundle['scan'],
            'requests': len(bundle['requests']),
            'vulnerabilities': len(bundle['vulnerabilities']),
            'overview': bundle['overview'],
        }


@app.get('/api/scans/{scan_id}')
def get_scan(scan_id: str, _current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    with managed_connection() as connection:
        return fetch_scan_bundle(connection, scan_id)


@app.get('/api/payloads')
def list_payloads(payload_type: str | None = None, _current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
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
def create_payload(payload: PayloadCreateRequest, _current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    with managed_connection() as connection:
        payload_id = f'payload-{uuid.uuid4().hex[:8]}'
        connection.execute(
            'INSERT INTO payloads (id, type, payload, success_rate, description, category, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            (payload_id, payload.type, payload.payload, payload.success_rate, payload.description, payload.category, int(payload.enabled), utc_now_iso()),
        )
        record_activity(connection, 'payload_created', f"{payload.type} turidagi payload qo'shildi", 'success')
        row = connection.execute('SELECT * FROM payloads WHERE id = ?', (payload_id,)).fetchone()
        return {'payload': serialize_payload(row)}


@app.patch('/api/payloads/{payload_id}')
def update_payload(payload_id: str, payload: PayloadUpdateRequest, _current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    with managed_connection() as connection:
        connection.execute('UPDATE payloads SET enabled = ? WHERE id = ?', (int(payload.enabled), payload_id))
        row = connection.execute('SELECT * FROM payloads WHERE id = ?', (payload_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail='Payload topilmadi.')
        record_activity(connection, 'payload_updated', f"{row['type']} payload holati yangilandi", 'info')
        return {'payload': serialize_payload(row)}


@app.get('/api/monitor')
def monitor(scan_id: str | None = None, _current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    with managed_connection() as connection:
        if not scan_id:
            latest_scan = connection.execute('SELECT id FROM scans ORDER BY datetime(created_at) DESC LIMIT 1').fetchone()
            scan_id = latest_scan['id'] if latest_scan else None
        if not scan_id:
            return {'requests': [], 'stats': {'totalRequests': 0, 'detected': 0, 'averageResponseTime': 0, 'errorRate': 0}, 'progress': {}}
        request_rows = connection.execute('SELECT * FROM requests WHERE scan_id = ? ORDER BY datetime(created_at) DESC LIMIT 50', (scan_id,)).fetchall()
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
        scans = [serialize_scan(row) for row in connection.execute('SELECT * FROM scans ORDER BY datetime(created_at) ASC').fetchall()]
        vulnerabilities = [serialize_vulnerability(row) for row in connection.execute('SELECT * FROM vulnerabilities').fetchall()]
        payload_effectiveness_rows = connection.execute('SELECT type, AVG(success_rate) AS avg_success FROM payloads GROUP BY type').fetchall()
        return {
            'analytics': analytics_data,
            'timeline': [
                {'name': parse_timestamp(scan['timestamp']).strftime('%d-%m'), 'scans': 1, 'vulnerabilities': scan['vulnerabilitiesFound']}
                for scan in scans[-7:]
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
def reports(search: str = '', severity: str = 'All', _current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    with managed_connection() as connection:
        rows = connection.execute('SELECT * FROM vulnerabilities ORDER BY risk_score DESC').fetchall()
        vulnerabilities = [serialize_vulnerability(row) for row in rows]
        if search:
            query = search.lower()
            vulnerabilities = [
                item for item in vulnerabilities
                if query in item['url'].lower() or query in item['parameter'].lower() or query in item['payloadType'].lower()
            ]
        if severity != 'All':
            vulnerabilities = [item for item in vulnerabilities if item['severity'] == severity]
        stats = Counter(item['severity'] for item in vulnerabilities)
        return {
            'vulnerabilities': vulnerabilities,
            'stats': {
                'total': len(vulnerabilities),
                'critical': stats.get('Critical', 0),
                'high': stats.get('High', 0),
                'medium': stats.get('Medium', 0),
                'low': stats.get('Low', 0),
            },
        }


@app.get('/api/reports/export')
def export_reports(format: str = Query(default='json', pattern='^(json|csv|pdf)$'), _current_user: dict[str, Any] = Depends(get_current_user)):
    with managed_connection() as connection:
        vulnerabilities = [serialize_vulnerability(row) for row in connection.execute('SELECT * FROM vulnerabilities ORDER BY risk_score DESC').fetchall()]
        if format == 'json':
            content = json.dumps(vulnerabilities, indent=2).encode('utf-8')
            return StreamingResponse(io.BytesIO(content), media_type='application/json', headers={'Content-Disposition': 'attachment; filename=reports.json'})

        if format == 'csv':
            buffer = io.StringIO()
            writer = csv.DictWriter(buffer, fieldnames=['id', 'scanId', 'url', 'parameter', 'payloadType', 'severity', 'riskScore', 'responseTime'])
            writer.writeheader()
            for item in vulnerabilities:
                writer.writerow({key: item[key] for key in writer.fieldnames})
            return StreamingResponse(io.BytesIO(buffer.getvalue().encode('utf-8')), media_type='text/csv', headers={'Content-Disposition': 'attachment; filename=reports.csv'})

        pdf_buffer = io.BytesIO()
        pdf = canvas.Canvas(pdf_buffer, pagesize=A4)
        _width, height = A4
        y = height - 50
        pdf.setTitle('SQLI Sentinel Report')
        pdf.setFont('Helvetica-Bold', 16)
        pdf.drawString(40, y, 'SQLI Sentinel Vulnerability Report')
        y -= 28
        pdf.setFont('Helvetica', 10)
        for item in vulnerabilities[:20]:
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
        return StreamingResponse(pdf_buffer, media_type='application/pdf', headers={'Content-Disposition': 'attachment; filename=reports.pdf'})


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
def update_settings(payload: SettingsUpdateRequest, _current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    with managed_connection() as connection:
        connection.execute(
            '''
            UPDATE settings
            SET timeout = ?, request_rate = ?, payload_strategy = ?, risk_scoring_model = ?,
                follow_redirects = ?, use_random_user_agent = ?, verify_ssl = ?,
                notify_critical = ?, notify_scan_complete = ?, notify_weekly = ?
            WHERE id = 1
            ''',
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
        return {'apiKey': {'id': key_id, 'name': payload.name, 'token': token}}


@app.delete('/api/settings/api-keys/{key_id}')
def delete_api_key(key_id: str, _current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, str]:
    with managed_connection() as connection:
        connection.execute('UPDATE api_keys SET active = 0 WHERE id = ?', (key_id,))
        record_activity(connection, 'api_key_revoked', f'{key_id} API kaliti bekor qilindi', 'info')
        return {'message': 'API kaliti bekor qilindi.'}

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
            findings_query = 'SELECT * FROM vulnerabilities WHERE id = ? UNION ALL SELECT * FROM vulnerabilities WHERE id != ? ORDER BY risk_score DESC LIMIT 5'
            params = (payload.top_finding_id, payload.top_finding_id)
        findings = [serialize_vulnerability(row) for row in connection.execute(findings_query, params).fetchall()]
        monitor_items = [serialize_request(row) for row in connection.execute('SELECT * FROM requests ORDER BY datetime(created_at) DESC LIMIT 5').fetchall()]
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


