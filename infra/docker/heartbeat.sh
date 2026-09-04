#!/bin/sh
# External dead-man's-switch heartbeat.
#
# Every HEARTBEAT_INTERVAL_SECONDS, checks HEARTBEAT_CHECK_URL (the api container
# on the same Docker network) and pings Healthchecks.io with the result:
#   - check passes  -> ping $HEALTHCHECKS_PING_URL          (success)
#   - check fails   -> ping $HEALTHCHECKS_PING_URL/fail     (immediate alert)
#   - box/network/Docker daemon dead -> no ping reaches Healthchecks.io at all,
#     and its own grace-period timeout fires the alert instead. This is what
#     catches "the VPS itself is unreachable", which nothing running on the
#     VPS (Uptime Kuma included) can ever detect about itself.
#
# Set the Healthchecks.io check's grace period comfortably above the interval
# (e.g. interval=60s, grace period=5m) so one slow response doesn't page you.
set -eu

: "${HEARTBEAT_INTERVAL_SECONDS:=60}"
: "${HEARTBEAT_CHECK_URL:=http://api:3000/health}"

if [ -z "${HEALTHCHECKS_PING_URL:-}" ]; then
  echo "heartbeat: HEALTHCHECKS_PING_URL not set — disabled, idling."
  exec sleep infinity
fi

echo "heartbeat: checking ${HEARTBEAT_CHECK_URL} every ${HEARTBEAT_INTERVAL_SECONDS}s, reporting to Healthchecks.io"

while true; do
  if curl -fsS -m 5 "$HEARTBEAT_CHECK_URL" >/dev/null 2>&1; then
    curl -fsS -m 10 -o /dev/null "$HEALTHCHECKS_PING_URL" || true
  else
    echo "heartbeat: ${HEARTBEAT_CHECK_URL} failed — signalling failure to Healthchecks.io"
    curl -fsS -m 10 -o /dev/null "$HEALTHCHECKS_PING_URL/fail" || true
  fi
  sleep "$HEARTBEAT_INTERVAL_SECONDS"
done
