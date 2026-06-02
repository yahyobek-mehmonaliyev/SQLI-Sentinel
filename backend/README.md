# SQLI Sentinel Backend

Python FastAPI backend for auth, heuristic scan orchestration, payload storage, monitoring, analytics, reports, settings and Gemini-backed recommendations.

## Run

```bash
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

## Environment

Copy `backend/.env.example` values into your shell or env file before starting the backend.

- `GEMINI_API_KEY`: optional. If missing, the AI endpoint falls back to local remediation rules.
- `GEMINI_MODEL`: defaults to `gemini-2.5-flash`
- `SQLI_SENTINEL_SECRET`: session/hash secret for local development

## Notes

- The scan engine is non-invasive and heuristic. It does not send live SQLi payloads to third-party targets.
- Data is stored in `backend/data/sqli_sentinel.db`.
