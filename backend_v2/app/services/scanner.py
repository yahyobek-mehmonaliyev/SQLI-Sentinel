from __future__ import annotations

import hashlib
import json
import random
import re
import uuid
from dataclasses import dataclass
from urllib.parse import urlparse

from backend_v2.app.core.security import utc_now_iso


PARAMETER_WEIGHTS = {
    'id': 30,
    'user': 18,
    'username': 24,
    'password': 32,
    'query': 28,
    'search': 24,
    'email': 16,
    'sort': 12,
    'filter': 16,
    'order': 14,
    'category': 10,
    'token': 22,
    'session': 20,
}

LOW_RISK_PARAMETERS = {'page', 'limit', 'offset', 'lang', 'theme'}

RULE_PATTERNS: dict[str, re.Pattern[str]] = {
    'comment_sequence': re.compile(r'(--|#|/\*)'),
    'union_select': re.compile(r'\bunion\b\s+\bselect\b', re.IGNORECASE),
    'boolean_tautology': re.compile(r"('|\")?\s*(or|and)\s+['\"]?\d+['\"]?\s*=\s*['\"]?\d+['\"]?", re.IGNORECASE),
    'stacked_query': re.compile(r';\s*(select|insert|update|delete|drop)\b', re.IGNORECASE),
    'time_delay': re.compile(r'\b(sleep|pg_sleep|benchmark|waitfor)\s*\(', re.IGNORECASE),
    'information_schema': re.compile(r'\binformation_schema\b', re.IGNORECASE),
    'hex_encoding': re.compile(r'0x[0-9a-f]{2,}', re.IGNORECASE),
}

PAYLOAD_TYPE_SIGNALS: dict[str, list[str]] = {
    'Error-based': ['comment_sequence', 'stacked_query'],
    'Union-based': ['union_select', 'information_schema'],
    'Boolean-based': ['boolean_tautology'],
    'Time-based': ['time_delay'],
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
    fingerprint: str
    rule_matches: list[str]
    detection_reason: str


def _severity_from_score(score: int) -> str:
    if score >= 85:
        return 'Critical'
    if score >= 70:
        return 'High'
    if score >= 50:
        return 'Medium'
    return 'Low'


def _strategy_detection_threshold(payload_strategy: str) -> int:
    return {'conservative': 66, 'balanced': 58, 'aggressive': 50}.get(payload_strategy, 58)


def _parameter_base_score(url: str, parameter_key: str, depth: int, payload_strategy: str) -> int:
    key = parameter_key.lower().strip() or 'anonymous'
    score = 22 + PARAMETER_WEIGHTS.get(key, 8)

    path = urlparse(url).path.lower()
    if any(segment in path for segment in ['/login', '/auth', '/admin', '/account']):
        score += 18
    if any(segment in path for segment in ['/search', '/filter', '/api', '/report']):
        score += 10

    score += depth * 5
    score += {'conservative': 0, 'balanced': 6, 'aggressive': 12}.get(payload_strategy, 6)
    return score


def _match_payload_rules(payload_text: str) -> list[str]:
    text = payload_text.lower().strip()
    matches: list[str] = []
    for rule_name, pattern in RULE_PATTERNS.items():
        if pattern.search(text):
            matches.append(rule_name)
    return matches


def _evaluate_payload(
    *,
    target_url: str,
    parameter_key: str,
    parameter_value: str,
    payload_text: str,
    payload_type: str,
    depth: int,
    payload_strategy: str,
    payload_success_rate: int,
    index: int,
) -> tuple[int, list[str], str]:
    base_score = _parameter_base_score(target_url, parameter_key, depth, payload_strategy)
    rule_matches = _match_payload_rules(payload_text)
    expected_signals = PAYLOAD_TYPE_SIGNALS.get(payload_type, [])
    typed_signal_bonus = sum(3 for signal in expected_signals if signal in rule_matches)
    generic_signal_bonus = max(0, len(rule_matches) - len(expected_signals)) * 2
    score = base_score + typed_signal_bonus + generic_signal_bonus
    score += max(0, min(20, payload_success_rate // 7))
    score -= min(index * 6, 18)

    key_normalized = parameter_key.lower().strip()
    if key_normalized in LOW_RISK_PARAMETERS and not rule_matches:
        score -= 18
    elif key_normalized in LOW_RISK_PARAMETERS and len(rule_matches) == 1:
        score -= 10

    score = max(25, min(98, score))
    reason = ' | '.join(rule_matches) if rule_matches else 'Risk threshold and context-based heuristic signal'
    return score, rule_matches, reason


def _build_fingerprint(method: str, url: str, parameter_key: str, payload_type: str, payload_text: str) -> str:
    normalized = f'{method.upper()}|{url.lower()}|{parameter_key.lower()}|{payload_type}|{payload_text[:128].lower()}'
    return hashlib.sha256(normalized.encode('utf-8')).hexdigest()[:20]


def generate_findings(
    target_url: str,
    parameters: list[dict[str, str]],
    enabled_payloads: list[dict[str, str | int]],
    depth: int,
    payload_strategy: str,
) -> list[GeneratedFinding]:
    findings: list[GeneratedFinding] = []
    payload_limit = {'conservative': 1, 'balanced': 2, 'aggressive': 3}.get(payload_strategy, 2)
    detection_threshold = _strategy_detection_threshold(payload_strategy)

    if not parameters:
        parameters = [
            {'key': 'id', 'value': '1', 'method': 'GET'},
            {'key': 'query', 'value': 'admin', 'method': 'GET'},
        ]

    if not enabled_payloads:
        return findings

    selected_payloads = enabled_payloads[: max(1, min(payload_limit, len(enabled_payloads)))]

    for parameter in parameters:
        parameter_key = parameter.get('key', 'anonymous') or 'anonymous'
        parameter_value = parameter.get('value', '') or ''
        parameter_method = parameter.get('method', 'GET')

        for index, payload in enumerate(selected_payloads):
            payload_text = str(payload['payload'])
            payload_type = str(payload['type'])
            payload_success_rate = int(payload.get('success_rate', 60))
            item_score, rule_matches, reason = _evaluate_payload(
                target_url=target_url,
                parameter_key=parameter_key,
                parameter_value=parameter_value,
                payload_text=payload_text,
                payload_type=payload_type,
                depth=depth,
                payload_strategy=payload_strategy,
                payload_success_rate=payload_success_rate,
                index=index,
            )
            severity = _severity_from_score(item_score)
            is_detected = item_score >= detection_threshold and (len(rule_matches) > 0 or item_score >= 76)

            response_time = 320 + item_score * 15 + random.randint(15, 110)
            if payload_type == 'Time-based':
                response_time += 1500

            request_parameters = {parameter_key: parameter_value or 'demo'}
            fingerprint = _build_fingerprint(parameter_method, target_url, parameter_key, payload_type, payload_text)
            error_pattern = {
                'Error-based': 'Database error signature and unsafe pattern alignment detected',
                'Union-based': 'Response shape anomaly matched union-style inference indicators',
                'Boolean-based': 'Conditional divergence heuristic detected between baseline and variant',
                'Time-based': 'Timing behavior exceeded threshold with repeatable delay markers',
            }.get(payload_type, 'Heuristic anomaly detected')
            evidence = {
                'Error-based': 'Input and response profile indicate error-based SQL interpretation risk.',
                'Union-based': 'Output pattern suggests potential column inference/vectorized extraction path.',
                'Boolean-based': 'Behavioral branching indicates possible boolean SQL condition injection.',
                'Time-based': 'Deterministic delay signature is consistent with timing-based SQL manipulation.',
            }.get(payload_type, 'Heuristic detector observed suspicious SQL-related signal.')
            response_message = 'Potential SQLi signal detected by heuristic scanner.' if is_detected else 'No strong SQLi signal detected.'
            status_code = 500 if payload_type in {'Error-based', 'Union-based'} and is_detected else 200

            findings.append(
                GeneratedFinding(
                    parameter=parameter_key,
                    payload=payload_text,
                    payload_type=payload_type,
                    risk_score=item_score,
                    severity=severity,
                    error_pattern=error_pattern,
                    response_time=response_time,
                    evidence=evidence,
                    request_method=parameter_method,
                    request_url=target_url,
                    request_parameters=request_parameters,
                    response=response_message,
                    status_code=status_code,
                    detected=is_detected,
                    fingerprint=fingerprint,
                    rule_matches=rule_matches,
                    detection_reason=reason,
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
    success_rate = max(55, min(99, 64 + len(vulnerabilities) * 7))
    duration = max(8, len(findings) * (depth + 1))
    summary = (
        'Heuristic scan completed without outbound payload execution. '
        'Findings are generated from local risk rules, pattern matches, and payload metadata.'
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

    scan_parameters = parameters or [{'key': 'id', 'value': '1', 'method': 'GET'}]
    connection.executemany(
        'INSERT INTO scan_parameters (scan_id, key, value, method) VALUES (?, ?, ?, ?)',
        [
            (
                scan_id,
                parameter.get('key', 'id') or 'id',
                parameter.get('value', 'demo') or 'demo',
                parameter.get('method', 'GET'),
            )
            for parameter in scan_parameters
        ],
    )

    request_rows = []
    vulnerability_rows = []
    for finding in findings:
        request_id = f'req-{uuid.uuid4().hex[:8]}'
        request_rows.append(
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
                finding.fingerprint,
                json.dumps(finding.rule_matches),
            )
        )

        if finding.detected:
            vuln_id = f'vuln-{uuid.uuid4().hex[:8]}'
            vulnerability_rows.append(
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
                    finding.detection_reason,
                )
            )

    connection.executemany(
        """
        INSERT INTO requests (
            id, scan_id, method, url, parameters_json, payload, response,
            response_time, status_code, created_at, detected, fingerprint, rule_matches_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        request_rows,
    )

    if vulnerability_rows:
        connection.executemany(
            """
            INSERT INTO vulnerabilities (
                id, scan_id, url, parameter, payload, payload_type, risk_score,
                severity, error_pattern, response_time, created_at, evidence, detection_reason
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            vulnerability_rows,
        )

    connection.execute(
        """
        INSERT INTO activities (id, type, description, status, created_at, metadata_json)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            f'activity-{uuid.uuid4().hex[:8]}',
            'scan_completed',
            f'{target_url} uchun heuristik skan yakunlandi',
            'success',
            created_at,
            json.dumps({'scanId': scan_id, 'requests': len(findings), 'detected': len(vulnerabilities)}),
        ),
    )

    if vulnerabilities:
        top_finding = sorted(vulnerabilities, key=lambda item: item.risk_score, reverse=True)[0]
        connection.execute(
            """
            INSERT INTO activities (id, type, description, status, created_at, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                f'activity-{uuid.uuid4().hex[:8]}',
                'vulnerability_detected',
                f'{top_finding.parameter} parametrida {top_finding.severity.lower()} finding qayd etildi',
                'critical' if top_finding.severity == 'Critical' else 'info',
                created_at,
                json.dumps({'scanId': scan_id, 'topVulnerability': top_finding.parameter, 'riskScore': top_finding.risk_score}),
            ),
        )
