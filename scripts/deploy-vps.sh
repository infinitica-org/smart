#!/usr/bin/env bash
# Deploy SMART on a VPS from a named environment file.
#
#   bash scripts/deploy-vps.sh dev    # kvm2 — no Caddy (qa owns :80/:443)
#   bash scripts/deploy-vps.sh qa     # kvm2 — apps + Caddy + obs
#   bash scripts/deploy-vps.sh prod   # kvm4 — apps + Caddy + obs
#
# On the server: copy .env.<name>.example → .env.<name>, fill secrets, then run.
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_NAME="${1:-}"
if [[ -z "$ENV_NAME" || ! "$ENV_NAME" =~ ^(dev|qa|prod)$ ]]; then
  echo "Usage: bash scripts/deploy-vps.sh <dev|qa|prod>"
  echo "  kvm2 → dev and qa   |   kvm4 → prod"
  exit 1
fi

ENV_FILE=".env.${ENV_NAME}"
test -f "$ENV_FILE" || {
  echo "Missing ${ENV_FILE} — copy .env.${ENV_NAME}.example, fill secrets, never commit it."
  exit 1
}

COMPOSE=(docker compose --env-file "$ENV_FILE" -f infra/docker/docker-compose.yml)

case "$ENV_NAME" in
  dev) PROFILES=(--profile apps) ;;
  qa | prod) PROFILES=(--profile apps --profile vps --profile obs) ;;
esac

echo "==> ${ENV_NAME}: validate compose (${ENV_FILE})"
"${COMPOSE[@]}" "${PROFILES[@]}" config >/dev/null

echo "==> ${ENV_NAME}: build and start"
"${COMPOSE[@]}" "${PROFILES[@]}" up -d --build

echo "==> ${ENV_NAME}: api probe"
"${COMPOSE[@]}" --profile apps exec -T api \
  node -e "console.log('api container up')" || true

echo
echo "Environment: ${ENV_NAME}"
echo "Next: apply migrations (Vishal V):"
echo "  ${COMPOSE[*]} --profile apps exec -T api npx prisma migrate deploy"
echo "Health: curl -f http://127.0.0.1:\${API_PORT:-3000}/health"
