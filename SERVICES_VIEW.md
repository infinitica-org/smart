# SMART — Module Boundaries & Service Topology

> **Version:** v3.0 — Modular Monolith Boundary & Interface Specification
> **Maintainer:** System Architect
> **Ownership:** Architectural content only. For current per-module and per-engineer ownership, see [`TEAM.md`](./TEAM.md).
> **Purpose:** Authoritative reference for SMART's backend module boundaries, authentication strategy, synchronous/asynchronous execution SLAs, data contracts, Kafka event topics, and REST API surface.

---

## 1. Executive Summary & Architecture

SMART's backend is implemented as a single deployable NestJS/Fastify application, `api-core`, organized as a **modular monolith**. The modules enumerated in this document (`apps/api-core/src/modules/*`) are logical boundaries enforced at the code level — each owns its controllers, services, and data-access patterns — rather than independently deployed microservices. All modules run in one process, are built and deployed together, and scale together as a single unit.

This organization is intended to yield most of the benefits commonly associated with service decomposition while avoiding the operational overhead of a distributed system:

1. **Bounded ownership without process fragmentation.** Each module has a clearly defined bounded context and a single accountable owner (see `TEAM.md`), which allows parallel development with minimal merge conflict, without requiring separate deployments, separate runtimes, or cross-process network calls for routine operations.
2. **Internal decoupling via events and contracts.** Modules that must react to state changes owned by another module do so asynchronously through **Apache Kafka** event topics, or synchronously through shared, versioned TypeScript/Zod contracts (`packages/contracts`) — not through direct imports of another module's internals.
3. **Unified deployment and scaling.** The `api-core` application is built, versioned, deployed, and horizontally scaled as one unit. A change to any module ships as part of the same release artifact; there is no independent scaling, independent rollback, or independent on-call boundary per module.

The one genuine exception to this topology is **`proctoring-cv`** (`apps/proctoring-cv`), a separate Python application performing computer-vision based integrity analysis. It is built, deployed, and scaled independently of `api-core`, and is invoked over its own internal HTTP interface (`/analyze`, `/health`) by the `proctoring` module inside `api-core`. It is the only component in this repository that constitutes an actual standalone service in the sense this document's module boundaries do not.

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                          SMART BACKEND TOPOLOGY                                    │
│                                                                                     │
│  ┌───────────────────────── api-core (single NestJS/Fastify process) ───────────┐ │
│  │                                                                                │ │
│  │   [auth]         [assessment]      [sandbox]        [ai-gateway]              │ │
│  │      │                 │                │                  │                  │ │
│  │      └─────────────────┼────────────────┼──────────────────┘                  │ │
│  │                  internal calls + shared contracts (packages/contracts)       │ │
│  │      ┌─────────────────┼────────────────┼──────────────────┐                  │ │
│  │      │                 │                │                  │                  │ │
│  │   [evaluation]    [placement]     [certificate]      [rate-limit]  (+19 more) │ │
│  └────────────────────────────────────┬───────────────────────────────────────────┘ │
│                                        │ async events                              │
│                                        ▼                                           │
│                        [ APACHE KAFKA EVENT STREAMING ]                            │
│                                        │                                           │
│                                        ▼                                           │
│                    [ proctoring-cv — separate Python service ]                     │
│                    (invoked over HTTP by the `proctoring` module)                  │
└───────────────────────────────────────────────────────────────────────────────────┘
```

Edge-layer concerns — SSL termination, DDoS protection, and IP-level rate limiting — are handled by the infrastructure layer (reverse proxy / CDN, per `REPOSITORY_STRUCTURE.md`) ahead of `api-core`, and are not implemented by any application module described in this document.

---

## 2. Module Boundaries & Interface Reference

The following module boundaries account for a representative subset of `api-core`'s business logic and are retained here for their interface and SLA detail. The authoritative, current module list is `apps/api-core/src/modules/*`, and the full ownership matrix is maintained in `TEAM.md` §3.1. Modules not detailed below — `analytics`, `calibration`, `candidate-certificates`, `candidate-education`, `candidate-languages`, `catalog`, `corroboration`, `evidence`, `institutions`, `integrations`, `invitations`, `matching`, `notifications`, `proctoring`, `projects`, `public-profile`, `signal-encoder`, `signal-ingestion`, `username`, `users`, `webhooks`, `work-experience` — follow the same boundary and interface conventions and are documented at the module level rather than here.

### Module: `auth` (Identity & Access Control)

- **Path:** `apps/api-core/src/modules/auth`
- **Responsibilities:**
  - Short-lived JWT access tokens (15 min) and HttpOnly secure refresh tokens (7–14 days).
  - OAuth 2.0 (Google, GitHub) and SAML 2.0 / OIDC institutional SSO (e.g. `@psgtech.ac.in`, `@bits-pilani.ac.in`).
  - Role-Based Access Control (RBAC) guards for Super Admin, TPO, Student, and Public roles.
  - Student onboarding and track pre-assignment (primary and secondary specializations).
- **Primary REST Endpoints:**
  - `POST /api/v1/auth/login` `[SYNC <150ms]` — Authenticate user and issue a 15-minute JWT plus HttpOnly refresh cookie.
  - `POST /api/v1/auth/refresh` `[SYNC <100ms]` — Silent refresh of an expired access token.
  - `GET /api/v1/users/me` `[SYNC <50ms]` — Retrieve the active user profile and track assignments.
  - `PUT /api/v1/users/track` `[SYNC <100ms]` — Enroll in or change a specialization track.
- **Kafka Topics Published:** `smart.user.created`, `smart.user.updated`
- **Key Implementation Concerns:** JWT access guard and HttpOnly refresh-token rotation; SAML 2.0 / OIDC institutional SSO integration; student profile endpoints and track-assignment logic.

---

### Module: `assessment` (Assessment Delivery & Session State)

- **Path:** `apps/api-core/src/modules/assessment`
- **Responsibilities:**
  - L1–L5 test player execution, active timer enforcement, and question-item delivery.
  - Candidate answer drafting and Redis session-state management (`session:assessment:{attempt_id}`).
  - Dynamic L1 form selection from active item banks, and anti-cheat telemetry event logging.
- **Primary REST Endpoints:**
  - `POST /api/v1/assessment/start` `[SYNC <150ms]` — Initialize an assessment attempt session in Redis.
  - `GET /api/v1/assessment/next-item` `[SYNC <50ms]` — Fetch the next question item for the current attempt from warm cache.
  - `POST /api/v1/assessment/submit-l1` `[SYNC <30ms]` — Submit an answer draft (throttled at 10 req/min).
  - `POST /api/v1/assessment/complete` `[ASYNC BullMQ]` — Finalize the assessment attempt and enqueue it for evaluation.
- **Kafka Topics Published:** `smart.assessment.started`, `smart.assessment.submitted`
- **Key Implementation Concerns:** Redis-backed session manager (`session:assessment:{id}`); server-authoritative timer with auto-submission on expiry; weighted L1 item-selection logic.

---

### Module: `sandbox` (Isolated Code Execution)

- **Path:** `apps/api-core/src/modules/sandbox`
- **Responsibilities:**
  - Isolated, non-networked Docker container execution for candidate Python/Node code and SQL queries.
  - Resource caps on execution: 256 MB RAM, 1 CPU core, 5-second hard timeout.
  - BullMQ background queue processing to isolate execution load from API request workers.
- **Primary REST Endpoints:**
  - `POST /api/v1/assessment/compile-l2` `[ASYNC BullMQ, SLA 1–3s]` — Enqueue a code snippet for execution; returns a `job_id`.
- **Queue:** BullMQ queue `bull:queue:sandbox_execution`
- **Key Implementation Concerns:** Non-networked Docker Engine API runner; SQL executor against an isolated PostgreSQL temp schema; execution-timeout watchdog and CPU/memory monitor.

---

### Module: `ai-gateway` (LLM Proxy & Failover)

- **Path:** `apps/api-core/src/modules/ai-gateway`
- **Responsibilities:**
  - Anthropic Claude 5 Sonnet and Claude 4.7 API integration with token-bucket rate limiting (200 RPM / 10,000 TPM).
  - Automatic failover to Google Gemini (2.5 Pro / Flash) during rate limiting or provider outages.
  - RAG context retrieval using PostgreSQL `pgvector` competency embeddings.
- **Primary REST Endpoints:**
  - `POST /api/v1/eval/claude` `[ASYNC, SLA 2–5s]` — Internal endpoint for structured JSON LLM completions.
- **Kafka Topics Consumed:** `smart.eval.requested`
- **Kafka Topics Published:** `smart.eval.completed`
- **Key Implementation Concerns:** Redis token-bucket rate limiter; circuit breaker that fails over to Gemini on HTTP 429/5xx; `pgvector` context retrieval for domain rubrics.

---

### Module: `evaluation` (BARS & Scoring)

- **Path:** `apps/api-core/src/modules/evaluation`
- **Responsibilities:**
  - L3 spoken-response BARS mode-consensus evaluation using Claude 5 Sonnet.
  - L4 AI interactive defense simulation, and L5 capstone deliverable split scoring.
  - Integration with the Effect.ts scoring package (`packages/scoring-engine`) for IRT and Angoff cut-score calculation.
- **Primary REST Endpoints:**
  - `POST /api/v1/assessment/evaluate-l3-l4` `[ASYNC BullMQ, SLA 2–6s]` — Request asynchronous spoken/BARS evaluation.
  - `GET /api/v1/evaluation/results/:attempt_id` `[SYNC <80ms]` — Retrieve an itemized evaluation score breakdown.
- **Kafka Topics Consumed:** `smart.assessment.submitted`
- **Kafka Topics Published:** `smart.eval.completed`
- **Key Implementation Concerns:** BARS mode-consensus scoring against rubric anchors; Angoff standard-error calculation via `packages/scoring-engine`; inter-rater reliability monitoring (Cohen's Kappa, target κ ≥ 0.65).

---

### Module: `placement` (Company Overlay & Vector Matching)

- **Path:** `apps/api-core/src/modules/placement`
- **Responsibilities:**
  - Job description (JD) NLP parsing via Claude 5 Sonnet into structured threshold vectors.
  - Vector cosine-similarity candidate-to-company matching using PostgreSQL `pgvector`.
  - TPO auto-shortlist generation, B2B API-key matching (`X-SMART-API-KEY`), and outbound webhooks (`smart.placement.matched`).
- **Primary REST Endpoints:**
  - `POST /api/v1/placement/ingest-jd` `[ASYNC, SLA 2–4s]` — Upload and parse a JD document into threshold vectors.
  - `POST /api/v1/placement/match` `[ASYNC, SLA 1–3s]` — Generate matched candidate shortlists (throttled at 30 req/min).
  - `GET /api/v1/tpo/shortlist` `[SYNC <150ms]` — Retrieve a filterable candidate shortlist for recruiters.
- **Kafka Topics Consumed:** `smart.eval.completed`
- **Kafka Topics Published:** `smart.placement.matched`
- **Outbound Webhooks:** HMAC-SHA256-signed JSON payloads to employer endpoints on `smart.placement.matched`.
- **Key Implementation Concerns:** JD NLP parser extracting competency vectors; `pgvector` cosine-similarity search; B2B API-key handling and webhook dispatch for employer integrations.

---

### Module: `certificate` (Certificate Generation & Public Verification)

- **Path:** `apps/api-core/src/modules/certificate`
- **Responsibilities:**
  - Tier Trail computation and headline tier issuance (Gold/Silver/Bronze).
  - Public verification handling with confidence-note calculation.
  - Cryptographically signed dynamic QR code generation, object-storage PDF upload, and webhook dispatch (`smart.certificate.issued`).
- **Primary REST Endpoints:**
  - `GET /api/v1/verify/:certificate_id` `[SYNC <80ms]` — Public certificate verification (throttled at 20 req/min per client).
  - `POST /api/v1/certificates/issue` `[ASYNC BullMQ, SLA 1–4s]` — Issue a certificate record and trigger PDF generation on level completion.
  - `GET /api/v1/certificates/export-pdf` `[SYNC]` — Retrieve the PDF certificate artifact.
- **Kafka Topics Consumed:** `smart.eval.completed`
- **Kafka Topics Published:** `smart.certificate.issued`
- **Outbound Webhooks:** HMAC-SHA256-signed JSON payloads to institutional systems on `smart.certificate.issued`.
- **Key Implementation Concerns:** Public verification view rendering Tier Trail and confidence note; SHA-256-signed dynamic QR generation; object-storage upload and webhook dispatch for institutional verification.

---

### Module: `rate-limit` (Request Throttling & Quota Enforcement)

- **Path:** `apps/api-core/src/modules/rate-limit`
- **Responsibilities:**
  - In-process Redis sliding-window and token-bucket rate limiting (Super Admin 500/min, TPO 200/min, Student 60/min, Public 20/min, B2B API keys 500/hour).
  - Standard HTTP rate-limit header injection (`X-RateLimit-*`, `Retry-After`, HTTP 429).
  - Role- and API-key-based limit resolution (`X-SMART-API-KEY`).
- **Scope:** Applied as guards/middleware across incoming requests within `api-core`. It does not perform edge-level SSL termination or DDoS mitigation; those are handled at the infrastructure layer ahead of the application (see `REPOSITORY_STRUCTURE.md`) and are outside this module's boundary.
- **Kafka Topics Published:** `smart.rate_limit.exceeded`
- **Key Implementation Concerns:** Redis sliding-window and token-bucket Lua scripts; role-based and API-key-based limit resolution; coordination with edge/infrastructure rate-limiting rules.

---

## 3. Module Ownership

Per-module and per-engineer ownership, review responsibilities, delivery-schedule assignments, and the Kafka topic producer/consumer matrix are maintained exclusively in [`TEAM.md`](./TEAM.md), which is this repository's designated and current source of truth for named ownership. This document intentionally carries no per-individual work-item assignments; it defines module boundaries and interfaces independent of who currently implements them.

---

_This document defines the module boundaries, authentication and SLA model, Kafka interfaces, and REST surface of the SMART `api-core` application, together with the one genuinely separate service in the backend topology, `proctoring-cv`. It carries no engineer- or sprint-level assignment information; see `TEAM.md` and `docs/delivery/AGILE_PLAN.md` for those._
