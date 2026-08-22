# SMART — Services View & Work Item Breakdown Architecture

> **Version:** v2.0 — Decoupled Microservices & Execution SLA Specification  
> **Last Updated:** 2026-08-20  
> **Maintainer:** Infinitica Engineering Team  
> **Purpose:** Single source of truth for SMART's decoupled service boundaries, auth strategy, sync/async execution SLAs, data contracts, Kafka event topics, API endpoints, and work item assignments per developer.

---

## 1. Executive Summary & Decoupled Architecture

Splitting SMART into 8 autonomous, decoupled microservice packages enables:

1. **Parallel Developer Assignment**: Developers can take 100% ownership of specific services without code conflicts.
2. **Decoupled Integration**: Microservices communicate asynchronously via **Apache Kafka** event topics and lightweight HTTP REST APIs using shared Zod/TypeScript DTO contracts (`packages/contracts`).
3. **Independent Deployments**: Each service module can be updated, scaled, or debugged independently without impacting the rest of the platform.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SMART DECOUPLED SERVICES VIEW                         │
│                                                                             │
│  [1. auth-service]  [2. assessment-service]  [3. sandbox-service]           │
│         │                      │                      │                     │
│         └──────────────────────┼──────────────────────┘                     │
│                                ▼                                            │
│                    [APACHE KAFKA EVENT STREAMING]                           │
│                                │                                            │
│         ┌──────────────────────┼──────────────────────┐                     │
│         ▼                      ▼                      ▼                     │
│  [4. claude-proxy]  [5. evaluation-service]  [6. placement-service]         │
│                                │                      │                     │
│                                ▼                      ▼                     │
│                     [7. certificate-service] [8. gateway-rate-limiter]      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Decoupled Services Breakdown & Work Item Assignments

### Service 1: `auth-service` (Identity & Access Control)

- **Developer Lead:** Satheeswaran
- **Monorepo Path:** `apps/api-core/src/modules/auth`
- **Core Responsibilities:**
  - Short-Lived JWT Access Tokens (15m) + HttpOnly Secure Refresh Tokens (7–14d).
  - Supabase Auth OAuth 2.0 (Google, GitHub) + SAML 2.0 / OIDC Institutional SSO (`@psgtech.ac.in`, `@bits-pilani.ac.in`).
  - Role-Based Access Control (RBAC) Guards for Super Admin, TPO, Student, and Public.
  - Student onboarding and track pre-assignment (Primary & Secondary specializations).
- **Primary REST Endpoints:**
  - `POST /api/v1/auth/login` `[SYNC <150ms]` — Authenticate user & issue 15m JWT + HttpOnly refresh cookie.
  - `POST /api/v1/auth/refresh` `[SYNC <100ms]` — Silent refresh of expired access token.
  - `GET /api/v1/users/me` `[SYNC <50ms]` — Retrieve active user profile & track assignments.
  - `PUT /api/v1/users/track` `[SYNC <100ms]` — Enroll or change specialization track.
- **Kafka Topics Published:** `smart.user.created`, `smart.user.updated`
- **Work Items / Deliverables:**
  1. [ ] Implement JWT access guard (15m) and HttpOnly secure refresh token rotation handler.
  2. [ ] Build SAML 2.0 / OpenID Connect (OIDC) institutional SSO integration via Supabase Auth.
  3. [ ] Build student profile REST endpoints and track assignment service.

---

### Service 2: `assessment-service` (Assessment Delivery & Session State)

- **Developer Lead:** Ramansh
- **Monorepo Path:** `apps/api-core/src/modules/assessment`
- **Core Responsibilities:**
  - L1–L5 test player execution, active timer enforcement, and question item delivery.
  - Candidate answer drafting & Redis session state management (`session:assessment:{attempt_id}`).
  - Dynamic L1 form selection from active item banks & anti-cheat telemetry event logging.
- **Primary REST Endpoints:**
  - `POST /api/v1/assessment/start` `[SYNC <150ms]` — Initialize assessment attempt session in Redis.
  - `GET /api/v1/assessment/next-item` `[SYNC <50ms]` — Fetch next question item for current attempt from warm cache.
  - `POST /api/v1/assessment/submit-l1` `[SYNC <30ms]` — Submit answer draft (Throttled at 10 req/min).
  - `POST /api/v1/assessment/complete` `[ASYNC BullMQ]` — Finalize assessment attempt & push to evaluation queue.
- **Kafka Topics Published:** `smart.assessment.started`, `smart.assessment.submitted`
- **Work Items / Deliverables:**
  1. [ ] Build assessment session manager backed by Redis `session:assessment:{id}`.
  2. [ ] Build real-time timer countdown service with auto-submission on expiration.
  3. [ ] Implement L1 weighted MCQ item selector algorithm.

---

### Service 3: `sandbox-service` (Isolated Code Execution Engine)

- **Developer Lead:** Tino
- **Monorepo Path:** `apps/api-core/src/modules/sandbox`
- **Core Responsibilities:**
  - Isolated Docker container runner for evaluating candidate Python/Node code and SQL queries.
  - Execution sandbox resource caps: 256 MB RAM, 1 CPU core, 5-second hard execution timeout.
  - BullMQ background queue processing to prevent CPU starvation on API workers.
- **Primary REST Endpoints:**
  - `POST /api/v1/assessment/compile-l2` `[ASYNC BullMQ SLA 1-3s]` — Push code snippet to execution queue; returns `job_id`.
- **Kafka Topics Consumed:** BullMQ job queue `bull:queue:sandbox_execution`
- **Work Items / Deliverables:**
  1. [ ] Provision Docker Engine API runner with non-networked container configuration.
  2. [ ] Build SQL query executor executing against isolated PostgreSQL temp schema.
  3. [ ] Implement execution timeout watchdog and CPU memory monitor.

---

### Service 4: `claude-proxy-service` (AI Token Proxy & Fallback Engine)

- **Developer Lead:** Ramansh
- **Monorepo Path:** `apps/api-core/src/modules/claude-proxy`
- **Core Responsibilities:**
  - Anthropic Claude 5 Sonnet & Claude 4.7 API integration with Token Bucket rate limiting (200 RPM / 10,000 TPM).
  - Automatic failover to **Google Gemini API (Gemini 2.5 Pro / Flash)** during rate limits or outages.
  - RAG vector context insertion using Supabase `pgvector` competency embeddings.
- **Primary REST Endpoints:**
  - `POST /api/v1/eval/claude` `[ASYNC SLA 2-5s]` — Internal proxy endpoint for structured JSON LLM completions.
- **Kafka Topics Consumed:** `smart.eval.requested`
- **Kafka Topics Published:** `smart.eval.completed`
- **Work Items / Deliverables:**
  1. [ ] Implement `ClaudeProxyService` with Redis Token Bucket rate limiter.
  2. [ ] Build automatic failover circuit breaker switching to Google Gemini API on HTTP 429/5xx.
  3. [ ] Integrate Supabase `pgvector` context retriever for domain rubrics.

---

### Service 5: `evaluation-service` (BARS & Scoring Engine)

- **Developer Lead:** Ramansh
- **Monorepo Path:** `apps/api-core/src/modules/evaluation`
- **Core Responsibilities:**
  - L3 spoken response BARS mode-consensus evaluation using Claude 5 Sonnet.
  - L4 AI interactive defense simulation handler & L5 capstone deliverable split scoring.
  - Integration with Effect.ts functional math package (`packages/scoring-engine`) for IRT & Angoff cut score calculation.
- **Primary REST Endpoints:**
  - `POST /api/v1/assessment/evaluate-l3-l4` `[ASYNC BullMQ SLA 2-6s]` — Request async spoken BARS evaluation.
  - `GET /api/v1/evaluation/results/:attempt_id` `[SYNC <80ms]` — Fetch itemized evaluation score breakdown.
- **Kafka Topics Consumed:** `smart.assessment.submitted`
- **Kafka Topics Published:** `smart.eval.completed`
- **Work Items / Deliverables:**
  1. [ ] Build BARS mode-consensus scoring module comparing transcripts to rubric anchors.
  2. [ ] Integrate Effect.ts (`packages/scoring-engine`) for Angoff standard error calculation.
  3. [ ] Implement inter-rater reliability monitor tracking Cohen's Kappa ($\kappa \ge 0.65$).

---

### Service 6: `placement-service` (Company Overlay & Vector Matching)

- **Developer Lead:** Satheeswaran
- **Monorepo Path:** `apps/api-core/src/modules/placement`
- **Core Responsibilities:**
  - Job Description (JD) NLP parsing via Claude 5 Sonnet into structured threshold vectors.
  - Vector cosine similarity candidate-company matching engine using Supabase `pgvector`.
  - TPO auto-shortlist generator, B2B API Key matching API (`X-SMART-API-KEY`), and Outbound Webhooks (`smart.placement.matched`).
- **Primary REST Endpoints:**
  - `POST /api/v1/placement/ingest-jd` `[ASYNC SLA 2-4s]` — Upload & parse JD PDF/text into threshold vectors.
  - `POST /api/v1/placement/match` `[ASYNC SLA 1-3s]` — Generate matched candidate shortlists (Throttled at 30 req/min).
  - `GET /api/v1/tpo/shortlist` `[SYNC <150ms]` — Retrieve filterable candidate shortlist for recruiters.
- **Kafka Topics Consumed:** `smart.eval.completed`
- **Kafka Topics Published:** `smart.placement.matched`
- **Outbound Webhooks:** Sends HMAC-SHA256 signed JSON payload to employer endpoints on `smart.placement.matched`.
- **Work Items / Deliverables:**
  1. [ ] Build JD NLP parser utilizing Claude 5 Sonnet to extract competency vectors.
  2. [ ] Implement vector cosine similarity search query against Supabase `pgvector`.
  3. [ ] Build B2B API Key handler and Webhook event dispatcher for employer integrations.

---

### Service 7: `certificate-service` (Certificate Generation & Public Verification)

- **Developer Lead:** Satheeswaran
- **Monorepo Path:** `apps/api-core/src/modules/certificate`
- **Core Responsibilities:**
  - Tier Trail JSON computation and headline tier issuance (Gold/Silver/Bronze).
  - Public verification URL handler (`verify.smart.com/cert/<UUID>`) with confidence note calculation.
  - Cryptographically signed dynamic QR code generator, Cloudflare R2 PDF certificate upload, and Webhook dispatching (`smart.certificate.issued`).
- **Primary REST Endpoints:**
  - `GET /api/v1/verify/:certificate_id` `[SYNC <80ms]` — Public certificate verification view (Throttled at 20 req/min per IP).
  - `POST /api/v1/certificates/issue` `[ASYNC BullMQ SLA 1-4s]` — Issue certificate record & trigger PDF generator upon level completion.
  - `GET /api/v1/certificates/export-pdf` `[SYNC Direct R2 URL]` — Download PDF certificate artifact.
- **Kafka Topics Consumed:** `smart.eval.completed`
- **Kafka Topics Published:** `smart.certificate.issued`
- **Outbound Webhooks:** Sends HMAC-SHA256 signed JSON payload to institutional ERPs on `smart.certificate.issued`.
- **Work Items / Deliverables:**
  1. [ ] Build public verification view renderer displaying Tier Trail & Confidence Note.
  2. [ ] Build dynamic QR code generator signing certificate hashes with SHA-256.
  3. [ ] Integrate Cloudflare R2 SDK and Webhook dispatcher for institutional verification.

---

### Service 8: `gateway-rate-limiter` (Edge Security & Sliding Window Guards)

- **Developer Lead:** Tino
- **Monorepo Path:** `apps/api-core/src/modules/rate-limiter` & Cloudflare Workers
- **Core Responsibilities:**
  - Edge security, Cloudflare DDoS protection, and SSL termination.
  - Redis sliding window log Lua script rate-limiting middleware (Super Admin 500/min, TPO 200/min, Student 60/min, Public 20/min, B2B API Keys 500/hour).
  - Standard HTTP rate limit header injection (`X-RateLimit-*`, `Retry-After`, HTTP status 429).
- **Middleware Scope:** Intercepts 100% of incoming API requests.
- **Kafka Topics Published:** `smart.rate_limit.exceeded`
- **Work Items / Deliverables:**
  1. [ ] Build NestJS rate-limiting guard executing Redis sliding-window Lua scripts.
  2. [ ] Implement role-based and B2B API key rate limit resolver (`X-SMART-API-KEY`).
  3. [ ] Configure Cloudflare Workers edge rate-limiting rules for public verification.

---

## 3. Work Item Assignment Matrix per Developer

| Developer        | Primary Service Ownership                                          | Secondary Support   | Target Sprint Focus                                                                                                  |
| ---------------- | ------------------------------------------------------------------ | ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Ramansh**      | `assessment-service`, `claude-proxy-service`, `evaluation-service` | Item Bank Ingestion | Sprint 1: Claude Proxy & Fallback<br>Sprint 2: Assessment Delivery & BARS Pipeline<br>Sprint 3: AI Defense Engine    |
| **Satheeswaran** | `auth-service`, `placement-service`, `certificate-service`         | Web UI Portals      | Sprint 1: Auth (JWT/Refresh/SSO)<br>Sprint 3: Placement Matching & Webhooks<br>Sprint 4: Verification & B2B API Keys |
| **Tino**         | `sandbox-service`, `gateway-rate-limiter`, Monorepo Infra          | Docker & K8s Ops    | Sprint 1: Docker Stack & Redis Rate Limiter<br>Sprint 2: Code Sandbox Runner<br>Sprint 4: Edge Gateway & SSL Tuning  |

---

_This document defines the decoupled microservice boundaries, auth SLA matrix, Kafka interfaces, and work item assignments for the SMART engineering team._
