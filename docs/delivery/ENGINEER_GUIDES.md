# Per-Engineer Working Guide

> One section per engineer. Read **your** section fully on day 1, then skim the section of
> whoever you share a seam with (`TEAM.md` §4.4). Everything here is derived from `TEAM.md` and
> `AGILE_PLAN.md` — those two documents win if anything here drifts.

**Common to everyone — do this first (30 minutes):**

Full checklist (access → bootstrap → first PR): [`ENGINEER_START_CHECKLIST.md`](./ENGINEER_START_CHECKLIST.md).

```bash
git clone <repo> smart-platform && cd smart-platform
corepack enable && corepack prepare pnpm@11.22.0 --activate   # or: npm i -g pnpm@11.22.0
cp .env.example .env                                          # then fill the secrets you own
./scripts/bootstrap.sh                                        # infra + install + migrate + seed
pnpm dev                                                      # everything, hot-reloaded
```

Then read, in this order: `README.md` → `TEAM.md` (your section) → `ARCHITECTURE.md` (skim, then
deep-read the sections that name your module) → `docs/delivery/AGILE_PLAN.md` (your sprint tickets)
→ `docs/delivery/DEFINITION_OF_DONE.md` (this is how your PR gets judged).

| Port        | Service                                                  |
| ----------- | -------------------------------------------------------- |
| 3000        | `api-core` (Swagger at `/api/docs`, health at `/health`) |
| 3001        | `web-student`                                            |
| 3002        | `web-tpo`                                                |
| 3003        | `web-admin`                                              |
| 3004        | `web-verify`                                             |
| 5432        | Postgres + pgvector                                      |
| 6380        | Redis (host port; container 6379)                        |
| 9092        | Redpanda (Kafka)                                         |
| 9001        | MinIO console (R2 stand-in)                              |
| 9090 / 3100 | Prometheus / Grafana                                     |
| 3101        | Loki                                                     |
| 8025 / 1025 | Mailpit UI / SMTP                                        |

---

## Tino — System Architect & Reviewer

### Your job in one line

Keep 5 engineers building one coherent system instead of five overlapping ones — by owning the
contracts, the boundaries, and the merge button.

### You own

`ARCHITECTURE.md` · `SERVICES_VIEW.md` · `REPOSITORY_STRUCTURE.md` · `TEAM.md` ·
`docs/adr/**` · `docs/delivery/**` · `packages/contracts/**` · `packages/config-*/**` ·
`.github/workflows/**` · `.github/CODEOWNERS` · `turbo.json` · `pnpm-workspace.yaml`

### You do NOT

Write feature code. Take over blocked tickets. Fix other people's tests. Your capacity is
**0 story points on features** — if the sprint math needs your hands on a module, the sprint is
mis-planned and that's the thing to fix.

### Your day

| Time        | What                                                                                                                                           |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 09:30       | Standup. Capture every blocker with a named owner and a resolution time.                                                                       |
| 10:00–17:00 | Review PRs continuously. Nothing waits >24 h. Write ADRs as decisions land.                                                                    |
| 17:00       | **Architecture Review Board** — 30 min. Triage every open PR to `merge` / `changes-requested` / `escalate`. Merge the day's contract PRs here. |
| End of day  | Update the risk register. Check burn-down against the sprint goal sentence.                                                                    |

### How you review (in this order — stop at the first failure)

1. **Boundary** — is this code in the right module? Does it reach into someone else's context?
2. **Contract** — is every cross-module type in `@smart/contracts`? Was it merged first?
3. **Definition of Done** — walk the checklist. Reject on the checklist, never on style; style is
   Prettier's job, not yours.
4. **Failure modes** — what happens on timeout, on 429, on empty result, on a flagged attempt?
5. **Blast radius** — if this is wrong in production, who notices and how fast?

### Your escalation rule

A design disagreement gets one 15-minute call. Then **you decide and write the ADR**. Never let a
decision die of discussion — a documented imperfect decision beats an undocumented stalemate.

### Sprint path

S0: scaffold, contracts v0.1, CI, ADRs 0001–0008 → S1–S3: review throughput + contract change
control → S4: **code freeze 8 Sep 23:59**, cut `release/2026-09-10` → S5: GA gate, sign-off, tag `v1.0.0`.

---

## Vishal V — Senior Backend Engineer

### Your job in one line

Own the platform every other backend module stands on — identity, data, limits, events, sandbox,
runtime — and be the backend escalation path for the other four.

### You own

```
apps/api-core/src/main.ts · app.module.ts
apps/api-core/src/platform/**          config, logging, prisma, redis, kafka, queue, health, otel
apps/api-core/src/common/**            filters, interceptors, pipes, decorators
apps/api-core/src/modules/auth/**      JWT · refresh rotation · OAuth · SAML/OIDC · RBAC · API keys
apps/api-core/src/modules/users/**     profiles · track enrollment
apps/api-core/src/modules/rate-limit/** Redis sliding window + token bucket (Lua)
apps/api-core/src/modules/sandbox/**   Docker code runner · SQL executor
apps/api-core/prisma/**                SCHEMA STEWARD — every migration goes through you
infra/** · scripts/** · packages/observability/** · tools/load-tests/**
```

### The four things you will be judged on

1. **Day 1, all 5 others are unblocked locally.** `./scripts/bootstrap.sh` works on a clean machine.
2. **p95 < 200 ms** on synchronous endpoints under load (`ARCHITECTURE.md` §3.2).
3. **Zero un-TTL'd Redis keys.** Redis is 2 GB and holds 50 k live sessions; a leak is an outage.
4. **Migrations never collide.** You are the only person who writes migrations. That's the whole
   mechanism — 5 devs, one schema, no rebases from hell.

### Being the schema steward — how it works in practice

Someone needs a column. They open an issue with the table, the field, the type, the reason, and
the ticket. You batch these into one migration per day, forward-only, and announce it in standup.
Nobody else runs `prisma migrate dev`. This costs you 20 minutes a day and saves the team hours.

### Your rate-limiter is the sharpest thing you build

Implement it once, declaratively, from `ARCHITECTURE.md` §4.3–4.4. Every endpoint declares a tier;
the guard resolves the tier, the identity scope (IP / user / attempt / institution / API key), and
the Lua script does the window. Ship `X-RateLimit-Limit`, `-Remaining`, `-Reset` and `Retry-After`
on **every** response, not just on 429s — Satheswaran's client depends on reading them.

### Sprint path

S0: docker stack, Nest bootstrap, Prisma schema v1, bootstrap script →
S1: auth (JWT/refresh/SSO), RBAC, rate limiter + throttle matrix, Kafka base + outbox →
S2: Docker sandbox, SQL executor, BullMQ workers, cache invalidation, metrics →
S3: edge gateway, index optimisation, Helm →
S4: release candidate assembly →
S5: 50 k load test, 100 k/min limiter stress, failure drills.

### Gotchas specific to your surface

- Fastify + Nest: `@fastify/helmet` and `@fastify/cookie` register differently from Express middleware.
- Refresh token rotation needs **reuse detection** — a replayed refresh token invalidates the family.
- The sandbox must be non-networked (`--network=none`), memory-capped, PID-capped and seccomp-profiled.
  Assume candidate code is hostile, because eventually it will be.
- Redis eviction is `volatile-lru`. That only protects you because everything has a TTL. See point 3.

---

## Satheswaran V — Frontend & Full-Stack Engineer

### Your job in one line

Own everything the student and the placement officer touch — and make the assessment player
trustworthy enough that a candidate never loses work.

### You own

```
packages/ui/**            design system: tokens, theme, primitives, TierBadge, TierTrail,
                          ConfidenceNote, LevelStepper, Timer, CodeEditor, AudioRecorder
packages/api-client/**    typed client over @smart/contracts + TanStack Query hooks
apps/web-student/**       L1 MCQ · L2 code · L3 recorder · L4 defense · L5 upload · growth portal
apps/web-tpo/**           cohort readiness · gap report · shortlist + export · JD upload
tests/e2e/**              Playwright journeys
```

### The four things you will be judged on

1. **The player never loses an answer.** Optimistic local state + write-through draft + retry on
   reconnect. A candidate on flaky campus wifi must not lose 40 minutes of work.
2. **The server is the clock.** Render the countdown, but treat the server's expiry as truth.
   Never let the client decide the attempt is still open.
3. **WCAG 2.1 AA on the player**, and Lighthouse ≥ 90 on `web-verify` and the student dashboard.
4. **Zero `any` at the API boundary.** Everything typed from `@smart/contracts` through
   `@smart/api-client`. If a type is missing, that's a contract PR, not a cast.

### Build the design system first, then the apps

Four apps share one visual language. Every component that appears twice belongs in `packages/ui`.
When you're tempted to copy a component into an app, that's the signal it should be promoted.
`TierBadge`, `TierTrail` and `ConfidenceNote` in particular appear in all four apps — those three
are the product's visual identity and they have to be exactly consistent.

### The 429 contract

`@smart/api-client` must read `Retry-After` and back off. The student assessment endpoints are
throttled at 10 req/min — an autosave loop that ignores 429 will lock a candidate out of their own
exam. Debounce drafts, coalesce, and surface a calm "saving…" state rather than an error.

### Sprint path

S0: `packages/ui` scaffold + 4 Next apps on shared config + api-client →
S1: SSO/enrollment flow, student dashboard shell, ui v1 components →
S2: L1 MCQ player, L2 code workspace, L3 recorder, L4 defense chat, L5 upload →
S3: TPO cohort dashboard, shortlist table + export, JD upload, student growth portal →
S4: certificate share view, full Playwright E2E →
S5: E2E regression, a11y audit, Lighthouse.

### Gotchas specific to your surface

- Next.js 16 App Router: default is Server Components. The player is heavily interactive — be
  deliberate about the `"use client"` boundary and keep it as low in the tree as you can.
- `MediaRecorder` codec support differs across browsers; negotiate and record what's available,
  and upload **directly to R2 via a presigned URL** — never proxy audio through the API.
- Zustand holds live attempt state; TanStack Query holds server state. Don't mix them, or you'll
  fight cache invalidation during an exam.
- Timer drift: reconcile against the server's `expiresAt` on every response, don't count locally.

---

## Vishal Bharath R — Full-Stack & Backend Engineer

### Your job in one line

Own the attempt from "start" to "issued certificate", plus the two surfaces that prove SMART is
real — public verification and the admin console.

### You own

```
apps/api-core/src/modules/assessment/**   attempts · Redis session · timer · item delivery ·
                                          level unlock gating · integrity events
apps/api-core/src/modules/certificate/**  Tier Trail · headline tier · confidence note · QR · PDF → R2
apps/api-core/src/modules/webhooks/**     HMAC-SHA256 outbound dispatcher · retry · DLQ
apps/web-verify/**                        public verify.smart.com/cert/[id]
apps/web-admin/**                         super admin console · integrity review queue
```

### The three things you will be judged on

1. **The timer cannot be beaten from the client.** Expiry is computed server-side from
   `started_at + duration`. Any submission after expiry is rejected, and expiry triggers
   auto-submit server-side even if the browser is closed.
2. **A flagged attempt never becomes a certificate.** `integrity_flag != 'CLEAN'` blocks issuance
   and routes to the admin review queue. This is a product-integrity guarantee, not a validation rule.
3. **Verification is correct or it errors.** The public page never shows a stale, partial, or
   optimistically-computed tier. Employers make hiring calls on that page.

### Your bounded context has three hard seams — respect them

- **To Satheswaran:** you expose `AttemptSessionDto` and `NextItemDto`. The client sends drafts;
  you decide validity, next item, and expiry.
- **To Ramansh:** you hand off with `smart.assessment.submitted` and you get back
  `smart.eval.completed`. **No direct service call in either direction** — that coupling is exactly
  what the event bus exists to prevent.
- **To Vedika:** you never query the `items` table. You ask `catalog` for a parallel form. Item
  rotation, exposure tracking and retirement are hers, and reaching around her breaks anti-cheat.

### Tier Trail — get this exactly right

The certificate is one live record per track: highest level cleared as the headline, the tier at
that level, and the trail at every level below. Store it as
`tier_trail_json` = `{"L1":"GOLD","L2":"GOLD","L3":"SILVER"}`. **You do not compute the tier** —
`calibration` publishes the cut scores and `scoring-engine` assigns the tier. You assemble and
present the trail, including the borderline note when the score falls inside the σ band.

### Sprint path

S0: module skeletons, verify/admin shells →
S1: `/assessment/start`, `/next-item`, `/submit-l1`, admin user management →
S2: server-authoritative timer + auto-submit, L2–L5 submission routing, integrity state machine →
S3: certificate issuance, PDF+QR, webhook dispatcher, integrity review queue →
S4: public `/verify/:id`, `web-verify` page, PDF download →
S5: OWASP audit, trust-chain integrity tests.

### Gotchas specific to your surface

- Auto-submit must survive an API restart — drive it from a BullMQ delayed job keyed on the
  attempt, not from an in-process `setTimeout`.
- Verification is public and unauthenticated: cache in Redis (`verify:cert:{id}`, 1 h TTL),
  throttle 20/min per IP, and expose nothing beyond what the student consented to share.
- The QR encodes a **signed** SHA-256 hash. An unsigned QR is a forgeable certificate.
- Webhook retries need idempotency keys, or a partner's flaky endpoint becomes duplicate records
  on their side.

---

## Ramansh — AI Engineer

### Your job in one line

Own every LLM and vector boundary in the system, and make AI grading defensible — deterministic,
auditable, failover-safe, and honest about its own reliability.

### You own

```
apps/api-core/src/modules/ai-gateway/**  Claude 5 Sonnet + Claude 4.7 · token bucket ·
                                          priority queues · Gemini failover · audit · cost meter
apps/api-core/src/modules/evaluation/**  L3 BARS mode-consensus · L4 defense sim ·
                                          L5 split scoring · Cohen's κ monitor
apps/api-core/src/modules/matching/**    JD parse · embeddings · pgvector cosine + rule filters
packages/scoring-engine/**               Effect.ts: Angoff μ±σ · tier assignment · weighted L1 ·
                                          IRT 2PL (Phase 2) · Cohen's κ · Cronbach's α / KR-20
packages/prompts/**                      versioned prompt templates + output schemas + goldens
```

### The gateway rule — the most important architectural constraint you enforce

**No other module calls Anthropic or Google directly.** All AI traffic goes through `ai-gateway`.
That single chokepoint is what gives us the token bucket, the priority queues, the failover, the
audit trail and the cost ceiling. If you see a direct SDK import outside your module, that's a
blocking review comment.

### The four things you will be judged on

1. **Deterministic structured output.** Schema-validated JSON, every time. Never regex a tier out
   of prose. Invalid output is retried against the schema, then escalated — never guessed.
2. **Failover produces a tier in the same SLA band.** Anthropic 429/5xx/timeout → Gemini 2.5,
   with the same BARS prompt schema. Prove it with a test that forces the failure (S1-RM-02).
3. **Every call is replayable from its audit row.** `claude_evaluation_audits` records prompt
   reference, model, tokens, latency, provider used, and cost. If we can't reproduce a grade, we
   can't defend a certificate.
4. **Automated scoring self-disables below κ 0.65.** This is a product-integrity requirement.
   When inter-rater agreement drops, grading pauses and routes to human raters. It is not a metric
   on a dashboard — it is a circuit breaker you build.

### You produce scores, not tiers

This trips people up, so be precise: `evaluation` produces a **raw score** and a justification.
**`calibration` owns the cut scores** and `scoring-engine.assignTier()` converts score → tier
using the published μ ± σ for that track and level. You never hardcode a threshold, and you never
inline a "if score > 80 then GOLD". That authority lives with Vedika's published cut scores.

### Prompts are immutable artifacts

A prompt change is a **version bump** (`bars-l3.v2.ts`), never an in-place edit — because a grade
issued last week must remain reproducible. Every prompt version ships with golden-set results
proving it didn't degrade grading. Co-owned with Vedika: she curates the goldens, you run them.

### Sprint path

S0: scoring-engine scaffold with real math + tests, ai-gateway skeleton with both providers →
S1: token bucket + 3 priority queues, Gemini circuit breaker, pgvector embeddings, audit writes →
S2: L3 BARS grader, L4 defense simulation, L5 split scoring, κ monitor + auto-pause →
S3: JD NLP parse, pgvector cosine matching, explainability, confidence-band calculator →
S4: cost/quota dashboard and spend ceiling →
S5: failover drill, determinism + golden regression.

### Gotchas specific to your surface

- Priority 1 (live L4 defense) reserves 40 % of quota. Batch JD parsing must never starve a
  candidate mid-defense — that's a ruined exam, not a slow job.
- Effect.ts in `scoring-engine` is deliberately pure: no I/O, no `Date.now()`, no randomness.
  That purity is what makes tier assignment testable and auditable. Keep it that way.
- Cohen's κ needs a human-rated hold-out set to compare against — coordinate with Vedika in
  Sprint 1, not Sprint 2, or the monitor has nothing to measure.
- Embedding dimensions are fixed at the schema level. Changing the embedding model is a migration
  plus a re-embed of the whole corpus. Decide once, in Sprint 1.

---

## Vedika G — Data & AI/Backend Engineer

### Your job in one line

Own the content and data spine — the items we ask, the anchors we grade against, the cut scores
that make a tier mean something, and the analytics that prove the product works.

### You own

```
tools/content-pipeline/**                 authoring schema + CLI: validate · seed · embed · export · report
tools/content-pipeline/data/**            25–40 items × 10 tracks · weights · BARS anchors · L5 briefs
apps/api-core/src/modules/catalog/**       tracks · competencies (A–E) · levels · items ·
                                           parallel forms · exposure & retirement
apps/api-core/src/modules/calibration/**   panels · Angoff estimates · cut scores · Cronbach's α ·
                                           confidence-note generation
apps/api-core/src/modules/placement/**     JD records · shortlists · placement_records outcomes
apps/api-core/src/modules/analytics/**     cohort readiness · gap reports · correlation by tier
packages/prompts/src/templates/goldens/**  golden evaluation sets (co-owned with Ramansh)
```

### Understand this clearly: you are on the critical path

Sprint 2's entire evaluation pipeline is blocked without your items, your BARS anchors and your
cut scores. Content lateness is a **release risk tracked daily in standup**, exactly like code.
This is not a documentation task attached to an engineering project — it is the engineering
project's most upstream dependency.

Sequence your work accordingly: **2 validated-lead tracks fully done in Sprint 1** (MBA Finance,
Business Analytics — 40 items each, panel-calibrated, published cut scores), then parallelise the
remaining 8 tracks in Sprint 2.

### The four things you will be judged on

1. **Every item is complete.** `competency_id`, `real_world_weight`, `difficulty_tag`, `item_type`,
   and a model answer. An item without a weight cannot be scored; an item without a competency
   cannot produce a gap report.
2. **Content is code.** Items live as reviewed JSON in Git and pass `content-pipeline validate` in
   CI. No ad-hoc SQL inserts, ever — because a cohort's cut scores must be reproducible from the repo.
3. **No track claims validation it doesn't have.** "Validated lead" requires a recorded 3–5
   practitioner panel **and** Cronbach's α ≥ 0.70. Below 0.70 the confidence note downgrades
   automatically. That honesty is a stated core value of the product (`ARCHITECTURE.md` §1.3).
4. **Cut scores are derived, never invented.** `Cut = μ_panel ± σ_panel` from real panelist
   estimates. σ becomes the visible confidence band on the certificate.

### You hold the tier authority

`evaluation` gives a raw score. **Your published `cut_scores` decide the tier.** That separation
is deliberate: it means a tier can always be traced back to a named panel of practitioners rather
than to a number someone chose. Guard it — if anyone asks you to "just hardcode Gold at 80", the
answer is a calibration panel, not a constant.

### Your CLI is the team's tool, not a personal script

```bash
pnpm content validate                      # schema + referential integrity + weight sums (runs in CI)
pnpm content seed --track MBA_FINANCE      # load items, competencies, levels into Postgres
pnpm content embed --track MBA_FINANCE     # push competency text + BARS anchors into pgvector
pnpm content report                        # coverage per track: items, anchors, α, cut-score status
pnpm content export --cohort 2026-SPRING   # parallel forms for a cohort window
```

`pnpm content report` is what you show at the Content Sync twice a week — it is the readiness
signal the whole team plans against.

### Sprint path

S0: pipeline scaffold + authoring schema + seed 10 tracks / 50 competencies / 50 levels →
S1: 2 lead tracks at 40 items each, calibration module (panels → μ±σ → publish), parallel forms, embeddings →
S2: 5 IT tracks + 3 newer MBA tracks, BARS anchors for all L3/L4 competencies, golden set, α per track →
S3: shortlist generation + export, placement outcome ingestion, cohort/gap/correlation analytics →
S4: final confidence-note copy per track from real α and sample size →
S5: pilot UAT with 50 students, full content audit.

### Gotchas specific to your surface

- Competency `real_world_weight` values must sum to 1.0 per track per level. Put that in
  `validate`, not in a review checklist — machines are better at arithmetic than reviewers.
- Anti-cheat depends on you: parallel forms mean no two students in a cohort window see the same
  form, and exposed items get retired each cycle. This is why `assessment` asks `catalog` for a
  form instead of querying items directly.
- BARS anchors are **mode-consensus**, not averages — the most commonly agreed anchor points from
  the panel. Averaging them destroys the behavioural specificity that makes them gradeable.
- Correlation reporting only becomes meaningful after 2+ placement cycles. Build the pipeline now,
  and label the output honestly until the data earns the claim.

---

_Owner: Tino. Update this document when a role's scope changes — it is onboarding material and it
goes stale silently._
