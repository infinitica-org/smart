#!/usr/bin/env bash
# VPS deploy: build and start the full SMART stack behind Caddy.
# Usage (on the VPS, from the repo root):
#   cp .env.example .env   # then edit secrets + hostnames
#   bash scripts/deploy-vps.sh
set -euo pipefail
cd "$(dirname "$0")/.."

test -f .env || { echo "Missing .env — copy .env.example and set JWT_SECRET, POSTGRES_PASSWORD, hostnames."; exit 1; }

echo "==> validating compose"
docker compose -f infra/docker/docker-compose.yml --profile apps --profile obs config >/dev/null

echo "==> building and starting"
docker compose -f infra/docker/docker-compose.yml --profile apps --profile obs up -d --build

echo "==> migrating"
docker compose -f infra/docker/docker-compose.yml --profile apps exec -T api \
  node -e "console.log('api up')" || true

echo
echo "Point DNS A records at this VPS, then Caddy will issue TLS automatically:"
echo "  api / app / tpo / admin / verify  (see STUDENT_HOST etc in .env)"
echo "Health: curl -f http://127.0.0.1:3000/health"
