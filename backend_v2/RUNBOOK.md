# SQLI Sentinel Backend v2 Runbook

## 1. Local Startup

```bash
python -m pip install -r backend_v2/requirements-dev.txt
python -m uvicorn backend_v2.app.main:app --host 127.0.0.1 --port 8000 --reload
```

## Oracle Always Free VM Startup

```bash
sudo bash backend_v2/deploy/oci/deploy_systemd.sh
curl http://127.0.0.1:8000/api/health
```

## 2. Health Verification

```bash
curl http://127.0.0.1:8000/api/health
curl http://127.0.0.1:8000/api/health/ready
curl http://127.0.0.1:8000/api/metrics
```

## 3. Common Operations

- Rotate secret:
  - set new `SQLI_SENTINEL_SECRET`
  - restart backend
- Disable default seed admin (production):
  - `SQLI_SENTINEL_SEED_DEFAULT_ADMIN=false`
- Tighten API origin policy:
  - set `SQLI_SENTINEL_ALLOWED_ORIGINS` to exact frontend domains

## 4. Incident Triage (Suspicious Burst)

1. Check `GET /api/observability` for rate-limit and suspicious signal counters.
2. Inspect `audit_events` and `activities` tables for high-severity events.
3. Temporarily lower `SQLI_SENTINEL_RATE_LIMIT_PER_MINUTE`.
4. Increase logging to `SQLI_SENTINEL_LOG_LEVEL=DEBUG` only for short diagnostics windows.
5. Export findings via `/api/reports/export?format=json`.

## 5. Database Backup

SQLite file location is defined by `SQLI_SENTINEL_DB_PATH`.

Recommended:

1. Stop write traffic briefly.
2. Copy DB and WAL files together.
3. Validate backup can be opened in a staging environment.

## 6. Recovery

1. Restore DB files.
2. Start backend.
3. Validate `/api/health/ready`.
4. Run smoke test:
   - login
   - list scans
   - create one controlled demo scan
