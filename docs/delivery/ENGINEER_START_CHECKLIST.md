# Engineer start checklist

> **Goal:** every engineer reaches “ready to pick up a ticket” with the same proof steps.
> Owner: Tino · Platform bootstrap: Vishal V · Living backlog: **GitHub Issues** (not Zoho).

Complete every phase in order. Check boxes in your head or in a personal note — the only team-visible gate is [`BOOTSTRAP_SIGNOFF.md`](./BOOTSTRAP_SIGNOFF.md).

**One-line summary:** clone → `pnpm bootstrap` → sign off → pick a GitHub issue → branch from `dev` → PR to `dev`. Zoho Sprints is an optional read-only mirror for sprint planning; **GitHub Issues are the backlog.**

---

## Phase 0 — Access (before clone)

- [ ] GitHub access to [`infinitica-org/smart`](https://github.com/infinitica-org/smart)
- [ ] Can view **GitHub Issues** (filter labels `sprint-0`, `sprint-1`, …)
- [ ] Standup + Architecture Review Board on calendar (see [`AGILE_PLAN.md`](./AGILE_PLAN.md) §3)
- [ ] Know your branch initials: `TN` · `VV` · `SV` · `VB` · `RM` · `VG`
- [ ] **You do not need** Zoho Sprints login or Zoho MCP — only Tino uses that for one-off imports

---

## Phase 1 — Machine setup (once per laptop)

| Tool           | Required                                | Verify                       |
| -------------- | --------------------------------------- | ---------------------------- |
| Node.js        | `>= 22.20` (`.nvmrc` → **22.20.0**)     | `node -v`                    |
| pnpm           | **`>= 11.0.0`** (repo pins **11.22.0**) | `pnpm -v` → must be **11.x** |
| Docker Desktop | Recommended (data plane)                | Docker running               |
| Git            | Yes                                     | `git --version`              |
| GitHub CLI     | Optional                                | `gh auth status`             |
| Bash           | For bootstrap/verify scripts            | Git Bash or WSL on Windows   |

**Windows pnpm 9 trap:** standalone pnpm 9 on `PATH` causes `ERR_PNPM_UNSUPPORTED_ENGINE`. Fix: [`LOCAL_DEV.md`](./LOCAL_DEV.md) §0.

- [ ] All tools installed and verified
- [ ] Git `user.name` / `user.email` configured

---

## Phase 2 — Clone and bootstrap

```bash
git clone https://github.com/infinitica-org/smart.git
cd smart
cp .env.example .env    # never commit .env
pnpm bootstrap          # Docker must be running
pnpm doctor             # optional toolchain check
```

- [ ] Repo cloned to a path you will keep (avoid re-cloning mid-sprint)
- [ ] `.env` created from `.env.example` (defaults OK for local)
- [ ] `pnpm bootstrap` completed without errors
- [ ] **Windows PowerShell without bash:** used manual sequence in [`LOCAL_DEV.md`](./LOCAL_DEV.md) §3 instead

**Redis on Windows:** `.env` uses `REDIS_URL=redis://127.0.0.1:6380` (host 6379 is often taken).

---

## Phase 3 — Prove the stack works (Sprint 0 gate)

This phase is tracked in [`BOOTSTRAP_SIGNOFF.md`](./BOOTSTRAP_SIGNOFF.md). Post proof in standup.

```bash
pnpm dev
# or split: pnpm dev:api  +  pnpm dev:web
./scripts/verify-handover.sh
```

Manual checks:

- [ ] `GET http://localhost:3000/health` → **200**
- [ ] `GET http://localhost:3000/ready` → **200** (Postgres + Redis)
- [ ] `GET http://localhost:3000/api/v1/catalog/tracks` → **10 tracks**
- [ ] `:3001` student · `:3002` tpo · `:3003` admin · `:3004` verify — each portal loads
- [ ] Login with seeded account works (`student@smart.local` / `ChangeMe!Dev`, plus tpo/admin)
- [ ] `./scripts/verify-handover.sh` passes
- [ ] Your row in `BOOTSTRAP_SIGNOFF.md` updated via PR (Tino merges)

**Do not start Sprint 1 feature work until your bootstrap sign-off is done.**

---

## Phase 4 — Read before coding (~1–2 hours)

Read in this order (skim what you do not own; deep-read what you do):

1. [ ] [`README.md`](../../README.md) — stack, ports, ownership table
2. [ ] [`TEAM.md`](../../TEAM.md) — **your** section + neighbor seams (§4.4)
3. [ ] [`ENGINEER_GUIDES.md`](./ENGINEER_GUIDES.md) — **your** role section end-to-end
4. [ ] [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — skim all; deep-read your modules
5. [ ] [`AGILE_PLAN.md`](./AGILE_PLAN.md) — Sprint 0 tickets first, then Sprint 1+
6. [ ] [`DEFINITION_OF_DONE.md`](./DEFINITION_OF_DONE.md) — how PRs are judged
7. [ ] [`CONTRIBUTING.md`](../../CONTRIBUTING.md) + [`.cursor/rules/09-commits-and-prs.mdc`](../../.cursor/rules/09-commits-and-prs.mdc)
8. [ ] [`.cursor/kb/ownership.md`](../../.cursor/kb/ownership.md) — if touching unfamiliar paths

**Cursor users:** copy `.cursor/local/*.example.md` → `.cursor/local/` (gitignored).

---

## Phase 5 — Find your work (GitHub Issues)

The living backlog is on GitHub. Ticket **content** (AC, DoD, subtasks) is in issue bodies.

| Sprint   | GitHub issues                                                                | Scope                                                  |
| -------- | ---------------------------------------------------------------------------- | ------------------------------------------------------ |
| Sprint 0 | [#26–#43](https://github.com/infinitica-org/smart/issues?q=label%3Asprint-0) | Foundation — monorepo, Docker, Prisma, CI, UI scaffold |
| Sprint 1 | [#3–#24](https://github.com/infinitica-org/smart/issues?q=label%3Asprint-1)  | Platform core — auth, RBAC, rate limits, …             |

- [ ] Filter issues by your name / agreed sprint assignment
- [ ] Read the full issue body before branching
- [ ] Cross-check ticket id in `AGILE_PLAN.md` (e.g. `S0-VV-04`, `S1-SV-01`)
- [ ] Note dependencies listed in the issue or plan

**Backlog source in git** (for leads editing ticket text): `tools/zoho-sprint0/backlog.mjs`, `tools/zoho-sprint1/backlog.mjs`. After edits, sync GitHub only:

```bash
node tools/backlog/sync-github.mjs
```

See [`tools/backlog/README.md`](../../tools/backlog/README.md) and [`.cursor/kb/backlog-issues.md`](../../.cursor/kb/backlog-issues.md). **Do not** push updates to Zoho unless Tino explicitly requests a re-import.

---

## Phase 6 — Per-ticket dev loop

```bash
git checkout develop && git pull
git checkout -b feat/S1-VV-01-jwt-auth   # example — one ticket per branch
```

Branch pattern: `<type>/S<sprint>-<initials>-<nn>-<slug>`  
Types: `feat` · `fix` · `chore` · `docs` · `refactor` · `test` · `perf`

Before you code:

- [ ] **Schema change?** → discuss with **Vishal V** first; only he runs `prisma migrate`
- [ ] **Cross-module type?** → PR to `@smart/contracts` **first**; wait for Tino merge, then implement
- [ ] **Outside your owned paths?** → PR + module owner review ([`CODEOWNERS`](../../.github/CODEOWNERS))

While coding:

- [ ] Edit only paths you own (or agreed co-change in PR)
- [ ] Every new route: rate-limit policy + RBAC in `packages/contracts/src/http/routes.ts`
- [ ] No parallel DTOs — types live in `@smart/contracts`

Before commit / PR — all must pass:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
```

- [ ] Quality gates green (no `--no-verify`, no weakened ESLint/CI)
- [ ] Hand-written diff ≤ **400 LOC**; split if larger

---

## Phase 7 — Open the PR

- [ ] Push: `git push -u origin <branch>`
- [ ] Open PR **into `dev`** (never commit directly to `main` or `dev`)
- [ ] Title: Conventional Commit + ticket — e.g. `feat(auth): jwt access + refresh rotation (S1-VV-01)`
- [ ] Fill [`.github/PULL_REQUEST_TEMPLATE.md`](../../.github/PULL_REQUEST_TEMPLATE.md) + DoD checkboxes
- [ ] Labels applied (required on every PR):

| Kind     | Pick one (+ sprint)                                                                          |
| -------- | -------------------------------------------------------------------------------------------- |
| Priority | `P0-blocker` · `P1` · `P2-droppable`                                                         |
| Area     | `area:backend` · `area:frontend` · `area:ai` · `area:data` · `area:infra` · `area:contracts` |
| Sprint   | `sprint-0` … `sprint-5`                                                                      |
| Optional | `needs-contract` · `needs-content` · `blocked`                                               |

- [ ] Link related contract PR if any
- [ ] Request review from Tino + module owner when cross-boundary
- [ ] **Do not merge yourself** — Tino (+ owner) approve; squash-merge after review

Example:

```bash
gh pr create --base dev \
  --title "feat(auth): jwt access + refresh rotation (S1-VV-01)" \
  --label "P0-blocker" --label "area:backend" --label "sprint-1"
```

---

## Hard “don’t” list

| Don’t                                      | Do instead                              |
| ------------------------------------------ | --------------------------------------- |
| Commit to `main` / `dev`                   | Feature branch → PR to `dev`            |
| Commit `.env` or secrets                   | Use `.env.example` + local `.env`       |
| Treat local commits as “done”              | Open PR; no PR = not delivered          |
| Write feature code as Tino                 | Tino reviews; he does not ship features |
| Invent DTOs outside contracts              | `@smart/contracts` PR first             |
| Update Zoho item text                      | Edit `backlog.mjs` → `sync-github.mjs`  |
| Run `prisma migrate dev` (unless Vishal V) | Open issue; Vishal batches migrations   |
| Skip hooks (`--no-verify`)                 | Fix lint/test failures                  |
| Ship unlimited endpoints                   | Declare rate limit + RBAC in contracts  |

---

## Quick reference

| Resource                                         | Purpose                                      |
| ------------------------------------------------ | -------------------------------------------- |
| [`LOCAL_DEV.md`](./LOCAL_DEV.md)                 | Exact commands, Windows fixes                |
| [`BOOTSTRAP_SIGNOFF.md`](./BOOTSTRAP_SIGNOFF.md) | Team gate before Sprint 1                    |
| [`ENGINEER_GUIDES.md`](./ENGINEER_GUIDES.md)     | Role-specific day-to-day                     |
| [`AGILE_PLAN.md`](./AGILE_PLAN.md)               | Sprint calendar + ticket list                |
| GitHub Issues                                    | **Living backlog** — AC, DoD, subtasks       |
| Zoho Sprints                                     | Optional UI mirror — read-only for engineers |

---

_When this checklist drifts from `CONTRIBUTING.md` or `AGILE_PLAN.md`, those two win until Tino updates this file._
