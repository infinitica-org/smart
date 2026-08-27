#!/usr/bin/env bash
# SMART — create long-lived branches + apply GitHub branch protection
#
# Prerequisites (run on your machine as @brittytino, org admin on the repo):
#   1. Install GitHub CLI: https://cli.github.com/
#   2. gh auth login   # HTTPS or SSH; must be brittytino with admin on the repo
#   3. Confirm remote: git remote -v
#        Prefer: https://github.com/infinitica-org/smart.git  (or your canonical org)
#
# Usage:
#   bash scripts/github/protect-branches.sh                 # create + protect
#   bash scripts/github/protect-branches.sh --protect-only  # protection only
#   bash scripts/github/protect-branches.sh --dry-run
#
# Manual UI (if you prefer not to use the script):
#   GitHub → Settings → Branches → Add branch protection rule
#   --- main ---
#   Branch name pattern: main
#   ☑ Require a pull request before merging
#   ☑ Require approvals: 1
#   ☑ Require status checks to pass: lint, typecheck, unit tests, build
#   ☑ Require conversation resolution
#   ☑ Require linear history
#   ☑ Do not allow bypassing the above settings
#   ☑ Restrict who can push to matching branches → brittytino ONLY
#   ☐ Allow force pushes   ☐ Allow deletions
#   --- qa ---  same as main (approver: Tino / brittytino)
#   --- dev --- Require PR + 1 approval + status checks; no force push; no delete
#
set -euo pipefail

DRY_RUN=0
PROTECT_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --protect-only) PROTECT_ONLY=1 ;;
    -h|--help) sed -n '2,35p' "$0"; exit 0 ;;
  esac
done

run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] $*"
  else
    "$@"
  fi
}

if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR: GitHub CLI (gh) is not installed. Install from https://cli.github.com/" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "ERROR: Not logged in. Run: gh auth login" >&2
  exit 1
fi

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
echo "Repo: $REPO"
echo "Actor: $(gh api user -q .login)"

# Resolve tip for new long-lived branches (prefer `dev`, else main)
SOURCE_REF="origin/dev"
if ! git rev-parse --verify "$SOURCE_REF" >/dev/null 2>&1; then
  git fetch origin
fi
if git rev-parse --verify origin/dev >/dev/null 2>&1; then
  SOURCE_REF="origin/dev"
else
  SOURCE_REF="origin/main"
fi
echo "Source tip: $SOURCE_REF ($(git rev-parse --short "$SOURCE_REF"))"

create_branch() {
  local name="$1"
  if gh api "repos/$REPO/git/ref/heads/$name" >/dev/null 2>&1; then
    echo "Branch '$name' already exists — skip create"
    return 0
  fi
  local sha
  sha="$(git rev-parse "$SOURCE_REF")"
  echo "Creating '$name' at $sha"
  run gh api -X POST "repos/$REPO/git/refs" \
    -f ref="refs/heads/$name" \
    -f sha="$sha"
}

protect_strict() {
  # Used for main + qa — only brittytino may push
  local branch="$1"
  echo "Protecting '$branch' (strict / brittytino-only push)"
  run gh api -X PUT "repos/$REPO/branches/$branch/protection" \
    --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["lint", "typecheck", "unit tests", "build"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true
  },
  "restrictions": {
    "users": ["brittytino"],
    "teams": [],
    "apps": []
  },
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": true,
  "required_conversation_resolution": true
}
EOF
}

protect_dev() {
  local branch="$1"
  echo "Protecting '$branch' (team PRs, no direct push)"
  # restrictions: null = anyone with write can merge via PR after checks
  # For classic protection API, omit restrictions by sending null via raw
  run gh api -X PUT "repos/$REPO/branches/$branch/protection" \
    --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["lint", "typecheck", "unit tests", "build"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": true,
  "required_conversation_resolution": true
}
EOF
}

if [[ "$PROTECT_ONLY" -eq 0 ]]; then
  create_branch "dev"
  create_branch "qa"
fi

protect_strict "main"
protect_strict "qa"
protect_dev "dev"

echo
echo "Done."
echo "Next:"
echo "  1. Tell the team: default base is 'dev' (develop is deprecated)."
echo "  2. Repo Settings → General → Default branch → set to 'dev'."
echo "  3. Optionally delete or lock 'develop' after all open PRs retarget 'dev'."
echo "  4. Close S0-TN-01 (Th6-128 / issue #26) with DoD evidence."
