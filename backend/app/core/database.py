from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[3]
DATA_DIR = ROOT_DIR / 'backend' / 'data'
DATABASE_PATH = DATA_DIR / 'sqli_sentinel.db'


def ensure_database_directory() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def get_connection() -> sqlite3.Connection:
    ensure_database_directory()
    connection = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute('PRAGMA foreign_keys = ON;')
    return connection


@contextmanager
def managed_connection() -> sqlite3.Connection:
    connection = get_connection()
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


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
                FOREIGN KEY(scan_id) REFERENCES scans(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS activities (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                description TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL
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
            """
        )

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
