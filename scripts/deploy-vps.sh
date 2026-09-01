#!/usr/bin/env bash
# Deploy SMART on a VPS from a named environment file.
#
#   bash scripts/deploy-vps.sh dev    # kvm2 — apps + Caddy (owns :80/:443 on kvm2)
#   bash scripts/deploy-vps.sh qa     # kvm2 — apps + Caddy + obs (not currently deployed)
#   bash scripts/deploy-vps.sh prod   # kvm4 — apps + Caddy + obs
#
# On the server: copy .env.<name>.example → .env.<name>, fill secrets, then run.
# Applies already-committed Prisma migrations automatically (migrate deploy only —
# migrations are still authored exclusively via `pnpm db:migrate` locally).
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_NAME="${1:-}"
if [[ -z "$ENV_NAME" || ! "$ENV_NAME" =~ ^(dev|qa|prod)$ ]]; then
  echo "Usage: bash scripts/deploy-vps.sh <dev|qa|prod>"
  echo "  kvm2 → dev (Caddy owner) and qa (inactive)   |   kvm4 → prod"
  exit 1
fi

ENV_FILE=".env.${ENV_NAME}"
test -f "$ENV_FILE" || {
  echo "Missing ${ENV_FILE} — copy .env.${ENV_NAME}.example, fill secrets, never commit it."
  exit 1
}

# `docker compose build` hands the whole service graph to a single BuildKit
# "bake" call, which parallelizes across services on its own — `--parallel`
# only throttles non-build lifecycle ops, it does NOT limit bake concurrency.
# Building 5 Next.js apps + the API at once pinned a small VPS (kvm2) hard
# enough that even sshd stopped completing handshakes for 20+ minutes. Build
# every service strictly one at a time instead.
COMPOSE=(docker compose --env-file "$ENV_FILE" -f infra/docker/docker-compose.yml)

case "$ENV_NAME" in
  dev) PROFILES=(--profile apps --profile vps) ;;
  qa | prod) PROFILES=(--profile apps --profile vps --profile obs) ;;
esac

echo "==> ${ENV_NAME}: validate compose (${ENV_FILE})"
"${COMPOSE[@]}" "${PROFILES[@]}" config >/dev/null

BUILD_SERVICES=$("${COMPOSE[@]}" "${PROFILES[@]}" config --services)
echo "==> ${ENV_NAME}: build (sequential — one service at a time)"
while IFS= read -r svc; do
  [[ -z "$svc" ]] && continue
  echo "    building ${svc}..."
  "${COMPOSE[@]}" "${PROFILES[@]}" build "$svc"
done <<<"$BUILD_SERVICES"

echo "==> ${ENV_NAME}: start"
"${COMPOSE[@]}" "${PROFILES[@]}" up -d --no-build

echo "==> ${ENV_NAME}: wait for api container to be healthy"
for _ in $(seq 1 30); do
  status="$("${COMPOSE[@]}" "${PROFILES[@]}" ps api --format '{{.Health}}' 2>/dev/null || true)"
  [[ "$status" == "healthy" ]] && break
  sleep 2
done

echo "==> ${ENV_NAME}: apply Prisma migrations (migrate deploy — no new migrations authored here)"
"${COMPOSE[@]}" --profile apps exec -T api npx prisma migrate deploy

echo "==> ${ENV_NAME}: health check"
"${COMPOSE[@]}" --profile apps exec -T api \
  node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

echo
echo "Environment: ${ENV_NAME} — deployed, migrated, healthy."
