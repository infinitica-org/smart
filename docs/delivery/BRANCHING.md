# SMART — Enterprise Branching Model

> **Owner:** Tino (System Architect) · Ticket: S0-TN-03
> **Canonical long-lived branches:** `main` · `qa` · `dev`
> **`develop` is deprecated.** Do not open new PRs into `develop`. Use `dev`.

---

## 1. The three long-lived branches

```
main  ──── always production-ready. Only @brittytino may push / merge.
 │
 └── qa ── release candidate. Promoted from `dev` after validation.
      │     Tino reviews and merges. Engineers do not merge here.
      │
      └── dev ── team integration branch. Everyone's default base.
           │     **Tino reviews and merges ALL feature PRs here.**
           │     No direct pushes to dev — feature branch PRs only.
           │
           ├── feat/S6-VV-92-account-lockout
           ├── fix/S6-VV-96-dashboard-query-client
           └── chore/S6-TN-00-decentralised-review-model
```

| Branch     | Purpose                                                             | Who reviews       | Who merges             | Deploy target                                               |
| ---------- | ------------------------------------------------------------------- | ----------------- | ---------------------- | ----------------------------------------------------------- |
| **`dev`**  | Daily integration. Feature PRs require Tino's approval.             | **Tino** (always) | **Tino** only          | **kvm2** `smart-dev` (Caddy TLS, auto-deploy on green CI)   |
| **`qa`**   | Freeze candidate for UAT / pilot. No feature work — promotion only. | **Tino**          | **Tino** only          | **kvm2** `smart-qa`                                         |
| **`main`** | Production / GA truth. Always deployable.                           | **Tino**          | **Only `@brittytino`** | **kvm4** `smart-prod` (Caddy TLS, auto-deploy on green CI)  |

Engineers **never** commit directly to `main`, `qa`, or `dev`.
Every change lands via a **pull request**, reviewed and merged by Tino.

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
3. Work, commit with Conventional Commits + ticket ID.
4. Push and open a PR **into `dev`** (not `main`, not `qa`).
5. CI green → **Tino (`@brittytino`) reviews and approves** → Tino squash-merges into `dev`.
   - Tino reviews all PRs into `dev` — there are no module-owner-only merges.
   - Tino is also the only person who promotes `dev → qa → main`.
6. Move Zoho ticket: In Review → Verified → Done.

Branch name: `<type>/S<sprint>-<INITIALS>-<nn>-<slug>`
Initials: `TN` · `VV` · `SV` · `VB` · `RM` · `VG`

> **Review policy:** Tino reviews and merges every PR into `dev`, `qa`, and `main`. There are no exceptions based on module ownership. This keeps the integration branch stable and ensures all changes are properly validated before promotion.

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

- Require PR + **1 approving review** (any team member — module owner expected by policy)
- Require status checks: `ci`, `enforce-flow`
- No force push / no delete
- All team members may open PRs and merge after the module owner approves

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
