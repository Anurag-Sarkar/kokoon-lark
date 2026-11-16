#!/usr/bin/env bash
# Runs ON the EC2 instance. .github/workflows/deploy.yml pipes this file over SSH
# on every push to main; you can also run it by hand: `bash scripts/deploy.sh`.
#
# Builds the latest commit in a staging copy, then swaps it in and restarts pm2,
# so the live app never serves a half-written .next folder. If the new build
# fails its health check, the previous copy is swapped back.
set -euo pipefail

APP="$HOME/kokoon-lark"          # live checkout, pm2 runs here
STAGE="$HOME/kokoon-lark-stage"  # build copy
PREV="$HOME/kokoon-lark-prev"
REPO_URL="${REPO_URL:-https://github.com/Anurag-Sarkar/kokoon-lark.git}"
BRANCH="${BRANCH:-main}"
PM2_NAME="${PM2_NAME:-kokoon}"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}"

log() { printf '\n==> %s\n' "$*"; }

if [ ! -d "$STAGE/.git" ]; then
  log "Creating staging copy"
  rm -rf "$STAGE"
  git clone -q "$REPO_URL" "$STAGE"
fi

cd "$STAGE"
log "Fetching origin/$BRANCH"
git fetch -q --prune origin
git reset -q --hard "origin/$BRANCH"
git log -1 --oneline

log "Copying .env.local from the live app"
cp "$APP/.env.local" "$STAGE/.env.local"
chmod 600 "$STAGE/.env.local"

log "Installing dependencies"
npm ci --no-audit --no-fund

log "Building"
npm run build

log "Swapping in the new build"
rm -rf "$PREV"
mv "$APP" "$PREV"
mv "$STAGE" "$APP"
pm2 restart "$PM2_NAME" --update-env >/dev/null
pm2 save >/dev/null

log "Health check"
code="none"
healthy=0
for _ in $(seq 1 20); do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:3000/login || echo "000")
  if [ "$code" = "200" ]; then healthy=1; break; fi
  sleep 2
done

if [ "$healthy" != "1" ]; then
  log "Health check failed (last status $code). Rolling back to the previous build"
  mv "$APP" "$STAGE"
  mv "$PREV" "$APP"
  pm2 restart "$PM2_NAME" --update-env >/dev/null
  pm2 logs "$PM2_NAME" --nostream --lines 30 --no-color || true
  exit 1
fi

# The previous live copy becomes the next staging copy (keeps node_modules and the build cache warm).
mv "$PREV" "$STAGE"
log "Deployed $(git -C "$APP" rev-parse --short HEAD) and healthy"
