#!/usr/bin/env bash
# Fails fast with a clear message if the k6 CLI isn't on PATH, instead of
# letting `pnpm stress:*` die with a cryptic "k6: command not found".
set -euo pipefail

if command -v k6 >/dev/null 2>&1; then
  exit 0
fi

cat >&2 <<'EOF'
[load-tests] k6 is not installed or not on PATH.

Install it locally:
  macOS:    brew install k6
  Windows:  choco install k6   (or:  winget install k6)
  Linux:    see https://k6.io/docs/get-started/installation/

Or run any test via the official Docker image instead (no local install):
  docker run --rm -i --network smart_default \
    -e API_URL=http://api:3000 \
    -v "$(pwd)/tools/load-tests:/scripts" -w /scripts \
    grafana/k6:latest run src/tests/smoke.js

(--network smart_default only applies when targeting the docker-compose
stack directly by container name; against host-published ports, drop it and
use http://host.docker.internal:3000 instead.)
EOF
exit 1
