#!/usr/bin/env bash
# Seed the database on a VPS from a named environment file.
#
#   bash scripts/seed-vps.sh dev    # kvm2 — smart-dev
#   bash scripts/seed-vps.sh qa     # kvm2 — smart-qa
#   bash scripts/seed-vps.sh prod   # kvm4 — smart-prod
#
# Run this from the deploy checkout (~deploy/smart on the server — NOT ~root,
# and NOT a fresh `git clone`; deploys land there via CI rsync, there is no
# .git here to pull).
#
# The running `api` container is a slim production image — no pnpm, no
# TypeScript source (see infra/docker/Dockerfile.api) — so `prisma/seed.ts`
# cannot run inside it via `docker compose exec`. This builds the
# intermediate "build" stage (full source + devDependencies), runs the seed
# once against the live compose network, then discards the temporary image.
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_NAME="${1:-}"
if [[ -z "$ENV_NAME" || ! "$ENV_NAME" =~ ^(dev|qa|prod)$ ]]; then
  echo "Usage: bash scripts/seed-vps.sh <dev|qa|prod>"
  echo "  kvm2 → dev / qa   |   kvm4 → prod"
  exit 1
fi

ENV_FILE=".env.${ENV_NAME}"
test -f "$ENV_FILE" || {
  echo "Missing ${ENV_FILE} — run this from the deploy checkout, not a fresh clone."
  exit 1
}

COMPOSE=(docker compose --env-file "$ENV_FILE" -f infra/docker/docker-compose.yml)
IMAGE_TAG="smart-api-seed-tmp"

echo "==> ${ENV_NAME}: locate the running postgres network"
POSTGRES_CID="$("${COMPOSE[@]}" --profile apps ps -q postgres)"
test -n "$POSTGRES_CID" || {
  echo "postgres is not running — start the stack first (scripts/deploy-vps.sh ${ENV_NAME})."
  exit 1
}
NETWORK="$(docker inspect "$POSTGRES_CID" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}')"

echo "==> ${ENV_NAME}: build source stage for seeding (${IMAGE_TAG})"
DOCKER_BUILDKIT=1 docker build --target build -f infra/docker/Dockerfile.api -t "$IMAGE_TAG" .

cleanup() { docker rmi "$IMAGE_TAG" >/dev/null 2>&1 || true; }
trap cleanup EXIT

PGPW="$(grep -oP '^POSTGRES_PASSWORD=\K.*' "$ENV_FILE")"

echo "==> ${ENV_NAME}: seed"
docker run --rm --network "$NETWORK" \
  -e DATABASE_URL="postgresql://smart:${PGPW}@postgres:5432/smart?schema=public" \
  -w /app/apps/api-core \
  "$IMAGE_TAG" \
  pnpm exec tsx prisma/seed.ts

echo
echo "Environment: ${ENV_NAME} — seeded."
