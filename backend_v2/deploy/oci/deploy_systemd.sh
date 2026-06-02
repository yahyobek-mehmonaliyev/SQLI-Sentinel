#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run as root: sudo bash backend_v2/deploy/oci/deploy_systemd.sh"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
APP_DIR="/opt/sqli-sentinel"
ENV_DIR="/etc/sqli-sentinel"
ENV_FILE="${ENV_DIR}/backend.env"
DATA_DIR="/var/lib/sqli-sentinel"
SERVICE_FILE="/etc/systemd/system/sqli-sentinel-backend.service"
SYSTEM_USER="sqli-sentinel"

echo "[1/8] Installing OS packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends python3 python3-venv python3-pip rsync curl ufw fail2ban

echo "[2/8] Creating service user and directories"
if ! id -u "${SYSTEM_USER}" >/dev/null 2>&1; then
  useradd --system --home "${APP_DIR}" --shell /usr/sbin/nologin "${SYSTEM_USER}"
fi

mkdir -p "${APP_DIR}" "${ENV_DIR}" "${DATA_DIR}"
chown -R "${SYSTEM_USER}:${SYSTEM_USER}" "${APP_DIR}" "${DATA_DIR}"
chmod 750 "${DATA_DIR}"

echo "[3/8] Syncing project files to ${APP_DIR}"
rsync -a --delete \
  --exclude ".git" \
  --exclude ".github" \
  --exclude ".next" \
  --exclude "node_modules" \
  --exclude "__pycache__" \
  --exclude "*.pyc" \
  --exclude "backend" \
  "${REPO_ROOT}/" "${APP_DIR}/"

echo "[4/8] Preparing Python virtualenv"
runuser -u "${SYSTEM_USER}" -- python3 -m venv "${APP_DIR}/.venv"
runuser -u "${SYSTEM_USER}" -- "${APP_DIR}/.venv/bin/python" -m pip install --upgrade pip
runuser -u "${SYSTEM_USER}" -- "${APP_DIR}/.venv/bin/python" -m pip install -r "${APP_DIR}/backend_v2/requirements.txt"

echo "[5/8] Preparing environment file"
if [[ ! -f "${ENV_FILE}" ]]; then
  cp "${APP_DIR}/backend_v2/deploy/oci/backend.env.production.example" "${ENV_FILE}"
fi

sed -i "s|^SQLI_SENTINEL_DB_PATH=.*|SQLI_SENTINEL_DB_PATH=${DATA_DIR}/sqli_sentinel.db|" "${ENV_FILE}"
sed -i "s|^SQLI_SENTINEL_ENV=.*|SQLI_SENTINEL_ENV=production|" "${ENV_FILE}"
sed -i "s|^SQLI_SENTINEL_SEED_DEFAULT_ADMIN=.*|SQLI_SENTINEL_SEED_DEFAULT_ADMIN=false|" "${ENV_FILE}"

chown root:"${SYSTEM_USER}" "${ENV_FILE}"
chmod 640 "${ENV_FILE}"

echo "[6/8] Writing systemd unit"
cat > "${SERVICE_FILE}" <<EOF
[Unit]
Description=SQLI Sentinel Backend v2 (FastAPI)
After=network.target

[Service]
Type=simple
User=${SYSTEM_USER}
Group=${SYSTEM_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=${APP_DIR}/.venv/bin/python -m uvicorn backend_v2.app.main:app --host 0.0.0.0 --port 8000 --workers 2
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=5
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

echo "[7/8] Enabling firewall and service"
ufw --force allow OpenSSH
ufw --force allow 8000/tcp
ufw --force enable

systemctl daemon-reload
systemctl enable sqli-sentinel-backend
systemctl restart sqli-sentinel-backend

echo "[8/8] Final status"
systemctl --no-pager --full status sqli-sentinel-backend || true
echo "Deploy completed."
echo "Health check: curl http://<VM_PUBLIC_IP>:8000/api/health"
echo "Important: edit ${ENV_FILE} and set a strong SQLI_SENTINEL_SECRET."
