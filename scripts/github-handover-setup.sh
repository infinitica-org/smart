#!/usr/bin/env bash
# One-time GitHub repo setup for pilot handover (requires admin on infinitica-org/smart).
set -euo pipefail

REPO="${GITHUB_REPO:-infinitica-org/smart}"

echo "==> Creating develop branch from main (if missing)"
if ! gh api "repos/$REPO/branches/develop" >/dev/null 2>&1; then
  MAIN_SHA="$(gh api "repos/$REPO/git/refs/heads/main" --jq .object.sha)"
  gh api "repos/$REPO/git/refs" -f ref="refs/heads/develop" -f sha="$MAIN_SHA"
  echo "    created develop @ $MAIN_SHA"
else
  echo "    develop already exists"
fi

echo "==> Setting default branch to develop"
gh api "repos/$REPO" -X PATCH -f default_branch=develop

echo "==> Creating labels"
create_label() {
  local name="$1" color="$2" desc="$3"
  gh label create "$name" --repo "$REPO" --color "$color" --description "$desc" --force 2>/dev/null || true
}

create_label "P0-blocker" "b60205" "Blocks sprint progress"
create_label "P1-high" "d93f0b" "High priority"
create_label "P2-normal" "0e8a16" "Normal priority"
create_label "P3-low" "c5def5" "Low priority"
create_label "area:backend" "1d76db" "API / platform core"
create_label "area:frontend" "5319e7" "Web apps / UI"
create_label "area:ai" "7057ff" "AI gateway / evaluation"
create_label "area:data" "006b75" "Catalog / calibration / analytics"
create_label "area:infra" "e99695" "Docker / CI / VPS"
create_label "area:contracts" "fbca04" "@smart/contracts"
for s in 0 1 2 3 4 5; do
  create_label "sprint-$s" "ededed" "Sprint $s"
done

echo "==> Branch protection (main + develop)"
for branch in main develop; do
  gh api "repos/$REPO/branches/$branch/protection" -X PUT \
    --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "checks": [
      {"context": "lint"},
      {"context": "typecheck"},
      {"context": "unit tests"},
      {"context": "build"},
      {"context": "compose config"}
    ]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
  echo "    protected $branch"
done

echo "==> Deleting stale branch fix/S0-VV-local-dev-unblock (if present)"
gh api -X DELETE "repos/$REPO/git/refs/heads/fix/S0-VV-local-dev-unblock" 2>/dev/null || true

echo "Done. Verify: gh repo view $REPO --json defaultBranchRef"
