# Oracle Always Free VM Deploy Guide (Backend v2)

This guide deploys only backend API (`FastAPI`) to an Oracle Always Free Ubuntu VM.

## 1. Create VM in Oracle Cloud

Recommended:

- Image: Ubuntu 22.04 LTS
- Shape: `VM.Standard.A1.Flex` (Always Free eligible) or `VM.Standard.E2.1.Micro`
- Public IP: enabled
- Boot volume: at least 50 GB

Network ingress rules:

- TCP `22` (SSH)
- TCP `8000` (API, initial phase)

## 2. Upload project to VM

From your local machine:

```bash
scp -r "SQLI Sentinel" ubuntu@<VM_PUBLIC_IP>:/home/ubuntu/
```

## 3. Run automated deploy

SSH into VM:

```bash
ssh ubuntu@<VM_PUBLIC_IP>
cd "/home/ubuntu/SQLI Sentinel"
sudo bash backend_v2/deploy/oci/deploy_systemd.sh
```

## 4. Set production secret and frontend origin

```bash
sudo nano /etc/sqli-sentinel/backend.env
```

Mandatory changes:

- `SQLI_SENTINEL_SECRET` -> strong random value
- `SQLI_SENTINEL_ALLOWED_ORIGINS` -> your real frontend URL(s)

Then restart:

```bash
sudo systemctl restart sqli-sentinel-backend
```

## 5. Verify service

```bash
curl http://127.0.0.1:8000/api/health
curl http://<VM_PUBLIC_IP>:8000/api/health
curl http://<VM_PUBLIC_IP>:8000/api/metrics
```

## 6. Logs and service operations

```bash
sudo systemctl status sqli-sentinel-backend
sudo journalctl -u sqli-sentinel-backend -n 200 --no-pager
sudo systemctl restart sqli-sentinel-backend
```

## 7. Update deployment

When code changes:

```bash
cd "/home/ubuntu/SQLI Sentinel"
sudo bash backend_v2/deploy/oci/deploy_systemd.sh
```

## 8. Recommended next hardening

1. Put Nginx/Caddy in front and move public port to `443`.
2. Close public `8000` and allow only reverse proxy locally.
3. Add daily SQLite backup job (DB + WAL + SHM files).
4. Enable domain-based TLS certificate.
