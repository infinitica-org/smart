#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> SMART bootstrap"
if ! command -v pnpm >/dev/null; then
  echo "Install pnpm 11 / Node 22.20 first (see .nvmrc)."
  exit 1
fi

cp -n .env.example .env 2>/dev/null || true
pnpm install
pnpm --filter @smart/contracts build

if command -v docker >/dev/null; then
  echo "==> starting data plane (postgres, redis, redpanda, minio)"
  pnpm infra:up
  echo "==> waiting for postgres"
  until docker compose -f infra/docker/docker-compose.yml exec -T postgres pg_isready -U smart >/dev/null 2>&1; do
    sleep 1
  done
  pnpm db:generate
  pnpm db:deploy || pnpm --filter @smart/api-core exec prisma migrate dev --name init --skip-seed || true
  pnpm db:seed || true
else
  echo "Docker not found — skipping infra. Catalog still serves contract defaults."
  pnpm db:generate || true
fi

echo
echo "Ready."
echo "  API:      pnpm dev:api          -> http://localhost:3000/health"
echo "  Student:  pnpm --filter @smart/web-student dev"
echo "  Login:    student@smart.local / ChangeMe!Dev"
echo "  Guide:    TEAM.md and docs/delivery/ENGINEER_GUIDES.md"
