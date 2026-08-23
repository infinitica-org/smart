#!/usr/bin/env bash
# One-command local setup. Fail loud — a teammate who thinks they are unblocked
# when migrate/seed silently failed is the Monday-morning fire we are preventing.
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE=(docker compose -f infra/docker/docker-compose.yml)

die() {
  echo
  echo "ERROR: $*" >&2
  echo "Next: pnpm doctor   or   docs/delivery/LOCAL_DEV.md" >&2
  exit 1
}

echo "==> SMART bootstrap"
command -v pnpm >/dev/null || die "Install pnpm 11 / Node 22.20 first (see .nvmrc)."

cp -n .env.example .env 2>/dev/null || true
pnpm install
pnpm --filter @smart/contracts build

if ! command -v docker >/dev/null; then
  die "Docker is required for bootstrap. Install Docker Desktop, then re-run pnpm bootstrap."
fi

echo "==> starting data plane (postgres, redis, redpanda, minio, mailpit)"
pnpm infra:up

echo "==> waiting for postgres"
until "${COMPOSE[@]}" exec -T postgres pg_isready -U smart -d smart >/dev/null 2>&1; do
  sleep 1
done

echo "==> waiting for redis"
until "${COMPOSE[@]}" exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; do
  sleep 1
done

echo "==> waiting for redpanda (kafka)"
until "${COMPOSE[@]}" exec -T redpanda rpk cluster health 2>/dev/null | grep -qi 'Healthy\|ok'; do
  sleep 1
done

pnpm db:generate
pnpm db:deploy
pnpm db:seed

echo
echo "Ready."
echo "  API:      pnpm dev:api          -> http://localhost:3000/health"
echo "  Swagger:  http://localhost:3000/api/docs"
echo "  Student:  pnpm --filter @smart/web-student dev"
echo "  Login:    student@smart.local / ChangeMe!Dev"
echo "  Obs:      pnpm infra:obs        -> Prometheus :9090, Grafana :3100, Loki :3101"
echo "  Verify:   pnpm verify:handover  (API + four portals must be running)"
echo "  Guide:    TEAM.md and docs/delivery/LOCAL_DEV.md"
