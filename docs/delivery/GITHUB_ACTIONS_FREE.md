# CI/CD & GitHub Plan Architecture

> Owner: Tino (System Architect) · Applies to: SMART Monorepo

---

## 1. Current Plan Status — GitHub Free

SMART is currently on the **GitHub Free** organisational plan.

| Limit                            | Value                                     |
| -------------------------------- | ----------------------------------------- |
| CI minutes (Linux runners)       | **2,000 minutes / month**                 |
| Concurrent jobs                  | 20                                        |
| CODEOWNERS enforcement           | ❌ Not available (Teams+ required)        |
| Required reviewers (branch rule) | ✅ Available (any user, not owner-scoped) |
| Self-hosted runners              | ✅ Unlimited                              |

> [!WARNING]
> The 2,000 monthly minutes are **already exhausted** as of September 2026. Until the plan is upgraded or a self-hosted runner is added, new CI runs will queue without starting.

### Immediate options (pick one)

| Option                             | Effort               | Cost                                | Notes                                                                                     |
| ---------------------------------- | -------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------- |
| **A. Upgrade to GitHub Teams**     | Low (billing change) | $4/user/month (~$24/mo for 6 users) | 3,000 minutes/month + CODEOWNERS enforcement unlocked — **recommended**                   |
| **B. Add a self-hosted runner**    | Medium (VPS setup)   | ~$0 (use an idle VM)                | Unlimited minutes; do NOT run on the same VPS as a live environment                       |
| **C. Reduce CI trigger frequency** | Low (config change)  | Free                                | Skip CI on `[skip ci]` commits; use `paths` filters to avoid running on docs-only changes |

---

## 2. CI Pipeline Architecture

Our CI pipeline (`.github/workflows/ci.yml`) runs on `pull_request` and `push` against `main`, `qa`, and `dev`.

### Caching Strategy (conserving minutes)

To maximise the monthly budget, the pipeline uses aggressive caching:

- **`actions/setup-node`:** Caches the `pnpm` global store — avoids re-downloading unchanged packages.
- **Turborepo cache (`.turbo`):** Caches build outputs per `github.sha`. If a package hasn't changed, Turbo replays the cached output instantly — this is the biggest minute-saver on a monorepo.

> [!TIP]
> Because of Turbo caching, a typical PR that touches only one package (e.g. `apps/api-core`) should complete CI in **5–8 minutes**, not 25. If you see consistently long runs, check that the `.turbo` cache is being restored (look for "Cache restored" in the CI log).

### Concurrency cancellation

The `concurrency` block in `ci.yml` cancels in-progress runs when a new push arrives on the same ref. This prevents minute waste from stacked pushes during active development.

---

## 3. PR Governance & Flow Enforcement

The promotion path `dev → qa → main` is enforced by `.github/workflows/enforce-pr-flow.yml`:

1. PRs to `qa` must come from `dev`.
2. PRs to `main` must come from `qa` and must be authored by `@brittytino`.
3. PRs to `dev` must come from a feature branch (not `qa`, `main`, or `develop`).
4. Branch name and PR title convention violations are posted as PR comments (warning, non-blocking).

Label completeness is checked by `.github/workflows/pr-label-check.yml` (warning comment only, never blocks CI).

---

## 4. CODEOWNERS — Free Plan Limitation

> [!IMPORTANT]
> On GitHub Free, the `CODEOWNERS` file auto-requests reviews from the listed owners, but **cannot mechanically block a merge** if those owners haven't approved. The "Require review from Code Owners" branch protection option is only available on **GitHub Teams or above**.
>
> **Current enforcement:** process-based. The module owner is accountable for the quality of PRs into `dev`. Tino is accountable for architect-owned paths. When you upgrade, flip the switch in Settings → Branches and CODEOWNERS is immediately enforced with no file changes required.

---

## 5. Automated Deployments

| Branch | Workflow          | Trigger                 | Target            |
| ------ | ----------------- | ----------------------- | ----------------- |
| `dev`  | `deploy-dev.yml`  | Successful CI on `dev`  | kvm2 `smart-dev`  |
| `qa`   | `deploy-qa.yml`   | Successful CI on `qa`   | kvm2 `smart-qa`   |
| `main` | `deploy-prod.yml` | Successful CI on `main` | kvm4 `smart-prod` |

Deployments use a **blue-green strategy** (`scripts/blue-green-deploy.sh`) to eliminate downtime. See script header for operation details.

---

## 6. Troubleshooting: Minutes Exhausted

If CI jobs are stuck in a `Queued` state or return billing errors:

1. Check the organisation's billing page: Settings → Billing & Plans.
2. If minutes are exhausted:
   - Option A: Upgrade to GitHub Teams (see §1).
   - Option B: Register a self-hosted runner temporarily. In `.github/workflows/ci.yml` change `runs-on: ubuntu-latest` → `runs-on: self-hosted`. **Never run a CI runner on the same host as a live environment.**
3. Docs-only or chore commits can skip CI by including `[skip ci]` in the commit message.

---

## 7. GitHub Teams — Migration Checklist

When the organisation upgrades to GitHub Teams:

- [ ] Verify billing is active and plan shows 3,000 Linux minutes/month.
- [ ] Settings → Branches → `dev` protection rule: enable **"Require review from Code Owners"**.
- [ ] Settings → Branches → `qa` protection rule: enable **"Require review from Code Owners"** + "Restrict who can dismiss pull request reviews" → `@brittytino`.
- [ ] Settings → Branches → `main` protection rule: enable **"Require review from Code Owners"**.
- [ ] No changes to `.github/CODEOWNERS` required — already correct.
- [ ] Update this document: remove the Free plan limitation notes, update minute budget to 3,000.
- [ ] Announce to team: CODEOWNERS is now mechanically enforced.
