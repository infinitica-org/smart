#!/usr/bin/env bash
# Sprint 0 handover smoke checks — run after bootstrap (see docs/delivery/BOOTSTRAP_SIGNOFF.md).
set -euo pipefail

API_URL="${SMART_API_URL:-http://localhost:3000}"
FAIL=0

check() {
  local name="$1"
  shift
  if "$@"; then
    echo "  OK  $name"
  else
    echo "  FAIL $name"
    FAIL=1
  fi
}

echo "==> SMART handover verification"
echo "    API: $API_URL"
echo

check "GET /health" curl -sf "$API_URL/health" >/dev/null
check "GET /ready" curl -sf "$API_URL/ready" >/dev/null

TRACK_COUNT="$(curl -sf "$API_URL/api/v1/catalog/tracks" | node -e "
  let d='';
  process.stdin.on('data',c=>d+=c);
  process.stdin.on('end',()=>{
    const j=JSON.parse(d);
    const n=Array.isArray(j)?j.length:(j.data?.length??0);
    process.stdout.write(String(n));
  });
" 2>/dev/null || echo 0)"

if [ "$TRACK_COUNT" = "10" ]; then
  echo "  OK  catalog returns 10 tracks"
else
  echo "  FAIL catalog returns 10 tracks (got $TRACK_COUNT)"
  FAIL=1
fi

for port in 3001 3002 3003 3004; do
  check "portal :$port responds" curl -sf -o /dev/null "http://localhost:$port/"
done

echo
if [ "$FAIL" -eq 0 ]; then
  echo "All handover checks passed."
  exit 0
fi

echo "One or more checks failed. See docs/delivery/LOCAL_DEV.md"
exit 1
