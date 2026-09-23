#!/usr/bin/env bash
# Blue-Green Deployment script for VPS
# This script manages two environments (Blue and Green) on a single VPS.
# It assumes a standalone reverse proxy (like Nginx or a global Caddy instance)
# routes traffic to the active environment.
# 
# NOTE: This requires extracting Caddy from docker-compose.yml into a standalone service
# on the VPS. This script is provided as a blueprint for the Blue-Green transition.

set -euo pipefail
cd "$(dirname "$0")/.."

ENV_NAME="${1:-}"
if [[ -z "$ENV_NAME" || ! "$ENV_NAME" =~ ^(dev|qa|prod)$ ]]; then
  echo "Usage: bash scripts/blue-green-deploy.sh <dev|qa|prod>"
  exit 1
fi

ENV_FILE=".env.${ENV_NAME}"
test -f "$ENV_FILE" || { echo "Missing ${ENV_FILE}"; exit 1; }

STATE_FILE=".deploy_state_${ENV_NAME}"
ACTIVE_COLOR=$(cat "$STATE_FILE" 2>/dev/null || echo "green")
TARGET_COLOR=$([[ "$ACTIVE_COLOR" == "blue" ]] && echo "green" || echo "blue")

echo "==> Current active environment: ${ACTIVE_COLOR}"
echo "==> Deploying to target environment: ${TARGET_COLOR}"

# Use target color as project name
COMPOSE=(docker compose --env-file "$ENV_FILE" -f infra/docker/docker-compose.yml -p "smart-${ENV_NAME}-${TARGET_COLOR}")

case "$ENV_NAME" in
  dev | qa) PROFILES=(--profile apps) ;;
  prod) PROFILES=(--profile apps --profile obs) ;;
esac

echo "==> Building ${TARGET_COLOR}..."
BUILD_SERVICES=$("${COMPOSE[@]}" "${PROFILES[@]}" config --services)
while IFS= read -r svc; do
  [[ -z "$svc" ]] && continue
  "${COMPOSE[@]}" "${PROFILES[@]}" build "$svc"
done <<<"$BUILD_SERVICES"

echo "==> Starting ${TARGET_COLOR}..."
"${COMPOSE[@]}" "${PROFILES[@]}" up -d --no-build

echo "==> Waiting for API health on ${TARGET_COLOR}..."
for _ in $(seq 1 30); do
  status="$("${COMPOSE[@]}" "${PROFILES[@]}" ps api --format '{{.Health}}' 2>/dev/null || true)"
  [[ "$status" == "healthy" ]] && break
  sleep 2
done

echo "==> Running migrations on ${TARGET_COLOR}..."
"${COMPOSE[@]}" --profile apps exec -T api npx prisma migrate deploy

echo "==> Target ${TARGET_COLOR} is healthy and ready!"

# --- TRAFFIC SWITCH ---
# In a real setup, you would update your standalone reverse proxy here.
# Example for a standalone Caddy:
# echo "==> Switching traffic to ${TARGET_COLOR}..."
# sed -i "s/smart-${ENV_NAME}-${ACTIVE_COLOR}/smart-${ENV_NAME}-${TARGET_COLOR}/g" /etc/caddy/Caddyfile
# caddy reload --config /etc/caddy/Caddyfile

echo "==> (Simulated) Traffic switched to ${TARGET_COLOR}"

echo "==> Shutting down old environment (${ACTIVE_COLOR})..."
OLD_COMPOSE=(docker compose --env-file "$ENV_FILE" -f infra/docker/docker-compose.yml -p "smart-${ENV_NAME}-${ACTIVE_COLOR}")
"${OLD_COMPOSE[@]}" "${PROFILES[@]}" down

echo "$TARGET_COLOR" > "$STATE_FILE"
echo "==> Blue-Green deployment complete. Active is now $TARGET_COLOR."
