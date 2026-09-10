#!/usr/bin/env bash
# Polls every service the load-test suite depends on until healthy, or fails
# after a timeout — makes stack startup deterministic instead of racing k6
# against containers that are still booting.
set -euo pipefail

API_URL="${API_URL:-http://localhost:3000}"
APP_STUDENT_URL="${APP_STUDENT_URL:-http://localhost:3001}"
APP_TPO_URL="${APP_TPO_URL:-http://localhost:3002}"
APP_ADMIN_URL="${APP_ADMIN_URL:-http://localhost:3003}"
APP_VERIFY_URL="${APP_VERIFY_URL:-http://localhost:3004}"
AUTH_URL="${AUTH_URL:-http://localhost:3005}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
GRAFANA_URL="${GRAFANA_URL:-http://localhost:3100}"
TIMEOUT_SECONDS="${WAIT_TIMEOUT_SECONDS:-120}"

check() {
  local name="$1" url="$2"
  local waited=0
  until curl -fsS -o /dev/null "$url" 2>/dev/null; do
    waited=$((waited + 2))
    if [ "$waited" -ge "$TIMEOUT_SECONDS" ]; then
      echo "[wait-for-services] TIMEOUT waiting for $name ($url) after ${TIMEOUT_SECONDS}s" >&2
      return 1
    fi
    sleep 2
  done
  echo "[wait-for-services] $name is up ($url)"
}

check "api /health" "$API_URL/health"
check "api /ready" "$API_URL/ready"
check "web-student" "$APP_STUDENT_URL/health"
check "web-tpo" "$APP_TPO_URL/health"
check "web-admin" "$APP_ADMIN_URL/health"
check "web-verify" "$APP_VERIFY_URL/health"
check "web-auth" "$AUTH_URL/health"

if [ "${SKIP_OBS_WAIT:-}" != "true" ]; then
  check "prometheus" "$PROMETHEUS_URL/-/healthy"
  check "grafana" "$GRAFANA_URL/api/health"
fi

echo "[wait-for-services] All services healthy."
