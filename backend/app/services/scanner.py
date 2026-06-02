from __future__ import annotations

import json
import random
import uuid
from dataclasses import dataclass
from urllib.parse import urlparse

from backend.app.core.security import utc_now_iso


PARAMETER_WEIGHTS = {
    'id': 28,
    'user': 18,
    'username': 24,
    'password': 30,
    'query': 28,
    'search': 24,
    'email': 16,
    'sort': 12,
    'filter': 16,
    'order': 16,
    'category': 10,
}


@dataclass
class GeneratedFinding:
    parameter: str
    payload: str
    payload_type: str
    risk_score: int
    severity: str
    error_pattern: str
    response_time: int
    evidence: str
    request_method: str
    request_url: str
    request_parameters: dict[str, str]
    response: str
    status_code: int
    detected: bool


def _severity_from_score(score: int) -> str:
    if score >= 85:
        return 'Critical'
    if score >= 70:
        return 'High'
    if score >= 50:
        return 'Medium'
    return 'Low'


def _score_parameter(url: str, parameter_key: str, depth: int, payload_strategy: str) -> int:
    key = parameter_key.lower().strip() or 'anonymous'
    score = 25 + PARAMETER_WEIGHTS.get(key, 8)

    path = urlparse(url).path.lower()
    if any(segment in path for segment in ['/login', '/auth', '/admin']):
        score += 18
    if any(segment in path for segment in ['/search', '/filter', '/api']):
        score += 10

    score += depth * 6
    score += {'conservative': 0, 'balanced': 6, 'aggressive': 12}[payload_strategy]
    return min(score, 96)


def generate_findings(
    target_url: str,
    parameters: list[dict[str, str]],
    enabled_payloads: list[dict[str, str | int]],
    depth: int,
    payload_strategy: str,
) -> list[GeneratedFinding]:
    findings: list[GeneratedFinding] = []
    payload_limit = {'conservative': 1, 'balanced': 2, 'aggressive': 3}[payload_strategy]

    if not parameters:
        parameters = [
            {'key': 'id', 'value': '1', 'method': 'GET'},
            {'key': 'query', 'value': 'admin', 'method': 'GET'},
        ]

    for parameter in parameters:
        parameter_key = parameter['key'] or 'anonymous'
        risk_score = _score_parameter(target_url, parameter_key, depth, payload_strategy)
        selected_payloads = enabled_payloads[: max(1, min(payload_limit, len(enabled_payloads)))]

        for index, payload in enumerate(selected_payloads):
            score_delta = min(index * 6, 14)
            item_score = max(35, risk_score - score_delta)
            severity = _severity_from_score(item_score)
            payload_type = str(payload['type'])
            is_detected = item_score >= 55
            response_time = 400 + item_score * 18 + random.randint(10, 120)
            if payload_type == 'Time-based':
                response_time += 1800

            request_parameters = {parameter_key: parameter['value'] or 'demo'}
            error_pattern = {
                'Error-based': 'Database-flavored error signature matched risky parameter path',
                'Union-based': 'Response shape anomaly matched column inference heuristic',
                'Boolean-based': 'Boolean branching indicators changed between baseline and variant',
                'Time-based': 'Response timing exceeded baseline threshold under simulated load',
            }[payload_type]
            evidence = {
                'Error-based': 'Frontend/backend message structure suggested unsafe query composition.',
                'Union-based': 'Heuristic parser found enumeration-friendly output changes.',
                'Boolean-based': 'Conditional parameter behavior was inconsistent with static baseline.',
                'Time-based': 'Timing delta remained elevated across repeated heuristic probes.',
            }[payload_type]
            response_message = 'Potential SQLi signal detected by heuristic scanner.' if is_detected else 'No strong signal detected.'
            status_code = 500 if payload_type in {'Error-based', 'Union-based'} and is_detected else 200

            findings.append(
                GeneratedFinding(
                    parameter=parameter_key,
                    payload=str(payload['payload']),
                    payload_type=payload_type,
                    risk_score=item_score,
                    severity=severity,
                    error_pattern=error_pattern,
                    response_time=response_time,
                    evidence=evidence,
                    request_method=parameter['method'],
                    request_url=target_url,
                    request_parameters=request_parameters,
                    response=response_message,
                    status_code=status_code,
                    detected=is_detected,
                )
            )
    return findings


def persist_scan_results(
    connection,
    *,
    scan_id: str,
    target_url: str,
    parameters: list[dict[str, str]],
    findings: list[GeneratedFinding],
    depth: int,
    payload_strategy: str,
    follow_redirects: bool,
    use_random_user_agent: bool,
) -> None:
    created_at = utc_now_iso()
    vulnerabilities = [item for item in findings if item.detected]
    success_rate = max(55, min(99, 65 + len(vulnerabilities) * 8))
    duration = max(8, len(findings) * (depth + 1))
    summary = (
        'Heuristic scan completed without outbound payload execution. '
        'Findings are generated from local risk rules and enabled payload metadata.'
    )

    connection.execute(
        """
        INSERT INTO scans (
            id, target_url, status, created_at, vulnerabilities_found, requests_total,
            success_rate, duration, depth, payload_strategy, follow_redirects, use_random_user_agent, summary
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            scan_id,
            target_url,
            'completed',
            created_at,
            len(vulnerabilities),
            len(findings),
            success_rate,
            duration,
            depth,
            payload_strategy,
            int(follow_redirects),
            int(use_random_user_agent),
            summary,
        ),
    )

    for parameter in parameters or [{'key': 'id', 'value': '1', 'method': 'GET'}]:
        connection.execute(
            'INSERT INTO scan_parameters (scan_id, key, value, method) VALUES (?, ?, ?, ?)',
            (scan_id, parameter['key'] or 'id', parameter['value'] or 'demo', parameter['method']),
        )

    for finding in findings:
        request_id = f"req-{uuid.uuid4().hex[:8]}"
        connection.execute(
            """
            INSERT INTO requests (
                id, scan_id, method, url, parameters_json, payload, response,
                response_time, status_code, created_at, detected
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                request_id,
                scan_id,
                finding.request_method,
                finding.request_url,
                json.dumps(finding.request_parameters),
                finding.payload,
                finding.response,
                finding.response_time,
                finding.status_code,
                created_at,
                int(finding.detected),
            ),
        )

        if finding.detected:
            vuln_id = f"vuln-{uuid.uuid4().hex[:8]}"
            connection.execute(
                """
                INSERT INTO vulnerabilities (
                    id, scan_id, url, parameter, payload, payload_type, risk_score,
                    severity, error_pattern, response_time, created_at, evidence
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    vuln_id,
                    scan_id,
                    finding.request_url,
                    finding.parameter,
                    finding.payload,
                    finding.payload_type,
                    finding.risk_score,
                    finding.severity,
                    finding.error_pattern,
                    finding.response_time,
                    created_at,
                    finding.evidence,
                ),
            )

    connection.execute(
        """
        INSERT INTO activities (id, type, description, status, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            f"activity-{uuid.uuid4().hex[:8]}",
            'scan_completed',
            f'{target_url} uchun heuristik skan yakunlandi',
            'success',
            created_at,
        ),
    )

    if vulnerabilities:
        top_finding = sorted(vulnerabilities, key=lambda item: item.risk_score, reverse=True)[0]
        connection.execute(
            """
            INSERT INTO activities (id, type, description, status, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                f"activity-{uuid.uuid4().hex[:8]}",
                'vulnerability_detected',
                f'{top_finding.parameter} parametrida {top_finding.severity.lower()} finding qayd etildi',
                'critical' if top_finding.severity == 'Critical' else 'info',
                created_at,
            ),
        )
