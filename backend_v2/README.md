# SQLI Sentinel Backend v2

Defensive SQL injection detection backend built with FastAPI and SQLite.  
This version adds rate limiting, request size limiting, structured logging, metrics, audit trail, and improved heuristic detection with request fingerprints.

## 1. Install

```bash
python -m pip install -r backend_v2/requirements.txt
```

For tests:

```bash
python -m pip install -r backend_v2/requirements-dev.txt
```

## 2. Environment

Copy values from `backend_v2/.env.example` and export them in your shell.

Minimum required:

- `SQLI_SENTINEL_SECRET`
- `SQLI_SENTINEL_DB_PATH` (default works locally)
- `SQLI_SENTINEL_ALLOWED_ORIGINS`

Optional:

- `GEMINI_API_KEY`
- `GEMINI_MODEL`

## 3. Run (Local Development)

```bash
python -m uvicorn backend_v2.app.main:app --host 127.0.0.1 --port 8000 --reload
```

Health checks:

- `GET /api/health`
- `GET /api/health/live`
- `GET /api/health/ready`
- `GET /api/metrics`

## 4. Run (Production)

```bash
python -m uvicorn backend_v2.app.main:app --host 0.0.0.0 --port 8000 --workers 2
```

Recommended production settings:

- `SQLI_SENTINEL_ENV=production`
- strong random `SQLI_SENTINEL_SECRET`
- strict `SQLI_SENTINEL_ALLOWED_ORIGINS`
- disable demo defaults:
  - `SQLI_SENTINEL_SEED_DEFAULT_ADMIN=false`

Oracle Always Free VM deployment:

- See [deploy_oracle_free_vm.md](./deploy/oci/deploy_oracle_free_vm.md)
- Automated script: `backend_v2/deploy/oci/deploy_systemd.sh`

## 5. Tests

```bash
python -m pytest -q
```

## 6. Security Hardening Built-In

- Request size limit (`413`) via `SQLI_SENTINEL_REQUEST_SIZE_LIMIT_BYTES`
- Sliding window rate limit (`429`) via `SQLI_SENTINEL_RATE_LIMIT_PER_MINUTE`
- Security headers and `X-Request-ID`
- Structured JSON logs
- Audit events in `audit_events` table
- SQLi heuristic evidence:
  - rule matches
  - detection reason
  - request fingerprint

## 7. Database

Default path:

`backend_v2/data/sqli_sentinel.db`

SQLite tuning enabled:

- WAL mode
- `synchronous=NORMAL`
- foreign keys ON
- indexes for frequent queries

## 8. API Notes

The API remains compatible with existing frontend routes:

- `/api/auth/*`
- `/api/scans*`
- `/api/payloads*`
- `/api/monitor`
- `/api/analytics`
- `/api/reports*`
- `/api/settings*`
- `/api/ai/*`

Additional endpoint:

- `/api/audit/events`
