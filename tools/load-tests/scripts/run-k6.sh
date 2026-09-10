#!/usr/bin/env bash
# Runs one k6 test file with sensible defaults: loads tools/load-tests/.env
# if present, and auto-enables Prometheus remote-write output (so a run shows
# up live in Grafana) whenever Prometheus is actually reachable — falls back
# to k6's local-only output otherwise, so this works with or without the
# `obs` compose profile running.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOAD_TESTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$LOAD_TESTS_DIR"

bash scripts/require-k6.sh

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

TEST_FILE="${1:?Usage: run-k6.sh <src/tests/....js> [k6-args...]}"
shift || true

PROM_HEALTH_URL="${PROM_HEALTH_URL:-http://localhost:${PROMETHEUS_PORT:-9090}/-/healthy}"
PROM_RW_URL="${K6_PROMETHEUS_RW_SERVER_URL:-http://localhost:${PROMETHEUS_PORT:-9090}/api/v1/write}"

K6_ARGS=(run)
if curl -fsS -o /dev/null "$PROM_HEALTH_URL" 2>/dev/null; then
  echo "[run-k6] Prometheus reachable — enabling remote-write output ($PROM_RW_URL)"
  export K6_PROMETHEUS_RW_SERVER_URL="$PROM_RW_URL"
  export K6_PROMETHEUS_RW_TREND_STATS="${K6_PROMETHEUS_RW_TREND_STATS:-p(50),p(95),p(99),avg,min,max}"
  K6_ARGS+=(-o experimental-prometheus-rw)
else
  echo "[run-k6] Prometheus not reachable at $PROM_HEALTH_URL — running with local output only."
  echo "[run-k6] Start the observability stack with: pnpm infra:obs"
fi

K6_ARGS+=("$TEST_FILE" "$@")
exec k6 "${K6_ARGS[@]}"
