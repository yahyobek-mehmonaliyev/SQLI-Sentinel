from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterable

from backend_v2.app.core.config import get_config


def database_path() -> Path:
    return get_config().db_path


def ensure_database_directory() -> None:
    database_path().parent.mkdir(parents=True, exist_ok=True)


def get_connection() -> sqlite3.Connection:
    ensure_database_directory()
    connection = sqlite3.connect(database_path(), check_same_thread=False, timeout=15)
    connection.row_factory = sqlite3.Row
    connection.execute('PRAGMA foreign_keys = ON;')
    connection.execute('PRAGMA journal_mode = WAL;')
    connection.execute('PRAGMA synchronous = NORMAL;')
    connection.execute('PRAGMA temp_store = MEMORY;')
    connection.execute('PRAGMA busy_timeout = 5000;')
    return connection


@contextmanager
def managed_connection() -> Iterable[sqlite3.Connection]:
    connection = get_connection()
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def _table_columns(connection: sqlite3.Connection, table_name: str) -> set[str]:
    rows = connection.execute(f'PRAGMA table_info({table_name})').fetchall()
    return {row['name'] for row in rows}


def _add_column_if_missing(connection: sqlite3.Connection, table_name: str, column_name: str, definition: str) -> None:
    if column_name in _table_columns(connection, table_name):
        return
    connection.execute(f'ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}')


def _run_schema_migrations(connection: sqlite3.Connection) -> None:
    _add_column_if_missing(connection, 'requests', 'fingerprint', "TEXT NOT NULL DEFAULT ''")
    _add_column_if_missing(connection, 'requests', 'rule_matches_json', "TEXT NOT NULL DEFAULT '[]'")
    _add_column_if_missing(connection, 'vulnerabilities', 'detection_reason', "TEXT NOT NULL DEFAULT ''")
    _add_column_if_missing(connection, 'activities', 'metadata_json', "TEXT NOT NULL DEFAULT '{}'")


def _create_indexes(connection: sqlite3.Connection) -> None:
    connection.executescript(
        """
        CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
        CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
        CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at);
        CREATE INDEX IF NOT EXISTS idx_requests_scan_id ON requests(scan_id);
        CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at);
        CREATE INDEX IF NOT EXISTS idx_requests_detected ON requests(detected);
        CREATE INDEX IF NOT EXISTS idx_vulnerabilities_scan_id ON vulnerabilities(scan_id);
        CREATE INDEX IF NOT EXISTS idx_vulnerabilities_risk_score ON vulnerabilities(risk_score DESC);
        CREATE INDEX IF NOT EXISTS idx_vulnerabilities_created_at ON vulnerabilities(created_at);
        CREATE INDEX IF NOT EXISTS idx_payloads_enabled ON payloads(enabled);
        CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at);
        CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(active);
        CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at);
        """
    )


def initialize_database() -> None:
    with managed_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'analyst',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                token TEXT UNIQUE NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS payloads (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                payload TEXT NOT NULL,
                success_rate INTEGER NOT NULL,
                description TEXT NOT NULL,
                category TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS scans (
                id TEXT PRIMARY KEY,
                target_url TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                vulnerabilities_found INTEGER NOT NULL DEFAULT 0,
                requests_total INTEGER NOT NULL DEFAULT 0,
                success_rate INTEGER NOT NULL DEFAULT 0,
                duration INTEGER NOT NULL DEFAULT 0,
                depth INTEGER NOT NULL DEFAULT 1,
                payload_strategy TEXT NOT NULL DEFAULT 'balanced',
                follow_redirects INTEGER NOT NULL DEFAULT 1,
                use_random_user_agent INTEGER NOT NULL DEFAULT 1,
                summary TEXT NOT NULL DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS scan_parameters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scan_id TEXT NOT NULL,
                key TEXT NOT NULL,
                value TEXT NOT NULL,
                method TEXT NOT NULL,
                FOREIGN KEY(scan_id) REFERENCES scans(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS vulnerabilities (
                id TEXT PRIMARY KEY,
                scan_id TEXT NOT NULL,
                url TEXT NOT NULL,
                parameter TEXT NOT NULL,
                payload TEXT NOT NULL,
                payload_type TEXT NOT NULL,
                risk_score INTEGER NOT NULL,
                severity TEXT NOT NULL,
                error_pattern TEXT NOT NULL,
                response_time INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                evidence TEXT NOT NULL,
                detection_reason TEXT NOT NULL DEFAULT '',
                FOREIGN KEY(scan_id) REFERENCES scans(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS requests (
                id TEXT PRIMARY KEY,
                scan_id TEXT NOT NULL,
                method TEXT NOT NULL,
                url TEXT NOT NULL,
                parameters_json TEXT NOT NULL,
                payload TEXT NOT NULL,
                response TEXT NOT NULL,
                response_time INTEGER NOT NULL,
                status_code INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                detected INTEGER NOT NULL DEFAULT 0,
                fingerprint TEXT NOT NULL DEFAULT '',
                rule_matches_json TEXT NOT NULL DEFAULT '[]',
                FOREIGN KEY(scan_id) REFERENCES scans(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS activities (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                description TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                metadata_json TEXT NOT NULL DEFAULT '{}'
            );

            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                timeout INTEGER NOT NULL DEFAULT 300,
                request_rate INTEGER NOT NULL DEFAULT 10,
                payload_strategy TEXT NOT NULL DEFAULT 'balanced',
                risk_scoring_model TEXT NOT NULL DEFAULT 'owasp',
                follow_redirects INTEGER NOT NULL DEFAULT 1,
                use_random_user_agent INTEGER NOT NULL DEFAULT 1,
                verify_ssl INTEGER NOT NULL DEFAULT 0,
                notify_critical INTEGER NOT NULL DEFAULT 1,
                notify_scan_complete INTEGER NOT NULL DEFAULT 1,
                notify_weekly INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS api_keys (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                name TEXT NOT NULL,
                token TEXT NOT NULL,
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS audit_events (
                id TEXT PRIMARY KEY,
                actor_id TEXT,
                event_type TEXT NOT NULL,
                severity TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                metadata_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL
            );
            """
        )

        _run_schema_migrations(connection)
        _create_indexes(connection)

        connection.execute(
            """
            INSERT OR IGNORE INTO settings (
                id,
                timeout,
                request_rate,
                payload_strategy,
                risk_scoring_model,
                follow_redirects,
                use_random_user_agent,
                verify_ssl,
                notify_critical,
                notify_scan_complete,
                notify_weekly
            ) VALUES (1, 300, 10, 'balanced', 'owasp', 1, 1, 0, 1, 1, 0)
            """
        )
