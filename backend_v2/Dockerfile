FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN adduser --disabled-password --gecos "" appuser

COPY backend_v2/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY backend_v2 /app/backend_v2
RUN mkdir -p /app/backend_v2/data && chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "backend_v2.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
