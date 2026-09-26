# SMART — Enterprise Branching Model

> **Owner:** Tino (System Architect) · Ticket: S0-TN-03
> **Canonical long-lived branches:** `main` · `qa` · `dev`
> **`develop` is deprecated.** Do not open new PRs into `develop`. Use `dev`.

---

## 1. The three long-lived branches

```
main  ──── always production-ready. Gated & merged by @brittytino (or release lead).
 │
 └── qa ── release candidate (UAT/staging). Promoted from `dev` after validation.
      │     Gated & merged by @brittytino. Engineers do not merge here directly.
      │
      └── dev ── team integration branch. Everyone's default base.
           │     **No direct pushes — feature branch PRs only.**
           │     Module owners review and approve domain PRs.
           │     System Architect signs off on contracts, build configs, and releases.
           │
           ├── feat/S6-VV-92-account-lockout
           ├── fix/S6-VV-96-dashboard-query-client
           └── chore/S6-TN-00-decentralised-review-model
```

| Branch     | Purpose                                                             | Who reviews                                             | Who merges                           | Deploy target                                              |
| ---------- | ------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------- |
| **`dev`**  | Daily integration. Feature PRs require module owner approval.       | **Module Owner** (per CODEOWNERS) + Architect for seams | **`@brittytino` / `@vis465`** (after CI) | **kvm2** `smart-dev` (Caddy TLS, auto-deploy on green CI)  |
| **`qa`**   | Freeze candidate for UAT / pilot. No feature work — promotion only. | **Tino** (System Architect)                             | **Only `@brittytino`**               | **kvm2** `smart-qa`                                        |
| **`main`** | Production / GA truth. Always deployable.                           | **Tino** (System Architect)                             | **Only `@brittytino`**               | **kvm4** `smart-prod` (Caddy TLS, auto-deploy on green CI) |

Engineers **never** commit directly to `main`, `qa`, or `dev`.
Every change lands via a **pull request**, verified by CI and reviewed per the ownership matrix.

---

## 2. Day-to-day engineer flow

1. Sync base:
   ```bash
   git fetch origin
   git checkout dev
   git pull --ff-only origin dev
   ```
2. Create a feature branch from `dev`:
   ```bash
   git checkout -b feat/S6-VV-84-org-unification-schema
   ```
3. Work, commit with Conventional Commits + ticket ID (`≤ 400 LOC`).
4. Keep branch updated with `dev` locally:
   ```bash
   git fetch origin dev
   git merge origin/dev # or git rebase origin/dev
   # Resolve any conflicts hunk-by-hunk. NEVER use blind --strategy-option=theirs.
   # Run tests locally to ensure clean integration.
   ```
5. Push and open a PR **into `dev`** (not `main`, not `qa`).
6. Automated Quality Gate:
   - CI runs (`lint`, `format:check`, `typecheck`, `unit tests`, `build`).
   - PR flow check verifies branch name and conventional title.
7. Review & Approval:
   - **Domain feature PRs:** Reviewed and approved by the assigned Module Code Owner (`TEAM.md` §3).
   - **Contract & Architecture PRs:** Any change to `@smart/contracts`, CI/CD, or build graph requires System Architect (`@brittytino`) approval.
8. Merge:
   - Squash-and-merge into `dev`.
9. Move Zoho ticket: In Review → Verified → Done.

Branch name: `<type>/S<sprint>-<INITIALS>-<nn>-<slug>`
Initials: `TN` · `VV` · `SV` · `VB` · `RM` · `VG`

> **Review policy:** Day-to-day module code reviews are federated to designated module owners to prevent bottlenecks and ensure domain accountability. Cross-cutting contracts and release promotions remain strictly gated by the System Architect.

---

## 3. Promotion flow (architect only)

| Promotion     | When                                             | How                                                                           |
| ------------- | ------------------------------------------------ | ----------------------------------------------------------------------------- |
| `dev` → `qa`  | Sprint midpoint / freeze candidate / pilot build | PR titled `chore(repo): promote dev to qa (S#)` — Tino merges                 |
| `qa` → `main` | GA cut, or approved production release           | PR titled `chore(repo): promote qa to main (S#)` — **only brittytino merges** |

Hotfix on production: branch from `main` → PR to `main` (brittytino) → cherry-pick / back-merge into `qa` and `dev`.

---

## 4. Protection rules (must match GitHub settings)

### `main` (strictest)

- Require a pull request before merging
- Require at least **1** approving review (Tino / brittytino)
- Require status checks: `ci`, `enforce-flow` (names from workflows)
- Require conversation resolution
- Require linear history (squash)
- **Do not allow force pushes**
- **Do not allow deletions**
- **Restrict who can push:** only `@brittytino`

### `qa`

- Require PR + **1 approval from Tino** (`@brittytino`)
- Require status checks: `ci`, `enforce-flow`
- No force push / no delete
- Restrict direct pushes to `@brittytino` (others only via PR)

### `dev`

- Require PR + **1 approving review**
- Require status checks: `ci`, `enforce-flow`
- No force push / no delete
- **Merge & push permissions:** Restricted to `@brittytino` (System Architect) and `@vis465` (Vishal V)
- All team members open PRs against `dev`; once CI is green and review is complete, `@brittytino` or `@vis465` merges into `dev`.

> [!IMPORTANT]
> **GitHub Free Plan — CODEOWNERS limitation.**
> On the Free plan, GitHub auto-requests reviews from the owners listed in `.github/CODEOWNERS` but **cannot mechanically block a merge** if they haven't approved. That enforcement requires the "Require review from Code Owners" branch protection option, which is only available on **GitHub Teams or above**.
>
> **Current enforcement mechanism:** social / process — the module owner is accountable for the quality of their PRs into `dev`. When you upgrade to GitHub Teams, enable "Require review from Code Owners" for `dev`, `qa`, and `main` in Settings → Branches. The CODEOWNERS file is already written correctly and will be fully enforced with no further changes.

Apply branch protection rules via the GitHub UI or with:
[`scripts/github/protect-branches.sh`](../../scripts/github/protect-branches.sh)

---

## 5. Migrating from `develop`

One-time (architect):

```bash
git fetch origin
git checkout -B dev origin/develop
git push -u origin dev
git checkout -B qa origin/develop   # first QA cut = current integration tip
git push -u origin qa
# Then protect main / qa / dev. Leave develop read-only or delete after team confirms.
```

Update local clones:

```bash
git fetch origin
git checkout -b dev origin/dev
git branch -u origin/dev dev
```

---

## 6. Zoho ↔ GitHub

| Tool          | Use                                                       |
| ------------- | --------------------------------------------------------- |
| Zoho Sprints  | Sprint board, status, points, epics                       |
| GitHub Issues | Technical discussion, PR link, DoD evidence               |
| Ticket ID     | Always `S#-XX-##` in Zoho title, GitHub title, commit, PR |

Closing a ticket requires: PR squash-merged to **`dev`** (or promotion PR), Zoho → Done, GitHub issue → Closed.

---

## 7. GitHub Teams migration checklist

When the organisation upgrades to GitHub Teams (3,000 Linux CI minutes/month):

- [ ] Enable **"Require review from Code Owners"** on `dev`, `qa`, `main` branch protection rules.
- [ ] Enable **"Restrict who can dismiss pull request reviews"** (Tino only) on `qa` and `main`.
- [ ] Update `docs/delivery/GITHUB_ACTIONS_FREE.md` → rename to `GITHUB_CI.md` and update minute budget.
- [ ] No CODEOWNERS changes required — the file is already correct.
