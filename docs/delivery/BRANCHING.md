# SMART — Enterprise branching model

> **Owner:** Tino (System Architect) · Ticket: S0-TN-03  
> **Canonical long-lived branches:** `main` · `qa` · `dev`  
> **`develop` is deprecated.** Do not open new PRs into `develop`. Use `dev`.

---

## 1. The three long-lived branches

```
main  ──── always production-ready. Only @brittytino may push / merge.
 │
 └── qa ── release candidate. Promoted from `dev` after CI + smoke.
      │
      └── dev ── team integration branch. Everyone's default base.
           │
           ├── feat/S1-VV-04-redis-rate-limit-guard
           ├── fix/S2-RM-19-gemini-failover-timeout
           └── chore/S0-TN-03-enterprise-branches
```

| Branch     | Purpose                                                                        | Who merges                                            | Deploy target                                              |
| ---------- | ------------------------------------------------------------------------------ | ----------------------------------------------------- | ---------------------------------------------------------- |
| **`dev`**  | Daily integration. CI must be green.                                           | Tino (+ module owner if cross-module) after PR review | **kvm2** `smart-dev` (Caddy TLS, auto-deploy on green CI)  |
| **`qa`**   | Freeze candidate for UAT / pilot. No feature work — only promotion + hotfixes. | Tino                                                  | **kvm2** `smart-qa` (not currently deployed)               |
| **`main`** | Production / GA truth. Always deployable.                                      | **Only `@brittytino`**                                | **kvm4** `smart-prod` (Caddy TLS, auto-deploy on green CI) |

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
   git checkout -b feat/S1-VV-04-redis-rate-limit-guard
   ```
3. Work, commit with Conventional Commits + ticket ID.
4. Push and open a PR **into `dev`** (not `main`, not `qa`).
5. CI green → Tino (+ owner) approve → **squash-merge** into `dev`.
6. Move Zoho ticket: In Review → Verified → Done.

Branch name: `<type>/S<sprint>-<initials>-<nn>-<slug>`  
Initials: `TN` · `VV` · `SV` · `VB` · `RM` · `VG`

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
- Require status checks: `lint`, `typecheck`, `unit tests`, `build` (names from CI)
- Require conversation resolution
- Require linear history (squash)
- **Do not allow force pushes**
- **Do not allow deletions**
- **Restrict who can push:** only `@brittytino`
- No admin bypass in normal use (uncheck “Allow specified actors to bypass” unless emergency)

### `qa`

- Require PR + 1 approval (Tino)
- Require same CI status checks
- No force push / no delete
- Restrict direct pushes to `@brittytino` (others only via PR)

### `dev`

- Require PR + 1 approval (Tino; CODEOWNERS still applies)
- Require same CI status checks
- No force push / no delete
- Team may open PRs; merge after approval (squash only)

Apply with [`scripts/github/protect-branches.sh`](../../scripts/github/protect-branches.sh) or the GitHub UI steps in that script’s header comment.

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
