# SMART — Enterprise Branching Model

> **Owner:** Tino (System Architect) · Ticket: S0-TN-03
> **Canonical long-lived branches:** `main` · `qa` · `dev`
> **`develop` is deprecated.** Do not open new PRs into `develop`. Use `dev`.

---

## 1. The three long-lived branches

```
main  ──── always production-ready. Only @brittytino may push / merge.
 │
 └── qa ── release candidate. Promoted from `dev` after CI + smoke.
      │     Tino reviews and merges. Engineers do not merge here.
      │
      └── dev ── team integration branch. Everyone's default base.
           │     Module owners review and merge feature PRs here.
           │     Tino is NOT required on every feature PR.
           │
           ├── feat/S6-VV-84-org-unification-schema
           ├── fix/S6-RM-21-gemini-failover-timeout
           └── chore/S0-TN-03-enterprise-branches
```

| Branch     | Purpose                                                             | Who reviews             | Who merges                                        | Deploy target                                              |
| ---------- | ------------------------------------------------------------------- | ----------------------- | ------------------------------------------------- | ---------------------------------------------------------- |
| **`dev`**  | Daily integration. CI must be green.                                | Module owner of paths   | Module owner (or Vishal V for backend escalation) | **kvm2** `smart-dev` (Caddy TLS, auto-deploy on green CI)  |
| **`qa`**   | Freeze candidate for UAT / pilot. No feature work — promotion only. | **Tino** (release gate) | **Tino** only                                     | **kvm2** `smart-qa`                                        |
| **`main`** | Production / GA truth. Always deployable.                           | **Tino**                | **Only `@brittytino`**                            | **kvm4** `smart-prod` (Caddy TLS, auto-deploy on green CI) |

Engineers **never** commit directly to `main`, `qa`, or `dev`.
Every change lands via a **pull request**.

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
5. CI green → **module owner** (or Vishal V as backend escalation) approves → **squash-merge** into `dev`.
6. Move Zoho ticket: In Review → Verified → Done.

Branch name: `<type>/S<sprint>-<INITIALS>-<nn>-<slug>`
Initials: `TN` · `VV` · `SV` · `VB` · `RM` · `VG`

> **When does Tino need to review a `dev` PR?**
> Only when the PR touches **architect-owned paths**: `packages/contracts/`, `.github/workflows/`, `.github/CODEOWNERS`, `ARCHITECTURE.md`, `docs/adr/`, `docs/delivery/`, `turbo.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `package.json`. All other PRs are owned by the module owner. See [`.github/CODEOWNERS`](../../.github/CODEOWNERS).

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
