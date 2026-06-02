#!/usr/bin/env bash
set -euo pipefail

DB_DIR="/var/lib/sqli-sentinel"
DB_FILE="${DB_DIR}/sqli_sentinel.db"
BACKUP_DIR="/var/backups/sqli-sentinel"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

mkdir -p "${BACKUP_DIR}"

if [[ ! -f "${DB_FILE}" ]]; then
  echo "Database file not found: ${DB_FILE}"
  exit 1
fi

cp -a "${DB_FILE}" "${BACKUP_DIR}/sqli_sentinel_${TIMESTAMP}.db"
if [[ -f "${DB_FILE}-wal" ]]; then
  cp -a "${DB_FILE}-wal" "${BACKUP_DIR}/sqli_sentinel_${TIMESTAMP}.db-wal"
fi
if [[ -f "${DB_FILE}-shm" ]]; then
  cp -a "${DB_FILE}-shm" "${BACKUP_DIR}/sqli_sentinel_${TIMESTAMP}.db-shm"
fi

find "${BACKUP_DIR}" -type f -mtime +14 -delete
echo "Backup completed: ${TIMESTAMP}"
