#!/usr/bin/env bash
# ============================================================
# SQLI Sentinel — Full Deploy Script (Oracle Cloud / Ubuntu 22.04)
# Deploys: Backend (FastAPI/systemd) + Frontend (Next.js/PM2) + Nginx
# Run as root: sudo bash backend_v2/deploy/oci/deploy_full.sh
# ============================================================
set -euo pipefail

# ── Colors ──────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; NC='\033[0m'; BOLD='\033[1m'

info()    { echo -e "${CYAN}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC}   $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERR]${NC}  $*"; exit 1; }

# ── Root check ───────────────────────────────────────────────
[[ "${EUID}" -ne 0 ]] && error "Root bo'lib ishga tushiring: sudo bash backend_v2/deploy/oci/deploy_full.sh"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

# ── Variables ────────────────────────────────────────────────
APP_DIR="/opt/sqli-sentinel"
ENV_DIR="/etc/sqli-sentinel"
ENV_FILE="${ENV_DIR}/backend.env"
DATA_DIR="/var/lib/sqli-sentinel"
SERVICE_FILE="/etc/systemd/system/sqli-sentinel-backend.service"
SYSTEM_USER="sqli-sentinel"
NODE_VERSION="20"
FRONTEND_PORT="3000"
BACKEND_PORT="8000"

echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║     SQLI Sentinel — Full Auto Deploy         ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ── Read VM public IP ────────────────────────────────────────
VM_PUBLIC_IP=""
if [[ -f /tmp/sqli_vm_ip.txt ]]; then
    VM_PUBLIC_IP=$(cat /tmp/sqli_vm_ip.txt | tr -d '[:space:]')
fi

if [[ -z "${VM_PUBLIC_IP}" ]]; then
    # Try to detect public IP automatically
    VM_PUBLIC_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || \
                   curl -s --max-time 5 api.ipify.org 2>/dev/null || \
                   curl -s --max-time 5 checkip.amazonaws.com 2>/dev/null || echo "")
fi

if [[ -z "${VM_PUBLIC_IP}" ]]; then
    warn "Public IP aniqlanmadi. Keyinchalik Nginx config da o'zingiz o'zgartiring."
    VM_PUBLIC_IP="YOUR_VM_IP"
fi

info "VM Public IP: ${VM_PUBLIC_IP}"

# ════════════════════════════════════════════════════════════
echo ""
info "═══ [1/9] OS Packages o'rnatilmoqda ═══"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends \
    python3 python3-venv python3-pip \
    rsync curl wget git ufw fail2ban \
    nginx certbot python3-certbot-nginx \
    ca-certificates gnupg lsb-release
success "OS packages tayyor"

# ════════════════════════════════════════════════════════════
echo ""
info "═══ [2/9] Node.js ${NODE_VERSION} o'rnatilmoqda ═══"
if ! command -v node &>/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d 'v')" -lt "${NODE_VERSION}" ]]; then
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
    apt-get install -y nodejs
fi
# Install pnpm
npm install -g pnpm pm2 2>/dev/null || true
success "Node.js $(node -v), pnpm $(pnpm -v), pm2 ready"

# ════════════════════════════════════════════════════════════
echo ""
info "═══ [3/9] Service user va directoriyalar ═══"
if ! id -u "${SYSTEM_USER}" >/dev/null 2>&1; then
    useradd --system --home "${APP_DIR}" --shell /usr/sbin/nologin "${SYSTEM_USER}"
fi
mkdir -p "${APP_DIR}" "${ENV_DIR}" "${DATA_DIR}"
chown -R "${SYSTEM_USER}:${SYSTEM_USER}" "${APP_DIR}" "${DATA_DIR}"
chmod 750 "${DATA_DIR}"
success "Directoriyalar tayyor"

# ════════════════════════════════════════════════════════════
echo ""
info "═══ [4/9] Loyiha fayllari sinxronlanmoqda ═══"
rsync -a --delete \
    --exclude ".git" \
    --exclude ".github" \
    --exclude ".next" \
    --exclude "node_modules" \
    --exclude ".pnpm-store" \
    --exclude "__pycache__" \
    --exclude "*.pyc" \
    --exclude ".venv" \
    --exclude "backend" \
    --exclude "*.log" \
    "${REPO_ROOT}/" "${APP_DIR}/"
chown -R "${SYSTEM_USER}:${SYSTEM_USER}" "${APP_DIR}"
success "Fayllar sinxronlandi: ${APP_DIR}"

# ════════════════════════════════════════════════════════════
echo ""
info "═══ [5/9] Python virtualenv va backend ═══"
runuser -u "${SYSTEM_USER}" -- python3 -m venv "${APP_DIR}/.venv"
runuser -u "${SYSTEM_USER}" -- "${APP_DIR}/.venv/bin/python" -m pip install --upgrade pip -q
runuser -u "${SYSTEM_USER}" -- "${APP_DIR}/.venv/bin/python" -m pip install -r "${APP_DIR}/backend_v2/requirements.txt" -q
success "Python venv va dependencies tayyor"

# ════════════════════════════════════════════════════════════
echo ""
info "═══ [6/9] Backend environment fayli ═══"
if [[ ! -f "${ENV_FILE}" ]]; then
    cp "${APP_DIR}/backend_v2/deploy/oci/backend.env.production.example" "${ENV_FILE}"
    # Generate a strong random secret
    RANDOM_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    sed -i "s|^SQLI_SENTINEL_SECRET=.*|SQLI_SENTINEL_SECRET=${RANDOM_SECRET}|" "${ENV_FILE}"
    info "Yangi kuchli SECRET yaratildi"
else
    warn "Env fayl allaqachon mavjud, o'zgartirilmaydi: ${ENV_FILE}"
fi

sed -i "s|^SQLI_SENTINEL_DB_PATH=.*|SQLI_SENTINEL_DB_PATH=${DATA_DIR}/sqli_sentinel.db|" "${ENV_FILE}"
sed -i "s|^SQLI_SENTINEL_ENV=.*|SQLI_SENTINEL_ENV=production|" "${ENV_FILE}"
sed -i "s|^SQLI_SENTINEL_SEED_DEFAULT_ADMIN=.*|SQLI_SENTINEL_SEED_DEFAULT_ADMIN=true|" "${ENV_FILE}"
sed -i "s|^SQLI_SENTINEL_ALLOWED_ORIGINS=.*|SQLI_SENTINEL_ALLOWED_ORIGINS=http://${VM_PUBLIC_IP},http://${VM_PUBLIC_IP}:3000,http://localhost:3000|" "${ENV_FILE}"

chown root:"${SYSTEM_USER}" "${ENV_FILE}"
chmod 640 "${ENV_FILE}"
success "Backend env fayli tayyor: ${ENV_FILE}"

# ════════════════════════════════════════════════════════════
echo ""
info "═══ [7/9] Systemd service (Backend) ═══"
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
ExecStart=${APP_DIR}/.venv/bin/python -m uvicorn backend_v2.app.main:app --host 127.0.0.1 --port ${BACKEND_PORT} --workers 2
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=5
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable sqli-sentinel-backend
systemctl restart sqli-sentinel-backend
sleep 3

# Health check
if curl -sf "http://127.0.0.1:${BACKEND_PORT}/api/health" >/dev/null; then
    success "Backend ishga tushdi ✓ — http://127.0.0.1:${BACKEND_PORT}/api/health"
else
    warn "Backend hali ishga tushmagan. Log: journalctl -u sqli-sentinel-backend -n 50"
fi

# ════════════════════════════════════════════════════════════
echo ""
info "═══ [8/9] Frontend Build va PM2 ═══"
cd "${APP_DIR}"

# Write frontend .env
cat > "${APP_DIR}/.env.production" <<ENVEOF
NEXT_PUBLIC_API_BASE_URL=http://${VM_PUBLIC_IP}/api
ENVEOF

# Install dependencies and build
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
pnpm build

# PM2 ecosystem file
cat > "${APP_DIR}/ecosystem.config.js" <<PM2EOF
module.exports = {
  apps: [{
    name: 'sqli-frontend',
    script: 'node_modules/.bin/next',
    args: 'start',
    cwd: '${APP_DIR}',
    env: {
      NODE_ENV: 'production',
      PORT: ${FRONTEND_PORT},
      NEXT_PUBLIC_API_BASE_URL: 'http://${VM_PUBLIC_IP}/api',
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
  }]
}
PM2EOF

pm2 delete sqli-frontend 2>/dev/null || true
pm2 start "${APP_DIR}/ecosystem.config.js"
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null | tail -1 | bash 2>/dev/null || true

sleep 3
if curl -sf "http://127.0.0.1:${FRONTEND_PORT}" >/dev/null; then
    success "Frontend ishga tushdi ✓ — http://127.0.0.1:${FRONTEND_PORT}"
else
    warn "Frontend hali yuklanmoqda... PM2 loglarini tekshiring: pm2 logs sqli-frontend"
fi

# ════════════════════════════════════════════════════════════
echo ""
info "═══ [9/9] Nginx reverse proxy ═══"
cat > /etc/nginx/sites-available/sqli-sentinel <<NGINXEOF
server {
    listen 80;
    server_name ${VM_PUBLIC_IP} _;

    # Security headers
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Gzip
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;

    # API — Backend (FastAPI)
    location /api/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
        client_max_body_size 256k;
    }

    # Frontend (Next.js)
    location / {
        proxy_pass http://127.0.0.1:${FRONTEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_cache_bypass \$http_upgrade;
    }

    # Next.js static files
    location /_next/static/ {
        proxy_pass http://127.0.0.1:${FRONTEND_PORT};
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
NGINXEOF

# Enable site
ln -sf /etc/nginx/sites-available/sqli-sentinel /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl reload nginx
success "Nginx sozlandi va qayta ishga tushirildi"

# ════════════════════════════════════════════════════════════
echo ""
info "═══ Firewall ═══"
ufw --force allow OpenSSH
ufw --force allow 'Nginx Full'
ufw --force enable
success "Firewall: SSH + HTTP/HTTPS ruxsat berildi"

# ════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║          ✅  Deploy muvaffaqiyatli tugadi!               ║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  🌐 ${BOLD}Frontend:${NC}  http://${VM_PUBLIC_IP}"
echo -e "  ⚙️  ${BOLD}Backend:${NC}   http://${VM_PUBLIC_IP}/api/health"
echo -e "  📊 ${BOLD}Metrics:${NC}   http://${VM_PUBLIC_IP}/api/metrics"
echo ""
echo -e "  👤 ${BOLD}Admin login:${NC}"
echo -e "     Email:    admin@sqli-sentinel.local"
echo -e "     Parol:    Admin123!"
echo ""
echo -e "  ${YELLOW}⚠️  MUHIM: Darhol admin parolini o'zgartiring!${NC}"
echo ""
echo -e "  📁 ${BOLD}Konfiguratsiya:${NC}  ${ENV_FILE}"
echo -e "  📝 ${BOLD}Backend log:${NC}     journalctl -u sqli-sentinel-backend -f"
echo -e "  📝 ${BOLD}Frontend log:${NC}    pm2 logs sqli-frontend"
echo ""
