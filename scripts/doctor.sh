#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
check() {
  if eval "$2" >/dev/null 2>&1; then
    echo "ok   $1"
  else
    echo "FAIL $1"
    fail=1
  fi
}

check "node >= 22" "node -e 'process.exit(Number(process.versions.node.split(\".\")[0])>=22?0:1)'"
check "pnpm" "command -v pnpm"
check "docker" "command -v docker"
check ".env exists" "test -f .env"
check "lockfile" "test -f pnpm-lock.yaml"
check "lockfile importers" "node ./scripts/check-lockfile.mjs"

if command -v docker >/dev/null; then
  check "compose file" "docker compose -f infra/docker/docker-compose.yml config"
fi

exit "$fail"
