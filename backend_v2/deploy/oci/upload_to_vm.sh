#!/usr/bin/env bash
# ============================================================
# SQLI Sentinel — Windows dan Oracle VM ga yuklash skripti
# Ishlatish: PowerShell da emas, Git Bash yoki WSL da ishga tushiring
# ============================================================

VM_IP="${1:-}"
if [[ -z "${VM_IP}" ]]; then
    echo "Ishlatish: bash upload_to_vm.sh <VM_IP_ADDRESS>"
    echo "Misol:     bash upload_to_vm.sh 152.67.100.200"
    exit 1
fi

SSH_KEY="${2:-~/.ssh/id_rsa}"
REMOTE_USER="ubuntu"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PROJECT_NAME="SQLI Sentinel"

echo "=================================="
echo "  SQLI Sentinel → Oracle VM Upload"
echo "  VM: ${REMOTE_USER}@${VM_IP}"
echo "=================================="
echo ""

echo "[1/3] Loyihani arxivlash..."
cd "${PROJECT_DIR}/.."

# Create compressed archive (exclude unnecessary files)
tar -czf sqli_sentinel_deploy.tar.gz \
    --exclude="${PROJECT_NAME}/.git" \
    --exclude="${PROJECT_NAME}/.github" \
    --exclude="${PROJECT_NAME}/.next" \
    --exclude="${PROJECT_NAME}/node_modules" \
    --exclude="${PROJECT_NAME}/.pnpm-store" \
    --exclude="${PROJECT_NAME}/__pycache__" \
    --exclude="${PROJECT_NAME}/.venv" \
    --exclude="${PROJECT_NAME}/*.log" \
    --exclude="${PROJECT_NAME}/backend_v2/data/*.db" \
    "${PROJECT_NAME}/"

echo "[2/3] VMga yuklash (bu biroz vaqt olishi mumkin)..."
echo "      IP manzil: ${VM_IP}"

# Save IP for deploy script
echo "${VM_IP}" | ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=no \
    "${REMOTE_USER}@${VM_IP}" "cat > /tmp/sqli_vm_ip.txt"

scp -i "${SSH_KEY}" -o StrictHostKeyChecking=no \
    sqli_sentinel_deploy.tar.gz \
    "${REMOTE_USER}@${VM_IP}:/home/${REMOTE_USER}/"

echo "[3/3] VMda arxivni ochish..."
ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=no "${REMOTE_USER}@${VM_IP}" "
    cd /home/${REMOTE_USER}
    rm -rf 'SQLI Sentinel'
    tar -xzf sqli_sentinel_deploy.tar.gz
    rm sqli_sentinel_deploy.tar.gz
    echo 'Arxiv ochildi!'
    ls -la
"

rm -f "${PROJECT_DIR}/../sqli_sentinel_deploy.tar.gz"

echo ""
echo "✅ Yuklash tugadi!"
echo ""
echo "Keyingi qadam — VMda deploy skriptini ishga tushiring:"
echo ""
echo "  ssh -i ${SSH_KEY} ${REMOTE_USER}@${VM_IP}"
echo "  cd 'SQLI Sentinel'"
echo "  sudo bash backend_v2/deploy/oci/deploy_full.sh"
echo ""
