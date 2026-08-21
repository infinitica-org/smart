# SMART — Team Charter, Role Definition & Module Ownership

> **Version:** v3.0 — Authoritative Ownership Contract
> **Last Updated:** 2026-08-21
> **Release Target:** **10 September 2026, 18:00 IST** (General Availability)
> **Methodology:** Scrum (Agile) — 6 sprints, see [`docs/delivery/AGILE_PLAN.md`](./docs/delivery/AGILE_PLAN.md)

This document is the **single source of truth for who owns what**. If a file is being changed
and you are not its owner (or an explicitly listed contributor), you open a PR and request the
owner's review — you do not merge into someone else's module.

Ownership is enforced mechanically by [`.github/CODEOWNERS`](./.github/CODEOWNERS). If this
document and `CODEOWNERS` ever disagree, **`CODEOWNERS` wins and this document is a bug**.

---

## 1. The Team

| # | Engineer | Role Title | Mandate (one sentence) | Writes Feature Code? |
|---|---|---|---|---|
| 1 | **Tino** | **System Architect & Reviewer** | Owns the architecture, the contracts, the quality gates and the final merge decision — reviews everything, ships no feature code. | **No — by design** |
| 2 | **Vishal V** | **Senior Backend Engineer** | Owns the backend platform core: identity, data layer, rate limiting, event bus, code-execution sandbox and runtime infrastructure. | Yes |
| 3 | **Satheswaran V** | **Frontend & Full-Stack Engineer** | Owns the candidate and TPO experience layer: design system, assessment player, dashboards and the typed API client. | Yes |
| 4 | **Vishal Bharath R** | **Full-Stack & Backend Engineer** | Owns the assessment lifecycle and the trust chain: attempt orchestration, certificates, public verification, admin console and webhooks. | Yes |
| 5 | **Ramansh** | **AI Engineer** | Owns every LLM boundary: AI gateway with failover, BARS evaluation, L4 defense simulation, RAG/pgvector and vector matching. | Yes |
| 6 | **Vedika G** | **Data & AI/Backend Engineer** | Owns the content and data spine: item banks for all 10 tracks, calibration/cut scores, seed & ingestion pipelines, placement records and analytics. | Yes |

> **Replace the placeholder GitHub handles in `.github/CODEOWNERS` with the real ones on day 1
> of Sprint 0.** Nothing else in the repo depends on handles.

| Engineer | Handle placeholder | Timezone | Standup |
|---|---|---|---|
| Tino | `@tino` | IST | 09:30 IST |
| Vishal V | `@vishal-v` | IST | 09:30 IST |
| Satheswaran V | `@satheswaran-v` | IST | 09:30 IST |
| Vishal Bharath R | `@vishal-bharath-r` | IST | 09:30 IST |
| Ramansh | `@ramansh` | IST | 09:30 IST |
| Vedika G | `@vedika-g` | IST | 09:30 IST |

---

## 2. Role Definitions — What Each Person Is Accountable For

### 2.1 Tino — System Architect & Reviewer

**Explicitly NOT assigned any feature story points.** Tino's capacity is reserved for
architecture, review throughput and unblocking. Sprint velocity must never assume Tino writes
product code — if it does, the sprint is mis-planned.

**Owns (exclusive write authority):**

| Artifact | Why it is architect-owned |
|---|---|
| `ARCHITECTURE.md`, `SERVICES_VIEW.md`, `REPOSITORY_STRUCTURE.md` | System-level truth must not drift per-developer. |
| `docs/adr/**` | Architecture Decision Records — one decision, one owner. |
| `packages/contracts/**` | The cross-team API/event contract. Anyone may propose a change via PR; only Tino merges it. |
| `.github/workflows/**`, `.github/CODEOWNERS` | Quality gates cannot be edited by the person trying to pass them. |
| `turbo.json`, `pnpm-workspace.yaml`, root `tsconfig.base.json` | Build graph and module boundaries. |
| `docs/delivery/**` | Sprint plan, backlog, definition of done. |

**Accountable for:**
1. **Mandatory reviewer on every PR** (`* @tino` in CODEOWNERS). No PR merges without architect approval.
2. **Contract change control** — every change to `@smart/contracts` is a PR with an ADR link, a migration note, and notification to all affected owners in the same PR body.
3. **Daily Architecture Review Board, 17:00 IST** — 30 min, all open PRs triaged to `merge` / `changes-requested` / `escalate`. No PR sits >24h.
4. **Definition of Done enforcement** — see `docs/delivery/DEFINITION_OF_DONE.md`. Tino rejects on DoD, not on taste.
5. **Cross-module integration correctness** — Kafka topic contracts, SLA budgets, rate-limit matrix, RBAC matrix.
6. **Release management** — cutting `release/*` branches, sign-off on the code freeze (8 Sep 23:59 IST) and the GA tag (10 Sep).
7. **Tech debt register** (`docs/engineering/TECH_DEBT.md`) — anything merged with a known compromise gets logged here in the same PR.

**Tino does not:** implement modules, fix other people's failing tests, or take over a blocked
ticket. Blocked tickets get re-assigned in standup, not absorbed by the architect.

---

### 2.2 Vishal V — Senior Backend Engineer

**Bounded context: Platform Core.** Everything that every other backend module depends on.
Vishal V is the most senior IC — he is the **second reviewer of choice** for all backend PRs and
the escalation path when Ramansh/Vedika/Vishal Bharath are blocked on backend internals.

**Owns:**

| Path | Deliverable |
|---|---|
| `apps/api-core/src/main.ts`, `app.module.ts` | Fastify bootstrap, global pipes/filters/interceptors, Swagger, graceful shutdown. |
| `apps/api-core/src/platform/**` | Config (validated env), logging (pino), Prisma service, Redis service, Kafka service, BullMQ registration, health/readiness, OpenTelemetry. |
| `apps/api-core/src/modules/auth/**` | 15-min access JWT, HttpOnly refresh rotation, OAuth (Google/GitHub), SAML 2.0 / OIDC institutional SSO, RBAC guards, B2B `X-SMART-API-KEY`. |
| `apps/api-core/src/modules/users/**` | Student/TPO/admin profile, track enrollment (primary + secondary). |
| `apps/api-core/src/modules/rate-limit/**` | Redis sliding-window + token-bucket Lua guard, role & endpoint matrix, `X-RateLimit-*` headers, `smart.rate_limit.exceeded`. |
| `apps/api-core/src/modules/sandbox/**` | Non-networked Docker runner (256 MB / 1 CPU / 5 s), SQL executor on throwaway schema, watchdog. |
| `apps/api-core/prisma/**` | **Schema steward.** All migrations land through him — this is how we avoid migration collisions with 5 devs. |
| `infra/docker/**`, `infra/k8s/**`, `infra/helm/**`, `infra/observability/**` | Local stack, images, manifests, Grafana/Prometheus/Loki wiring. |
| `scripts/**` | Bootstrap, seed, reset, diagnostics. |

**Non-negotiables he is judged on:** local `pnpm dev` works for all 5 other engineers on day 1;
p95 < 200 ms on synchronous endpoints; zero un-TTL'd Redis keys; migrations always forward-only.

---

### 2.3 Satheswaran V — Frontend & Full-Stack Engineer

**Bounded context: Experience Layer.** Everything the student and the placement officer touch.

**Owns:**

| Path | Deliverable |
|---|---|
| `packages/ui/**` | Design system on Tailwind 4 + shadcn/ui: tokens, theme, primitives, `TierBadge`, `TierTrail`, `ConfidenceNote`, `LevelStepper`, charts. Every app consumes this — no app-local component duplication. |
| `packages/api-client/**` | Typed fetch client generated against `@smart/contracts`, TanStack Query hooks, silent-refresh interceptor, 429/`Retry-After` handling. |
| `apps/web-student/**` | Assessment player (L1 MCQ, L2 code editor, L3 recorder, L4 defense chat, L5 upload), Zustand attempt store, timer/auto-submit, growth & gap-report portal. |
| `apps/web-tpo/**` | Cohort readiness dashboard, Gold/Silver/Bronze distribution, gap report, shortlist table + CSV/PDF export, JD upload UI. |

**Non-negotiables:** WCAG 2.1 AA on the assessment player; the player never loses an answer on
network blip (optimistic Redis draft + retry); Lighthouse performance ≥ 90 on `web-verify` and
the student dashboard; zero `any` crossing the API boundary — everything typed from contracts.

---

### 2.4 Vishal Bharath R — Full-Stack & Backend Engineer

**Bounded context: Assessment Lifecycle & Trust Chain.** He owns the attempt from "start" to
"issued certificate", plus the two surfaces that prove the product is real (verification + admin).

**Owns:**

| Path | Deliverable |
|---|---|
| `apps/api-core/src/modules/assessment/**` | Attempt orchestration, Redis session state `session:assessment:{attempt_id}`, server-authoritative timer + auto-submit, item delivery from `items:form:*` warm cache, level unlock gating (Bronze-or-above), integrity event log. |
| `apps/api-core/src/modules/certificate/**` | Tier Trail computation, headline tier, confidence note assembly, signed SHA-256 QR, Puppeteer PDF → R2, `smart.certificate.issued`. |
| `apps/api-core/src/modules/webhooks/**` | Outbound HMAC-SHA256 dispatcher, endpoint registry, retry with exponential backoff + DLQ. |
| `apps/web-verify/**` | Public `verify.smart.com/cert/[id]` — Tier Trail, confidence note, calibration employer credits, QR validator. Cached, SSG/ISR, < 80 ms p95. |
| `apps/web-admin/**` | Super Admin console: system health, rate-limit overrides, user/institution management, integrity review queue, cut-score publish workflow. |

**Non-negotiables:** the timer cannot be beaten from the client (server is the clock); an attempt
with `integrity_flag != 'CLEAN'` **must not** produce a certificate; verification page is
correct or it shows an error — it never shows a stale or partially-computed tier.

---

### 2.5 Ramansh — AI Engineer

**Bounded context: Every LLM and vector boundary.** No other engineer calls Anthropic or Google
directly — all AI traffic goes through Ramansh's gateway. This is how we control cost and failover.

**Owns:**

| Path | Deliverable |
|---|---|
| `apps/api-core/src/modules/ai-gateway/**` | Claude 5 Sonnet + Claude 4.7 clients, Redis token-bucket (200 RPM / 10k TPM), 3 priority queues (P1 L4 defense 40% reserved, P2 L3 grading, P3 batch), circuit breaker → **Gemini 2.5 Pro/Flash** on 429/5xx/timeout, prompt+response audit to `claude_evaluation_audits`, cost meter. |
| `apps/api-core/src/modules/evaluation/**` | L3 BARS mode-consensus grading, L4 interactive defense simulation, L5 split scoring (50 % checklist / 30 % rubric / 20 % presentation), Cohen's κ monitor with **auto-pause of automated scoring below κ 0.65**. |
| `apps/api-core/src/modules/matching/**` | JD → threshold-vector NLP parse, embedding generation, pgvector cosine search + rule filters, match explainability. |
| `packages/scoring-engine/**` | Effect.ts pure math: Angoff μ/σ cut scores + confidence bands, tier assignment with borderline detection, weighted L1 scoring, IRT 2PL (Phase 2), Cohen's κ, Cronbach's α / KR-20. |
| `packages/prompts/**` | Versioned, immutable prompt templates + JSON output schemas. A prompt change is a version bump, never an in-place edit. |

**Non-negotiables:** deterministic structured output (schema-validated, never free text parsed by
regex); every LLM call is idempotent and replayable from the audit row; a Gemini failover must
produce a tier within the same SLA band; **automated scoring self-disables when κ < 0.65** —
this is a product-integrity requirement, not a nice-to-have.

---

### 2.6 Vedika G — Data & AI/Backend Engineer

**Bounded context: Content & Data Spine.** Without her output the platform has nothing to ask
and nothing to grade against. Her work is on the **critical path of Sprint 1 and Sprint 2** —
treat item-bank readiness as a release blocker, not a content chore.

**Owns:**

| Path | Deliverable |
|---|---|
| `tools/content-pipeline/**` | Authoring schema + CLI: `validate`, `seed`, `embed`, `export`, `report`. Item banks live as reviewed files in Git, not as ad-hoc SQL. |
| `tools/content-pipeline/data/**` | **25–40 task-based items per track × 10 tracks**, competency weights, BARS anchor sets, L5 capstone briefs, per-cohort rotation forms. |
| `apps/api-core/src/modules/catalog/**` | Tracks, competencies (Domains A–E), levels, item bank read APIs, parallel-form selection, item retirement on exposure. |
| `apps/api-core/src/modules/calibration/**` | Calibration panels (3–5 practitioners/track), Angoff estimate capture, cut-score derivation & publish, Cronbach's α per level/track, confidence-note text generation, `smart.track.updated`. |
| `apps/api-core/src/modules/placement/**` | JD records, shortlist generation & export, `placement_records` outcome ingestion, `smart.placement.matched`. |
| `apps/api-core/src/modules/analytics/**` | Cohort readiness aggregates, gap reports, correlation records (interview/offer rate by tier), TPO report endpoints. |
| `packages/prompts/src/templates/goldens/**` | Golden evaluation sets — the regression suite that proves a prompt change did not degrade grading. Co-owned with Ramansh. |

**Non-negotiables:** every item carries `competency_id`, `real_world_weight`, `difficulty_tag`
and a model answer; content passes `content-pipeline validate` in CI or the PR fails; no track is
marked "validated lead" until its calibration panel and α ≥ 0.70 are recorded in the DB.

---

## 3. Module Ownership Matrix (authoritative)

`O` = Owner (merges, accountable) · `C` = Contributor (may PR into it) · `R` = Reviewer (approval required)

### 3.1 Backend — `apps/api-core/src/modules/*`

| Module | Bounded context | Tino | Vishal V | Satheswaran | Vishal Bharath | Ramansh | Vedika |
|---|---|:--:|:--:|:--:|:--:|:--:|:--:|
| `platform` | Config, logging, Prisma, Redis, Kafka, health, OTel | R | **O** | | C | C | C |
| `auth` | JWT/refresh/OAuth/SSO/RBAC/API keys | R | **O** | C | C | | |
| `users` | Profiles, track enrollment | R | **O** | C | C | | |
| `rate-limit` | Sliding window + token bucket guards | R | **O** | | | C | |
| `sandbox` | Docker code & SQL execution | R | **O** | | C | | |
| `assessment` | Attempts, sessions, timers, item delivery | R | C | C | **O** | C | C |
| `certificate` | Tier Trail, QR, PDF, R2 | R | C | | **O** | | C |
| `webhooks` | HMAC outbound dispatcher + DLQ | R | C | | **O** | | |
| `catalog` | Tracks, competencies, levels, items | R | C | | C | | **O** |
| `calibration` | Panels, Angoff cut scores, α, confidence notes | R | | | | C | **O** |
| `placement` | JD records, shortlists, outcomes | R | | C | | C | **O** |
| `analytics` | Cohort readiness, gap, correlation | R | | C | | | **O** |
| `ai-gateway` | Claude + Gemini failover, token buckets | R | C | | | **O** | C |
| `evaluation` | BARS, L4 defense, L5 split, κ monitor | R | | | C | **O** | C |
| `matching` | JD parse, embeddings, pgvector cosine | R | | | | **O** | C |

### 3.2 Frontend & shared packages

| Package / App | Tino | Vishal V | Satheswaran | Vishal Bharath | Ramansh | Vedika |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| `packages/contracts` | **O** | C | C | C | C | C |
| `packages/scoring-engine` | R | | | C | **O** | C |
| `packages/prompts` | R | | | | **O** | C |
| `packages/ui` | R | | **O** | C | | |
| `packages/api-client` | R | C | **O** | C | | |
| `packages/observability` | R | **O** | C | | | |
| `packages/config-*` | **O** | C | C | | | |
| `apps/web-student` | R | | **O** | C | C | |
| `apps/web-tpo` | R | | **O** | C | | C |
| `apps/web-admin` | R | C | C | **O** | | C |
| `apps/web-verify` | R | | C | **O** | | |
| `tools/content-pipeline` | R | | | | C | **O** |
| `tools/load-tests` | R | **O** | | C | | |
| `tests/e2e` | R | C | **O** | C | C | C |
| `infra/**` | R | **O** | | C | | |
| `.github/workflows` | **O** | C | | | | |

### 3.3 Kafka topic ownership

A topic has exactly one producer-owner. Consuming is free; **changing a payload is a
`@smart/contracts` PR reviewed by Tino and every listed consumer.**

| Topic | Producer-owner | Consumers |
|---|---|---|
| `smart.user.created` / `smart.user.updated` | Vishal V | Vedika (analytics) |
| `smart.assessment.started` / `smart.assessment.submitted` | Vishal Bharath R | Ramansh (evaluation), Vishal V (cache invalidation) |
| `smart.eval.requested` | Ramansh | Ramansh (ai-gateway) |
| `smart.eval.completed` | Ramansh | Vishal Bharath (certificate), Vedika (placement, analytics) |
| `smart.track.updated` | Vedika G | Vishal V (cache invalidation), Vishal Bharath (certificate) |
| `smart.certificate.issued` | Vishal Bharath R | Vishal Bharath (webhooks), Vedika (analytics) |
| `smart.placement.matched` | Vedika G | Vishal Bharath (webhooks), Vedika (analytics) |
| `smart.rate_limit.exceeded` | Vishal V | Vishal V (observability), Vishal Bharath (integrity review) |

---

## 4. How We Work Together (collaboration rules)

### 4.1 The contract-first rule

Cross-module work **always** starts in `packages/contracts`, never in an implementation.

1. The consumer opens a PR adding/changing the Zod schema + type in `@smart/contracts`.
2. Tino reviews and merges it — usually same day, at the 17:00 Architecture Review Board.
3. Producer and consumer then implement **in parallel** against the merged type.

This is the mechanism that lets 5 engineers ship into one API without blocking each other.
Two people implementing against an unmerged contract is the #1 cause of integration pain — don't.

### 4.2 Branching & PR flow

```
main ──────────────────────────────────────────────▶  protected, always deployable
 │
 ├── develop ──────────────────────────────────────▶  integration branch, CI must be green
 │     │
 │     ├── feat/S1-VV-04-redis-rate-limit-guard
 │     ├── feat/S2-VB-11-attempt-timer-autosubmit
 │     └── fix/S2-RM-19-gemini-failover-timeout
 │
 └── release/2026-09-10 ───────────────────────────▶  cut at code freeze, hotfix only
```

Branch name: `<type>/<sprint>-<initials>-<ticket#>-<slug>`
Initials: `TN` Tino · `VV` Vishal V · `SV` Satheswaran V · `VB` Vishal Bharath R · `RM` Ramansh · `VG` Vedika G

**PR rules:**
- Max **400 changed lines** of non-generated code. Bigger than that, split it.
- Title follows Conventional Commits and names the ticket: `feat(rate-limit): sliding window Lua guard (S1-VV-04)`.
- Every PR: linked ticket, filled template, green CI, **Tino approval**, plus the owner's approval if it touches someone else's module.
- **Squash merge only.** `develop` history is one commit per ticket.
- A PR open >24 h without review is raised in standup, not left to rot.

### 4.3 Escalation path

| Situation | Do this |
|---|---|
| Blocked on a contract | Post in `#smart-contracts`, tag Tino. Resolved same day at 17:00 board. |
| Blocked on backend internals | Tag Vishal V — he is the backend escalation path. |
| Blocked on AI output quality/cost | Tag Ramansh. Never work around the gateway with a direct SDK call. |
| Missing or wrong content/items | Tag Vedika G with the `content` label. |
| Cross-module design disagreement | 15-min call, then **Tino decides and writes an ADR.** No design by attrition. |
| Slipping a sprint commitment | Say it in standup the day you know, not at review. |

### 4.4 Interfaces between people (the four seams that will hurt if ignored)

| Seam | Between | Agreement |
|---|---|---|
| **Player ⇄ Attempt API** | Satheswaran ⇄ Vishal Bharath | Server is the clock and the authority. Client sends drafts, server decides validity, expiry and next item. Contract: `AttemptSessionDto`, `NextItemDto`. |
| **Attempt ⇄ Evaluation** | Vishal Bharath ⇄ Ramansh | Handoff is `smart.assessment.submitted` only — never a direct service call. Result returns via `smart.eval.completed`. |
| **Evaluation ⇄ Cut scores** | Ramansh ⇄ Vedika | Evaluation produces a raw score; **calibration owns tier assignment** via published `cut_scores`. Ramansh never hardcodes a threshold. |
| **Content ⇄ Delivery** | Vedika ⇄ Vishal Bharath | Items are served only from `catalog` parallel forms; delivery never queries `items` directly. |

---

## 5. Capacity & Velocity Assumption

| Engineer | Feature capacity | Review load |
|---|---|---|
| Tino | **0 pts** | ~100 % — all PRs |
| Vishal V | 8 pts/sprint-day equiv. | Secondary reviewer, backend |
| Satheswaran V | 8 pts | Secondary reviewer, frontend |
| Vishal Bharath R | 8 pts | Secondary reviewer, full-stack |
| Ramansh | 8 pts | AI/scoring reviews |
| Vedika G | 8 pts | Content/data reviews |

**Planned team velocity: 5 ICs.** Any plan that assumes 6 delivery engineers is wrong.

---

## 6. Definition of Ownership — what "you own it" actually means

If you own a module, you are accountable for all six of these. Not one of them is optional.

1. **It works** — happy path plus the failure modes named in your non-negotiables.
2. **It is typed** — public surface exported through `@smart/contracts`; no `any` at boundaries.
3. **It is tested** — unit tests on logic, integration tests on I/O, ≥ 80 % on your module by Sprint 5.
4. **It is observable** — structured logs with `traceId`, Prometheus counters/histograms, a Grafana panel.
5. **It is documented** — Swagger decorators on every endpoint, a README in your module folder, a runbook in `docs/runbooks/` for anything that can page someone.
6. **It is rate-limited and secured** — declares its limit tier and its RBAC roles. Unlimited endpoints do not ship.

---

*Owned by: Tino (System Architect). Changes to this document are a PR to Tino, discussed at the
Architecture Review Board.*
