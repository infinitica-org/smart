#!/usr/bin/env bash
# Import Sprint 1 tickets from AGILE_PLAN.md into GitHub Issues (idempotent by title prefix).
set -euo pipefail

REPO="${GITHUB_REPO:-infinitica-org/smart}"

create_issue() {
  local id="$1" title="$2" owner="$3" pts="$4" pri="$5" area="$6"
  local full_title="[$id] $title"
  if gh issue list --repo "$REPO" --search "in:title \"$id\"" --json number --jq 'length' | grep -qv '^0$'; then
    echo "  skip $id (exists)"
    return
  fi
  local priority_label="P2-normal"
  case "$pri" in
    P0) priority_label="P0-blocker" ;;
    P1) priority_label="P1-high" ;;
    P2) priority_label="P2-normal" ;;
    P3) priority_label="P3-low" ;;
  esac
  gh issue create --repo "$REPO" \
    --title "$full_title" \
    --label "sprint-1" --label "$priority_label" --label "$area" \
    --body "**Ticket:** \`$id\`
**Owner:** $owner
**Points:** $pts
**Priority:** $pri

Source: \`docs/delivery/AGILE_PLAN.md\` §8 Sprint 1.

## Acceptance
- Meets \`docs/delivery/DEFINITION_OF_DONE.md\`
- PR into \`develop\` with ticket ID in commit title"
  echo "  created $id"
}

echo "==> Sprint 1 issues -> $REPO"

create_issue "S1-VV-01" "15-min access JWT + HttpOnly SameSite=Strict refresh rotation with reuse detection" "Vishal V" 5 P0 area:backend
create_issue "S1-VV-02" "RBAC guards + decorators: SUPER_ADMIN, INSTITUTION_ADMIN, PLACEMENT_STAFF, STUDENT, PUBLIC" "Vishal V" 3 P0 area:backend
create_issue "S1-VV-03" "OAuth (Google, GitHub) + SAML 2.0/OIDC institutional SSO with domain→institution mapping" "Vishal V" 8 P0 area:backend
create_issue "S1-VV-04" "Redis sliding-window + token-bucket Lua guard; X-RateLimit-* + Retry-After; 429 body per §4.2" "Vishal V" 5 P0 area:backend
create_issue "S1-VV-05" "Full endpoint throttle matrix from ARCHITECTURE.md §4.4 as declarative config" "Vishal V" 3 P0 area:backend
create_issue "S1-VV-06" "B2B X-SMART-API-KEY auth + per-key quota (500/hour) + key issuance admin API" "Vishal V" 5 P1 area:backend
create_issue "S1-VV-07" "Kafka producer/consumer base + outbox pattern + DLQ; all 8 topics registered from contracts" "Vishal V" 5 P0 area:backend
create_issue "S1-SV-01" "Student auth flow UI: SSO buttons, institution picker, track enrollment wizard" "Satheswaran V" 5 P0 area:frontend
create_issue "S1-SV-02" "Student dashboard shell: level stepper, tier trail, next-action card" "Satheswaran V" 5 P0 area:frontend
create_issue "S1-SV-03" "packages/ui v1: TierTrail, ConfidenceNote, LevelStepper, Timer, CodeEditor shell, AudioRecorder shell" "Satheswaran V" 8 P0 area:frontend
create_issue "S1-VB-01" "POST /assessment/start — attempt row + Redis session + level unlock gate (Bronze-or-above)" "Vishal Bharath R" 5 P0 area:backend
create_issue "S1-VB-02" "GET /assessment/next-item from items:form:* warm cache, < 50 ms, zero DB hit" "Vishal Bharath R" 5 P0 area:backend
create_issue "S1-VB-03" "POST /assessment/submit-l1 draft write-through to Redis + 5 s batch flush to Postgres" "Vishal Bharath R" 5 P0 area:backend
create_issue "S1-VB-04" "Admin console: institutions, users, role assignment" "Vishal Bharath R" 3 P1 area:frontend
create_issue "S1-RM-01" "ai-gateway: Redis token bucket 200 RPM / 10k TPM + 3 priority queues (P1 reserves 40 %)" "Ramansh" 8 P0 area:ai
create_issue "S1-RM-02" "Circuit breaker → Gemini 2.5 on 429/5xx/timeout, with integration test that forces failover" "Ramansh" 5 P0 area:ai
create_issue "S1-RM-03" "pgvector store + embedding service for competency blueprints, BARS anchors, JD vectors" "Ramansh" 5 P0 area:ai
create_issue "S1-RM-04" "claude_evaluation_audits write on every call: tokens, model, latency, cost, provider used" "Ramansh" 3 P0 area:ai
create_issue "S1-VG-01" "Item banks for MBA Finance + Business Analytics: 40 items each, weighted" "Vedika G" 8 P0 area:data
create_issue "S1-VG-02" "calibration: panel CRUD, Angoff estimate capture, cut-score derivation and publish" "Vedika G" 8 P0 area:data
create_issue "S1-VG-03" "catalog parallel-form selector + exposure tracking + item retirement flag" "Vedika G" 5 P0 area:data
create_issue "S1-VG-04" "content-pipeline embed — pushes BARS anchors and competency text into pgvector" "Vedika G" 3 P1 area:data

echo "Done."
