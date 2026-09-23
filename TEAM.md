# SMART — Team Charter, Role Definition & Module Ownership

> **Version:** v3.0 — Authoritative Ownership Contract
> **Status:** Active
> **Methodology:** Scrum (Agile), structured into sequential sprints. See [`docs/delivery/AGILE_PLAN.md`](./docs/delivery/AGILE_PLAN.md).
> **Release Governance:** General Availability (GA) sign-off criteria and scheduling are maintained in [`docs/delivery/AGILE_PLAN.md`](./docs/delivery/AGILE_PLAN.md).

This document is the single source of truth for module and process ownership within the SMART
engineering team. Any contributor modifying a file outside their designated ownership must open a
pull request and obtain the owner's review; direct merges into another owner's module are not
permitted.

Ownership is enforced mechanically by [`.github/CODEOWNERS`](./.github/CODEOWNERS). Where this
document and `CODEOWNERS` disagree, `CODEOWNERS` is authoritative, and this document is considered
out of date and must be corrected.

---

## 1. Team Composition

| #   | Engineer             | Role Title                         | Mandate                                                                                                                                                 | Writes Feature Code? |
| --- | -------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| 1   | **Tino**             | **System Architect & Reviewer**    | Owns the architecture, the contracts, the quality gates, and the final merge decision. Reviews all changes; does not ship feature code.                 | **No — by design**   |
| 2   | **Vishal V**         | **Senior Backend Engineer**        | Owns the backend platform core: identity, data layer, rate limiting, event bus, code-execution sandbox, and runtime infrastructure.                     | Yes                  |
| 3   | **Satheswaran V**    | **Frontend & Full-Stack Engineer** | Owns the candidate and TPO experience layer: design system, assessment player, dashboards, and the typed API client.                                    | Yes                  |
| 4   | **Vishal Bharath R** | **Full-Stack & Backend Engineer**  | Owns the assessment lifecycle and the trust chain: attempt orchestration, certificates, public verification, admin console, and webhooks.               | Yes                  |
| 5   | **Ramansh**          | **AI Engineer**                    | Owns every LLM boundary: AI gateway with failover, BARS evaluation, L4 defense simulation, RAG/pgvector, and vector matching.                           | Yes                  |
| 6   | **Vedika G**         | **Data & AI/Backend Engineer**     | Owns the content and data spine: item banks for all ten tracks, calibration and cut scores, seed and ingestion pipelines, placement records, analytics. | Yes                  |

> GitHub handles are listed below and are enforced in [`.github/CODEOWNERS`](./.github/CODEOWNERS).

| Engineer         | GitHub handle     | Timezone | Standup   |
| ---------------- | ----------------- | -------- | --------- |
| Tino             | `@brittytino`     | IST      | 09:30 IST |
| Vishal V         | `@vis465`         | IST      | 09:30 IST |
| Satheswaran V    | `@Satheshwaran26` | IST      | 09:30 IST |
| Vishal Bharath R | `@vishalbharath`  | IST      | 09:30 IST |
| Ramansh          | `@Ram9012`        | IST      | 09:30 IST |
| Vedika G         | `@11vedikaa`      | IST      | 09:30 IST |

---

## 2. Role Definitions and Individual Accountability

### 2.1 Tino — System Architect & Reviewer

Tino is not assigned feature story points. His capacity is reserved for architecture, review
throughput, and unblocking other engineers. Sprint velocity planning must not assume that Tino
contributes product code; a sprint plan that does so is mis-scoped and must be corrected.

**Owns (exclusive write authority):**

| Artifact                                                         | Rationale for Sole Ownership                                                                                       |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `ARCHITECTURE.md`, `SERVICES_VIEW.md`, `REPOSITORY_STRUCTURE.md` | System-level documentation must remain authoritative and must not diverge across individual contributors.          |
| `docs/adr/**`                                                    | Architecture Decision Records — each decision has a single accountable owner.                                      |
| `packages/contracts/**`                                          | The cross-team API and event contract. Any engineer may propose a change via pull request; only Tino may merge it. |
| `.github/workflows/**`, `.github/CODEOWNERS`                     | Quality gates must not be modifiable by the individual whose work they are intended to gate.                       |
| `turbo.json`, `pnpm-workspace.yaml`, root `tsconfig.base.json`   | Build graph and module boundaries.                                                                                 |
| `docs/delivery/**`                                               | Sprint plan, backlog, and definition of done.                                                                      |

**Accountable for:**

1. **Mandatory reviewer on architect-owned paths only** — `packages/contracts/`, `.github/workflows/`, `.github/CODEOWNERS`, `ARCHITECTURE.md`, `docs/adr/`, `docs/delivery/`, build-graph files (`turbo.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`). No change to these paths merges without Tino's approval. Feature PRs touching only module-owned paths (`apps/api-core/src/modules/*`, `apps/web-*`, `packages/ui`, etc.) are reviewed and merged by the module owner — Tino's review is not required.
2. **Release gate** — Tino is the mandatory reviewer and merger of all promotion pull requests: `dev → qa` and `qa → main`. This is the architectural checkpoint for an entire sprint's worth of work.
3. **Contract change control** — every change to `@smart/contracts` requires a pull request with an ADR link, a migration note, and notification to all affected owners within the same pull request body.
4. **Daily Architecture Review Board (17:00 IST)** — thirty minutes. Purpose: triage flagged PRs (those touching architect-owned paths or tagged `area:contracts`), unblock cross-module design questions, and review any PR an engineer has escalated. Feature PRs in module-owned paths are not tabled here unless there is a design question.
5. **Definition of Done enforcement** — per `docs/delivery/DEFINITION_OF_DONE.md`. Rejections are made on the basis of the Definition of Done, not subjective preference.
6. **Cross-module integration correctness** — Kafka topic contracts, SLA budgets, the rate-limit matrix, and the RBAC matrix.
7. **Release management** — cutting `release/*` branches and providing sign-off on the code freeze and the General Availability (GA) tag, per the schedule maintained in `docs/delivery/AGILE_PLAN.md`.
8. **Technical debt register** (`docs/engineering/TECH_DEBT.md`) — any change merged with a known compromise is logged here within the same pull request.

Tino does not implement feature modules, resolve other engineers' failing tests, or assume
ownership of a blocked ticket. Blocked tickets are reassigned during standup and are not absorbed
by the architect.

---

### 2.2 Vishal V — Senior Backend Engineer

**Bounded context: Platform Core.** Everything that every other backend module depends on. Vishal
V is the most senior individual contributor on the team. He serves as the secondary reviewer for
all backend pull requests and is the designated escalation path when Ramansh, Vedika, or Vishal
Bharath are blocked on backend internals.

**Owns:**

| Path                                                                         | Deliverable                                                                                                                                    |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api-core/src/main.ts`, `app.module.ts`                                 | Fastify bootstrap, global pipes/filters/interceptors, Swagger, graceful shutdown.                                                              |
| `apps/api-core/src/platform/**`                                              | Config (validated env), logging (pino), Prisma service, Redis service, Kafka service, BullMQ registration, health/readiness, OpenTelemetry.    |
| `apps/api-core/src/modules/auth/**`                                          | 15-minute access JWT, HttpOnly refresh rotation, OAuth (Google/GitHub), SAML 2.0 / OIDC institutional SSO, RBAC guards, B2B `X-SMART-API-KEY`. |
| `apps/api-core/src/modules/users/**`                                         | Student/TPO/admin profile, track enrollment (primary + secondary).                                                                             |
| `apps/api-core/src/modules/rate-limit/**`                                    | Redis sliding-window + token-bucket Lua guard, role & endpoint matrix, `X-RateLimit-*` headers, `smart.rate_limit.exceeded`.                   |
| `apps/api-core/src/modules/sandbox/**`                                       | Non-networked Docker runner (256 MB / 1 CPU / 5 s), SQL executor on throwaway schema, watchdog.                                                |
| `apps/api-core/prisma/**`                                                    | **Schema steward.** All schema migrations are routed through this owner to prevent migration collisions across a multi-engineer team.          |
| `infra/docker/**`, `infra/k8s/**`, `infra/helm/**`, `infra/observability/**` | Local stack, images, manifests, Grafana/Prometheus/Loki wiring.                                                                                |
| `scripts/**`                                                                 | Bootstrap, seed, reset, diagnostics.                                                                                                           |

**Non-negotiables:** the local `pnpm dev` environment must function for all other engineers from
the outset; synchronous endpoints must maintain p95 latency below 200 ms; no Redis key may be
created without a TTL; database migrations must always be forward-only.

---

### 2.3 Satheswaran V — Frontend & Full-Stack Engineer

**Bounded context: Experience Layer.** Encompasses all interfaces used by students and placement
officers.

**Owns:**

| Path                     | Deliverable                                                                                                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ui/**`         | Design system on Tailwind 4 + shadcn/ui: tokens, theme, primitives, `TierBadge`, `TierTrail`, `ConfidenceNote`, `LevelStepper`, charts. Every application consumes this; no app-local component duplication is permitted. |
| `packages/api-client/**` | Typed fetch client generated against `@smart/contracts`, TanStack Query hooks, silent-refresh interceptor, 429/`Retry-After` handling.                                                                                    |
| `apps/web-student/**`    | Assessment player (L1 MCQ, L2 code editor, L3 recorder, L4 defense chat, L5 upload), Zustand attempt store, timer/auto-submit, growth & gap-report portal.                                                                |
| `apps/web-tpo/**`        | Cohort readiness dashboard, Gold/Silver/Bronze distribution, gap report, shortlist table with CSV/PDF export, JD upload UI.                                                                                               |

**Non-negotiables:** WCAG 2.1 AA compliance on the assessment player; the player must not lose an
answer on a network interruption (optimistic Redis draft with retry); Lighthouse performance
score of at least 90 on `web-verify` and the student dashboard; no `any` type may cross the API
boundary — all data is typed from contracts.

---

### 2.4 Vishal Bharath R — Full-Stack & Backend Engineer

**Bounded context: Assessment Lifecycle and Trust Chain.** Ownership spans the full attempt
lifecycle, from initiation through certificate issuance, together with the two surfaces that
establish the product's legitimacy: public verification and the administrative console.

**Owns:**

| Path                                       | Deliverable                                                                                                                                                                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/api-core/src/modules/assessment/**`  | Attempt orchestration, Redis session state `session:assessment:{attempt_id}`, server-authoritative timer with auto-submit, item delivery from `items:form:*` warm cache, level unlock gating (Bronze-or-above), integrity event log. |
| `apps/api-core/src/modules/certificate/**` | Tier Trail computation, headline tier, confidence note assembly, signed SHA-256 QR, Puppeteer PDF to R2, `smart.certificate.issued`.                                                                                                 |
| `apps/api-core/src/modules/webhooks/**`    | Outbound HMAC-SHA256 dispatcher, endpoint registry, retry with exponential backoff and DLQ.                                                                                                                                          |
| `apps/web-verify/**`                       | Public `verify.smart.com/cert/[id]` — Tier Trail, confidence note, calibration employer credits, QR validator. Cached, SSG/ISR, p95 latency below 80 ms.                                                                             |
| `apps/web-admin/**`                        | Super Admin console: system health, rate-limit overrides, user/institution management, integrity review queue, cut-score publish workflow.                                                                                           |

**Non-negotiables:** the timer must be authoritative on the server and cannot be circumvented from
the client; an attempt with `integrity_flag != 'CLEAN'` must not produce a certificate; the
verification page must be correct or must display an explicit error state — it must never present
a stale or partially computed tier.

---

### 2.5 Ramansh — AI Engineer

**Bounded context: All LLM and vector-search boundaries.** No other engineer is authorized to call
Anthropic or Google APIs directly; all AI traffic is routed through Ramansh's gateway. This
routing is the mechanism by which cost and failover are controlled.

**Owns:**

| Path                                      | Deliverable                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api-core/src/modules/ai-gateway/**` | Claude 5 Sonnet + Claude 4.7 clients, Redis token-bucket (200 RPM / 10k TPM), three priority queues (P1 L4 defense with 40% reserved capacity, P2 L3 grading, P3 batch), circuit breaker to **Gemini 2.5 Pro/Flash** on 429/5xx/timeout, prompt and response audit to `claude_evaluation_audits`, cost meter. |
| `apps/api-core/src/modules/evaluation/**` | L3 BARS mode-consensus grading, L4 interactive defense simulation, L5 split scoring (50% checklist / 30% rubric / 20% presentation), Cohen's κ monitor with automatic pause of automated scoring below κ 0.65.                                                                                                |
| `apps/api-core/src/modules/matching/**`   | JD-to-threshold-vector NLP parse, embedding generation, pgvector cosine search with rule filters, match explainability.                                                                                                                                                                                       |
| `packages/scoring-engine/**`              | Effect.ts pure math: Angoff μ/σ cut scores with confidence bands, tier assignment with borderline detection, weighted L1 scoring, IRT 2PL (Phase 2), Cohen's κ, Cronbach's α / KR-20.                                                                                                                         |
| `packages/prompts/**`                     | Versioned, immutable prompt templates with JSON output schemas. A prompt change is a version increment, never an in-place edit.                                                                                                                                                                               |

**Non-negotiables:** output must be deterministic, schema-validated structured data; free-text
responses parsed by regular expression are not permitted; every LLM call must be idempotent and
replayable from its audit record; a Gemini failover must produce a tier within the same SLA band
as the primary model; automated scoring must self-disable when Cohen's κ falls below 0.65 — this
is a product-integrity requirement, not an optional safeguard.

---

### 2.6 Vedika G — Data & AI/Backend Engineer

**Bounded context: Content and Data Spine.** Item-bank and calibration output constitutes the
foundational content and scoring reference for the platform; without it, no assessment can be
administered or graded. This work sits on the critical path of Sprint 1 and Sprint 2. Item-bank
readiness is a release blocker and must be tracked accordingly, not treated as incidental content
production.

**Owns:**

| Path                                        | Deliverable                                                                                                                                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tools/content-pipeline/**`                 | Authoring schema and CLI: `validate`, `seed`, `embed`, `export`, `report`. Item banks are maintained as reviewed files in version control, not as ad-hoc SQL.                                          |
| `tools/content-pipeline/data/**`            | 25–40 task-based items per track across ten tracks, competency weights, BARS anchor sets, L5 capstone briefs, per-cohort rotation forms.                                                               |
| `apps/api-core/src/modules/catalog/**`      | Tracks, competencies (Domains A–E), levels, item bank read APIs, parallel-form selection, item retirement on exposure.                                                                                 |
| `apps/api-core/src/modules/calibration/**`  | Calibration panels (3–5 practitioners per track), Angoff estimate capture, cut-score derivation and publication, Cronbach's α per level/track, confidence-note text generation, `smart.track.updated`. |
| `apps/api-core/src/modules/placement/**`    | JD records, shortlist generation and export, `placement_records` outcome ingestion, `smart.placement.matched`.                                                                                         |
| `apps/api-core/src/modules/analytics/**`    | Cohort readiness aggregates, gap reports, correlation records (interview/offer rate by tier), TPO report endpoints.                                                                                    |
| `packages/prompts/src/templates/goldens/**` | Golden evaluation sets — the regression suite verifying that a prompt change has not degraded grading quality. Co-owned with Ramansh.                                                                  |

**Non-negotiables:** every item must carry a `competency_id`, `real_world_weight`, `difficulty_tag`,
and a model answer; content must pass `content-pipeline validate` in continuous integration, or the
pull request fails; no track may be marked as validated until its calibration panel has convened
and Cronbach's α ≥ 0.70 is recorded in the database.

---

## 3. Module Ownership Matrix (Authoritative)

`O` = Owner (merges, accountable) · `C` = Contributor (may submit changes via pull request) · `R` = Reviewer (approval required)

### 3.1 Backend — `apps/api-core/src/modules/*`

| Module        | Bounded context                                     | Tino | Vishal V | Satheswaran | Vishal Bharath | Ramansh | Vedika |
| ------------- | --------------------------------------------------- | :--: | :------: | :---------: | :------------: | :-----: | :----: |
| `platform`    | Config, logging, Prisma, Redis, Kafka, health, OTel |  R   |  **O**   |             |       C        |    C    |   C    |
| `auth`        | JWT/refresh/OAuth/SSO/RBAC/API keys                 |  R   |  **O**   |      C      |       C        |         |        |
| `users`       | Profiles, track enrollment                          |  R   |  **O**   |      C      |       C        |         |        |
| `rate-limit`  | Sliding window + token bucket guards                |  R   |  **O**   |             |                |    C    |        |
| `sandbox`     | Docker code & SQL execution                         |  R   |  **O**   |             |       C        |         |        |
| `assessment`  | Attempts, sessions, timers, item delivery           |  R   |    C     |      C      |     **O**      |    C    |   C    |
| `certificate` | Tier Trail, QR, PDF, R2                             |  R   |    C     |             |     **O**      |         |   C    |
| `webhooks`    | HMAC outbound dispatcher + DLQ                      |  R   |    C     |             |     **O**      |         |        |
| `catalog`     | Tracks, competencies, levels, items                 |  R   |    C     |             |       C        |         | **O**  |
| `calibration` | Panels, Angoff cut scores, α, confidence notes      |  R   |          |             |                |    C    | **O**  |
| `placement`   | JD records, shortlists, outcomes                    |  R   |          |      C      |                |    C    | **O**  |
| `analytics`   | Cohort readiness, gap, correlation                  |  R   |          |      C      |                |         | **O**  |
| `ai-gateway`  | Claude + Gemini failover, token buckets             |  R   |    C     |             |                |  **O**  |   C    |
| `evaluation`  | BARS, L4 defense, L5 split, κ monitor               |  R   |          |             |       C        |  **O**  |   C    |
| `matching`    | JD parse, embeddings, pgvector cosine               |  R   |          |             |                |  **O**  |   C    |

### 3.2 Frontend & Shared Packages

| Package / App             | Tino  | Vishal V | Satheswaran | Vishal Bharath | Ramansh | Vedika |
| ------------------------- | :---: | :------: | :---------: | :------------: | :-----: | :----: |
| `packages/contracts`      | **O** |    C     |      C      |       C        |    C    |   C    |
| `packages/scoring-engine` |   R   |          |             |       C        |  **O**  |   C    |
| `packages/prompts`        |   R   |          |             |                |  **O**  |   C    |
| `packages/ui`             |   R   |          |    **O**    |       C        |         |        |
| `packages/api-client`     |   R   |    C     |    **O**    |       C        |         |        |
| `packages/observability`  |   R   |  **O**   |      C      |                |         |        |
| `packages/config-*`       | **O** |    C     |      C      |                |         |        |
| `apps/web-student`        |   R   |          |    **O**    |       C        |    C    |        |
| `apps/web-tpo`            |   R   |          |    **O**    |       C        |         |   C    |
| `apps/web-admin`          |   R   |    C     |      C      |     **O**      |         |   C    |
| `apps/web-verify`         |   R   |          |      C      |     **O**      |         |        |
| `tools/content-pipeline`  |   R   |          |             |                |    C    | **O**  |
| `tools/load-tests`        |   R   |  **O**   |             |       C        |         |        |
| `tests/e2e`               |   R   |    C     |    **O**    |       C        |    C    |   C    |
| `infra/**`                |   R   |  **O**   |             |       C        |         |        |
| `.github/workflows`       | **O** |    C     |             |                |         |        |

### 3.3 Kafka Topic Ownership

Each topic has exactly one producer-owner. Any team member may consume a topic. Modifying a
payload schema requires a pull request against `@smart/contracts`, reviewed by Tino and every
listed consumer of that topic.

| Topic                                                     | Producer-owner   | Consumers                                                   |
| --------------------------------------------------------- | ---------------- | ----------------------------------------------------------- |
| `smart.user.created` / `smart.user.updated`               | Vishal V         | Vedika (analytics)                                          |
| `smart.assessment.started` / `smart.assessment.submitted` | Vishal Bharath R | Ramansh (evaluation), Vishal V (cache invalidation)         |
| `smart.eval.requested`                                    | Ramansh          | Ramansh (ai-gateway)                                        |
| `smart.eval.completed`                                    | Ramansh          | Vishal Bharath (certificate), Vedika (placement, analytics) |
| `smart.track.updated`                                     | Vedika G         | Vishal V (cache invalidation), Vishal Bharath (certificate) |
| `smart.certificate.issued`                                | Vishal Bharath R | Vishal Bharath (webhooks), Vedika (analytics)               |
| `smart.placement.matched`                                 | Vedika G         | Vishal Bharath (webhooks), Vedika (analytics)               |
| `smart.rate_limit.exceeded`                               | Vishal V         | Vishal V (observability), Vishal Bharath (integrity review) |

---

## 4. Collaboration Framework

### 4.1 The Contract-First Rule

Cross-module work always originates in `packages/contracts`, never in an implementation.

1. The consumer opens a pull request adding or changing the Zod schema and type in `@smart/contracts`.
2. Tino reviews and merges it, typically within the same working day, at the Architecture Review Board.
3. Producer and consumer then implement in parallel against the merged type.

This mechanism allows the team to ship into a single API without engineers blocking one another.
Implementation by two parties against an unmerged contract is the leading cause of integration
defects and is not permitted.

### 4.2 Branching & Pull Request Flow

Full policy: [`docs/delivery/BRANCHING.md`](./docs/delivery/BRANCHING.md).

```
main ──────────────────────────────────────────────▶  production. Only @brittytino merges.
 │
 └── qa ───────────────────────────────────────────▶  release candidate / UAT
      │     ← Tino reviews and merges (release gate)
      └── dev ─────────────────────────────────────▶  team integration (default base)
           │     ← module owners review and merge feature PRs
           ├── feat/S6-VV-84-org-unification-schema
           ├── feat/S6-VB-xx-endorsement-reminder
           └── fix/S6-RM-21-gemini-failover-timeout
```

- The `develop` branch is deprecated; `dev` is the designated integration branch.
- Branch name format: `<type>/S<sprint>-<INITIALS>-<nn>-<slug>`
- Initials: `TN` Tino · `VV` Vishal V · `SV` Satheswaran V · `VB` Vishal Bharath R · `RM` Ramansh · `VG` Vedika G

**Pull request rules:**

- Maximum 400 changed lines of non-generated code per pull request. Larger changes must be split.
- Title follows Conventional Commits and names the ticket: `feat(rate-limit): sliding window Lua guard (S1-VV-04)`.
- Feature pull requests target `dev`. Promotion from `dev` to `qa` to `main` occurs via separate promotion pull requests (only Tino / `@brittytino` merges into `main`).
- **Review model for `dev` PRs:** The module owner of the touched paths is the required reviewer. Tino's review is only required for PRs touching architect-owned paths (`packages/contracts`, `.github/workflows/`, `.github/CODEOWNERS`, architecture docs, build-graph files). See [`.github/CODEOWNERS`](./.github/CODEOWNERS).
- Every pull request requires: a linked ticket, a completed PR template, passing CI, and at least one approval from the module owner.
- Squash merge only. `dev` history retains one commit per ticket.
- A pull request open for more than 24 hours without review must be raised in standup rather than left unaddressed.
- Required labels: one priority (`P0-blocker` / `P1` / `P1-high` / `P2-droppable`), one area (`area:backend` / `area:frontend` / `area:ai` / `area:data` / `area:infra` / `area:contracts`), one sprint (`sprint-0` … `sprint-6`). The `pr-label-check` workflow will auto-comment if labels are missing.

### 4.3 Escalation Path

| Situation                            | Required Action                                                                                                                  |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Blocked on a contract                | Post the blocker in `#smart-contracts` and tag Tino; resolved at the Architecture Review Board.                                  |
| Blocked on backend internals         | Tag Vishal V; he is the designated backend escalation path.                                                                      |
| Blocked on AI output quality or cost | Tag Ramansh. Direct SDK calls that bypass the gateway are not permitted.                                                         |
| Missing or incorrect content/items   | Tag Vedika G with the `content` label.                                                                                           |
| Cross-module design disagreement     | A fifteen-minute call is held, after which Tino decides and records the decision in an ADR. Design is not resolved by attrition. |
| Slipping a sprint commitment         | Report the slippage in standup as soon as it is known; do not defer disclosure to the sprint review.                             |

### 4.4 Interfaces Between Owners (Integration Seams)

| Seam                        | Between                      | Agreement                                                                                                                                                                    |
| --------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Player ⇄ Attempt API**    | Satheswaran ⇄ Vishal Bharath | The server is the clock and the authority. The client sends drafts; the server determines validity, expiry, and the next item. Contract: `AttemptSessionDto`, `NextItemDto`. |
| **Attempt ⇄ Evaluation**    | Vishal Bharath ⇄ Ramansh     | Handoff occurs exclusively via `smart.assessment.submitted`, never a direct service call. The result returns via `smart.eval.completed`.                                     |
| **Evaluation ⇄ Cut Scores** | Ramansh ⇄ Vedika             | Evaluation produces a raw score; calibration owns tier assignment via published `cut_scores`. Ramansh must not hardcode a threshold.                                         |
| **Content ⇄ Delivery**      | Vedika ⇄ Vishal Bharath      | Items are served only from `catalog` parallel forms; delivery must never query `items` directly.                                                                             |

---

## 5. Capacity & Velocity Assumptions

| Engineer         | Feature Capacity                              | Review Load                                                                                           |
| ---------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Tino             | 0 story points                                | Architect-owned paths (contracts, CI, arch docs) + all promotion PRs (`dev→qa`, `qa→main`)            |
| Vishal V         | 8 story points per sprint (steady-state rate) | **Primary reviewer** for all backend PRs; backend escalation path for Ramansh, Vedika, Vishal Bharath |
| Satheswaran V    | 8 story points per sprint (steady-state rate) | **Primary reviewer** for all frontend PRs (`packages/ui`, `apps/web-*`, `packages/api-client`)        |
| Vishal Bharath R | 8 story points per sprint (steady-state rate) | **Primary reviewer** for assessment lifecycle & trust chain modules                                   |
| Ramansh          | 8 story points per sprint (steady-state rate) | **Primary reviewer** for AI/scoring modules; co-reviewer with Vedika on golden eval sets              |
| Vedika G         | 8 story points per sprint (steady-state rate) | **Primary reviewer** for content, data spine, analytics modules                                       |

Planned team velocity is calculated on the basis of five delivery individual contributors (ICs).
Any sprint plan that assumes six delivery engineers is invalid, since Tino's capacity is reserved
for architecture and review rather than feature delivery.

---

## 6. Definition of Ownership — What "You Own It" Means

An owner of a module is accountable for all six of the following obligations. None is optional.

1. **It works** — the happy path, plus the failure modes named in the owner's non-negotiables.
2. **It is typed** — the public surface is exported through `@smart/contracts`; no `any` at boundaries.
3. **It is tested** — unit tests on logic, integration tests on I/O, at least 80% coverage on the owner's module by Sprint 5.
4. **It is observable** — structured logs with `traceId`, Prometheus counters/histograms, and a Grafana panel.
5. **It is documented** — Swagger decorators on every endpoint, a README in the module's folder, and a runbook in `docs/runbooks/` for anything capable of paging an on-call engineer.
6. **It is rate-limited and secured** — the module declares its rate-limit tier and its RBAC roles. Unlimited endpoints are not permitted to ship.

---

_This document is owned by Tino (System Architect). Amendments require a pull request to Tino and
are discussed at the Architecture Review Board._
