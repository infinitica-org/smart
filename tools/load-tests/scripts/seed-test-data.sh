#!/usr/bin/env bash
# Seeds base fixture data (tracks/levels/items/demo accounts) then N
# additional load-test student accounts. Idempotent — safe to re-run with a
# larger TEST_DATA_USERS to scale up an existing dataset.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$REPO_ROOT"

TEST_DATA_USERS="${TEST_DATA_USERS:-200}"
TEST_DATA_TRACK_CODE="${TEST_DATA_TRACK_CODE:-TECH_FULLSTACK}"

echo "[seed-test-data] Base seed (tracks/levels/items/demo accounts)..."
pnpm --filter @smart/api-core db:seed

echo "[seed-test-data] $TEST_DATA_USERS load-test student accounts on $TEST_DATA_TRACK_CODE..."
TEST_DATA_USERS="$TEST_DATA_USERS" TEST_DATA_TRACK_CODE="$TEST_DATA_TRACK_CODE" \
  pnpm --filter @smart/api-core db:seed:load-test

echo "[seed-test-data] Done. Data file: tools/load-tests/src/data/users.json"
