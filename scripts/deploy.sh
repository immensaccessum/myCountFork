#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER="root@178.17.48.118"
PORT=2255
REMOTE_DIR="/opt/mycount-fork"
NGINX_SSL="/etc/nginx/conf.d/domains/app4.letovrf.ru.ssl.conf"

cd "$ROOT"
npm run build

echo "→ Sync static build (dist/)…"
rsync -avz --delete --exclude 'server' \
  -e "ssh -p $PORT" \
  "$ROOT/dist/" "$SERVER:$REMOTE_DIR/"

echo "→ Sync API/OG server…"
rsync -avz --exclude '.data' --exclude 'node_modules' \
  -e "ssh -p $PORT" \
  "$ROOT/server/" "$SERVER:$REMOTE_DIR/server/"

echo "→ Configure systemd + nginx on server…"
ssh -p "$PORT" "$SERVER" bash -s <<REMOTE
set -euo pipefail
cd "$REMOTE_DIR/server" && npm install --omit=dev --no-audit --no-fund --loglevel=error
install -m 644 "$REMOTE_DIR/server/mycount-fork.service" /etc/systemd/system/mycount-fork.service
systemctl daemon-reload
systemctl enable mycount-fork
systemctl restart mycount-fork

# Rebuild nginx SSL vhost if our locations are missing
if ! grep -q 'location /api/' "$NGINX_SSL" 2>/dev/null; then
  cat > "$NGINX_SSL" <<'NGINX'
server {
    listen      178.17.48.118:443 ssl;
    server_name app4.letovrf.ru;

    ssl_certificate     /home/mydomainuser/conf/web/app4.letovrf.ru/ssl/app4.letovrf.ru.pem;
    ssl_certificate_key /home/mydomainuser/conf/web/app4.letovrf.ru/ssl/app4.letovrf.ru.key;

    root /opt/mycount-fork;
    index index.html;

    location ^~ /.well-known/acme-challenge/ {
        root /home/mydomainuser/web/app4.letovrf.ru/public_html;
        allow all;
    }

    include /opt/mycount-fork/server/nginx-app4.conf;
}
NGINX
fi

nginx -t
systemctl reload nginx
systemctl is-active mycount-fork
REMOTE

echo "Deployed to https://app4.letovrf.ru/ru/"
