#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER="root@178.17.48.118"
PORT=2255
REMOTE_DIR="/opt/mycount-fork"

cd "$ROOT"
npm run build

rsync -avz --delete \
  -e "ssh -p $PORT" \
  --exclude '.git' --exclude 'node_modules' --exclude 'src' --exclude 'scripts' \
  "$ROOT/" "$SERVER:$REMOTE_DIR/"

echo "Deployed to https://app4.letovrf.ru/ru/"
