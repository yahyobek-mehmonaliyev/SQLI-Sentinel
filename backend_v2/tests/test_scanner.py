from backend_v2.app.services.scanner import generate_findings


def test_scanner_detects_union_signature() -> None:
    findings = generate_findings(
        target_url='https://example.com/search',
        parameters=[{'key': 'query', 'value': 'admin', 'method': 'GET'}],
        enabled_payloads=[
            {
                'type': 'Union-based',
                'payload': "' UNION SELECT username,password FROM users--",
                'success_rate': 85,
            }
        ],
        depth=4,
        payload_strategy='balanced',
    )

    assert findings, 'Findings bo‘lishi kerak'
    finding = findings[0]
    assert finding.detected is True
    assert 'union_select' in finding.rule_matches
    assert finding.risk_score >= 58
    assert finding.fingerprint


def test_scanner_reduces_false_positive_on_low_risk_parameter_without_signals() -> None:
    findings = generate_findings(
        target_url='https://example.com/list',
        parameters=[{'key': 'page', 'value': '1', 'method': 'GET'}],
        enabled_payloads=[
            {
                'type': 'Boolean-based',
                'payload': 'normal-text-without-sqli-markers',
                'success_rate': 20,
            }
        ],
        depth=1,
        payload_strategy='conservative',
    )

    assert findings, 'Findings bo‘lishi kerak'
    finding = findings[0]
    assert finding.detected is False
    assert finding.risk_score < 66
    assert finding.rule_matches == []


def test_scanner_adds_time_based_rule_match() -> None:
    findings = generate_findings(
        target_url='https://example.com/api/report',
        parameters=[{'key': 'id', 'value': '1', 'method': 'GET'}],
        enabled_payloads=[
            {
                'type': 'Time-based',
                'payload': "1' AND SLEEP(5)--",
                'success_rate': 70,
            }
        ],
        depth=3,
        payload_strategy='balanced',
    )

    assert findings, 'Findings bo‘lishi kerak'
    finding = findings[0]
    assert 'time_delay' in finding.rule_matches
    assert finding.response_time >= 1500
