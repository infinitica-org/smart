# SMART — Master Technical Architecture & Product Specification

> **Version:** v2.0 — Final Master Architecture Reference  
> **Last Updated:** 2026-08-20  
> **Maintainer:** Infinitica Engineering Team  
> **Purpose:** Single source of truth for SMART's product vision, microservice architecture, rate limiting specification, Claude AI engine, scoring mechanics, domain taxonomies, placement overlay, public verification, and 5-Sprint delivery plan.

---

## Table of Contents

1. [System Vision & Core Philosophy](#1-system-vision--core-philosophy)
2. [Decoupled AI Strategy — Claude Engine Architecture](#2-decoupled-ai-strategy--claude-engine-architecture)
3. [System Architecture & Scalability (1M Scale)](#3-system-architecture--scalability-1m-scale)
4. [Comprehensive Rate Limiting System Architecture](#4-comprehensive-rate-limiting-system-architecture)
5. [Core Data Model (PostgreSQL Relational Schema)](#5-core-data-model-postgresql-relational-schema)
6. [The Level × Tier Scoring Engine](#6-the-level--tier-scoring-engine)
7. [Claude AI Management Engine & RAG Pipeline](#7-claude-ai-management-engine--rag-pipeline)
8. [Domain Taxonomy 1 — IT Role Tracks (5 Roles)](#8-domain-taxonomy-1--it-role-tracks-5-roles)
9. [Domain Taxonomy 2 — MBA Role Tracks (5 Roles)](#9-domain-taxonomy-2--mba-role-tracks-5-roles)
10. [Placement Overlay & Vector Matching Engine](#10-placement-overlay--vector-matching-engine)
11. [Public Verification & Trust Chain Pipeline](#11-public-verification--trust-chain-pipeline)
12. [Stakeholder Feature Specifications](#12-stakeholder-feature-specifications)
13. [Integrity & Anti-Cheating Architecture](#13-integrity--anti-cheating-architecture)
14. [Business Model & Institutional Growth Mechanics](#14-business-model--institutional-growth-mechanics)
15. [Detailed 5-Sprint Execution Plan](#15-detailed-5-sprint-execution-plan)
16. [Observability, Logging & Rate Limit Monitoring](#16-observability-logging--rate-limit-monitoring)
17. [V1 Scope vs. Phase 2 Scope](#17-v1-scope-vs-phase-2-scope)
18. [Risk Management & Fallback Protocols](#18-risk-management--fallback-protocols)

---

## 1. System Vision & Core Philosophy

SMART is a **role-specific readiness certification platform**. It assesses candidates against real competency requirements for a specific job track — not a generic aptitude score — and issues a criterion-referenced **Gold / Silver / Bronze** certificate that is:

- **Transparent** about its own methodology.
- **Honest** about its calibration maturity.
- **Student-controlled** and publicly verifiable.
- **Backed by correlation data** from real hiring outcomes.

### 1.1 One-Liner

_SMART tells you who's actually ready for the job — and shows its work._

### 1.2 Placement Infrastructure Positioning

SMART sits directly between academia and industry. It certifies readiness per specialization track based on real competencies that hiring managers demand. The ultimate metric for SMART is **Placement Conversion Rate** — tracked via whether certified students achieve higher interview-to-offer rates than non-certified baselines.

### 1.3 Core Values

| Value                           | Engineering & Product Definition                                                                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Precision over breadth**      | One role track certified with deep rigor beats five shallow tests. Certificates are issued per specialization, never as a generic score.                               |
| **Transparency over authority** | Scoring methodology, item weights, and Angoff cutoffs are exposed. Anyone can inspect how a tier was determined.                                                       |
| **Honesty over inflation**      | Every report carries a **Confidence Note** stating sample size, Cronbach's alpha, and calibration maturity. Nothing is labeled "standardized" without empirical proof. |

---

### 1.4 Enterprise Authentication & Dual API Access Model

#### 1.4.1 Dual-Token Authentication & Identity Architecture

To ensure high security while protecting backend databases from token validation churn under 50k peak concurrent load:

- **Short-Lived JWT Access Tokens (15 Minutes)**: Sent via `Authorization: Bearer <JWT>` header for stateless, zero-DB-hit in-memory validation in NestJS Guards across all microservices.
- **HttpOnly Secure Refresh Tokens (7–14 Days)**: Stored in an `HttpOnly`, `Secure`, `SameSite=Strict` cookie. When access tokens expire, Next.js / NestJS clients seamlessly issue silent refresh calls to `/api/v1/auth/refresh` without prompting the user.
- **OAuth 2.0 / OIDC & Institutional SSO**: Integrated via Supabase Auth:
  - **Candidates / Students**: Google Workspace & GitHub OAuth (one-click onboarding).
  - **Institutions (Universities & Placement Offices)**: SAML 2.0 / OpenID Connect (OIDC) SSO for institutional university logins (e.g., `@psgtech.ac.in`, `@bits-pilani.ac.in`).

#### 1.4.2 Dual API Access & External Webhook Infrastructure

- **Internal Platform APIs (90% of traffic)**: Protected by JWT claims, CORS policies, and CSRF protection. Serves Next.js frontend applications (`web-student`, `web-tpo`, `web-admin`).
- **Public Verification Endpoint**: `GET /api/v1/verify/:certificate_id` (`verify.smart.com`) is **publicly accessible** without authentication, enforced by Redis IP sliding-window rate limiters (20 req/min).
- **B2B API Key Access (`X-SMART-API-KEY`)**: Dedicated, rate-limited REST endpoints for institutional ERPs and recruiting partners to query candidate readiness scorecards and verified badge metadata.
- **Outbound Webhooks Engine**: Real-time HTTP event dispatchers (`smart.certificate.issued`, `smart.placement.matched`) sending cryptographically signed HMAC-SHA256 payloads to registered university & calibration employer endpoints.

---

## 2. Decoupled AI Strategy — Claude Engine Architecture

> **Architecture Directives:**
>
> 1. **Orion Decoupling:** Orion RAG is being developed separately by a parallel team. SMART does **NOT** depend on or wait for Orion APIs.
> 2. **Claude AI Engine & Gemini Fallback:** SMART directly integrates with **Anthropic's Claude 5 Sonnet & Claude 4.7 API** as its core intelligence layer, backed by automatic failover to the **Google Gemini API (Gemini 2.5 Pro / Flash)**.
> 3. **Native Vector RAG:** SMART manages its own RAG vector store using Supabase **`pgvector`** (or ChromaDB in local development) to store domain competency blueprints, Angoff rubrics, and evaluation benchmarks.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│               SMART AI ENGINE (CLAUDE + GEMINI FALLBACK)                    │
│                                                                             │
│  ┌──────────────────────┐    ┌──────────────────────┐    ┌───────────────┐  │
│  │     Claude 4.7       │    │   Claude 5 Sonnet    │    │  Supabase /   │  │
│  │ (Fast Extraction &   │    │ (BARS Evaluation,    │    │   pgvector    │  │
│  │ Item Pre-Processing) │    │  Defense & NLP JD)   │    │ (RAG Vector)  │  │
│  └──────────┬───────────┘    └──────────┬───────────┘    └───────┬───────┘  │
│             │                           │                        │          │
│             └───────────────────┬───────┴────────────────────────┘          │
│                                 ▼                                           │
│                     ┌───────────────────────┐                               │
│                     │  Claude Proxy Service │                               │
│                     │  • Token Bucket Rate  │                               │
│                     │  • Fallback Engine    │──▶ [Google Gemini 2.5 API]    │
│                     │  • Cache Layer (Redis)│                               │
│                     └───────────────────────┘                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Primary & Fallback AI Responsibilities

- **Claude 5 Sonnet (Primary)**: Handlers for L3 spoken response grading, L4 interactive defense simulation, L5 capstone qualitative evaluation, and unstructured Job Description (JD) NLP parsing.
- **Claude 4.7 (Primary)**: Handlers for rapid MCQ item generation, candidate response pre-tokenization, basic intent classification, and initial rubric keyword matching.
- **Google Gemini 2.5 Pro / Flash (Automatic Fallback Engine)**: Seamless failover target triggered automatically when Anthropic API returns HTTP 429 (rate limit), 5xx (server error), or timeout exceptions.
- **Supabase pgvector Integration**: Stores embedding vectors of competency blueprints and model rubric responses for fast RAG context insertion during evaluation.

---

## 3. System Architecture & Scalability (1M Scale)

> **Monorepo & Services Blueprints:**  
> • For complete file-level repository structure and stack details, see [REPOSITORY_STRUCTURE.md](file:///mnt/Data/Work%27s/Grad360%20/smart/REPOSITORY_STRUCTURE.md).  
> • For decoupled microservices, Kafka interfaces, and developer work item assignments, see [SERVICES_VIEW.md](file:///mnt/Data/Work%27s/Grad360%20/smart/SERVICES_VIEW.md).

Target Capacity: **1 Million Active Candidates per Placement Season** with a peak concurrency of **50,000 active test takers**.

````
┌─────────────────────────────────────────────────────────────────────────────┐
│                             EDGE GATEWAY LAYER                              │
│              Cloudflare DDoS Protection + Kong API Gateway                  │
│            • IP Rate Limiting (20 req/min unauthenticated)                  │
│            • TLS Termination & Geo Routing                                  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API MIDDLEWARE LAYER                              │
│                Redis Sliding Window Rate Limiting Middleware                │
│          • Role-Based Rate Limits (Super Admin, TPO, Student)               │
│          • Endpoint Throttling & Header Injection                           │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MICROSERVICES CORE                                │
│                                                                             │
│  ┌─────────────────┐   ┌─────────────────┐   ┌──────────────────────────┐   │
│  │  Auth & User    │   │   Assessment    │   │   Scoring Engine         │   │
│  │  Service        │   │   Delivery      │   │   (NestJS +              │   │
│  │  (Clerk / JWT)  │   │   (NestJS Core) │   │   Effect.ts Math)        │   │
│  └─────────────────┘   └────────┬────────┘   └──────────────────────────┘   │
│                                 │                                           │
│                                 ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Async Event Bus & Task Queue (Apache Kafka + BullMQ / Redis)         │  │
│  │  • L2 Code Execution Sandbox Runner                                   │  │
│  │  • L3 / L4 Claude Audio-Visual BARS Evaluator                         │  │
│  │  • Vector Match Batch Generator                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────┐   ┌─────────────────┐   ┌──────────────────────────┐   │
│  │ Placement       │   │  Certificate    │   │  Claude AI               │   │
│  │ Overlay Engine  │   │  Verification   │   │  Management Engine       │   │
│  └─────────────────┘   └─────────────────┘   └──────────────────────────┘   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             PERSISTENCE LAYER                               │
│  ┌──────────────────┐   ┌──────────────────┐   ┌─────────────────────────┐  │
│  │ Supabase Postgres│   │ Redis Cluster    │   │ Cloudflare R2           │  │
│  │ Primary DB +     │   │ Rate Limits &    │   │ Zero Egress Storage     │  │
│  │ pgvector Search   │   │ Active Sessions  │   │ L3 Audio & PDF Certs    │  │
│  └──────────────────┘   └──────────────────┘   └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
---

### 3.2 Synchronous vs. Asynchronous Execution SLA Matrix

> **Latency Rule of Thumb:**
> Any HTTP operation with an execution SLA **< 200ms** runs **Synchronously**.
> Any execution involving Docker container sandboxes, audio processing, LLM generation, or batch matrix search MUST run **Asynchronously via BullMQ & Apache Kafka**.

| Operation / Feature | Execution Mode | SLA Target | Transport / Queue | Architectural Rationale |
|---|---|---|---|---|
| **User Login & Token Refresh** | **Synchronous (HTTP)** | < 150 ms | NestJS Auth REST API | Immediate session setup required for UI render. |
| **Fetch Next L1 MCQ Item** | **Synchronous (HTTP)** | < 50 ms | Redis Warm Cache (`items:form:*`) | Candidate test player speed; zero DB query hit. |
| **Save L1 Answer Draft** | **Synchronous (HTTP)** | < 30 ms | Redis Session Hash (`session:assessment:*`)| Immediate answer draft receipt response. |
| **Public Certificate Lookup** | **Synchronous (HTTP)** | < 80 ms | Redis Verification Cache (`verify:cert:*`)| Instant load on `verify.smart.com` for employers. |
| **L2 Code / SQL Sandbox Execution**| **Asynchronous (BullMQ)** | 1.0 – 3.0 sec | `bull:queue:sandbox_execution` | Isolated Docker execution prevents CPU starvation on API workers. Returns `job_id` for polling/WebSocket. |
| **L3 Audio Spoken Response Upload** | **Asynchronous (Direct Cloudflare R2)** | 500 ms (Upload) | Cloudflare R2 Presigned URL | Direct client-to-R2 upload bypasses backend API payload overhead. |
| **Claude 5 Sonnet BARS Audio Grading**| **Asynchronous (BullMQ + Kafka)** | 2.0 – 6.0 sec | `bull:queue:audio_evaluation` & `smart.eval.requested` | LLM inference latency budget exceeds HTTP sync timeout. |
| **PDF Certificate Generation** | **Asynchronous (BullMQ)** | 1.5 – 4.0 sec | `bull:queue:pdf_generation` | Puppeteer PDF render & Cloudflare R2 upload runs asynchronously post-scoring. |
| **Candidate-JD Vector Matching** | **Asynchronous (Kafka Event)** | 1.0 – 3.0 sec | Kafka Topic `smart.placement.matched` | Supabase `pgvector` batch matrix computation runs in background. |

---

## 4. Comprehensive Rate Limiting System Architecture

> **Mandate:** Rate limit EVERY interface, service, endpoint, role, and LLM call in explicit detail.

### 4.1 Rate Limiting Technical Mechanics
- **Algorithm:** Distributed **Sliding Window Counter** combined with **Token Bucket** algorithm implemented in Redis via Lua scripts (`redis-cell` compliant).
- **Enforcement Layers:**
  1. **Edge Gateway (Kong / NGINX / Cloudflare)**: Protects against DDoS, volumetric IP abuse, and scrapers.
  2. **Application Middleware (NestJS Guards / Redis)**: Enforces role-based, tenant-based, candidate-session, and endpoint-specific limits.
  3. **LLM Proxy Engine**: Enforces token-per-minute (TPM) and request-per-minute (RPM) bucket constraints on the Anthropic Claude API.

### 4.2 Standard HTTP Rate Limit Headers
Every response returned by the SMART API MUST include the following headers:
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1771574400
Retry-After: 60
````

When a client exceeds their rate limit, the API immediately returns HTTP status `429 Too Many Requests` with a structured error body:

```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests. Please wait 60 seconds before retrying.",
  "retry_after_seconds": 60,
  "limit": 60,
  "window": "1 minute"
}
```

### 4.3 Detailed Role-Based Rate Limits

| User Role                        | Endpoint Scope                                    | Max Requests / Min | Burst Capacity | Window | Action on Violation                    |
| -------------------------------- | ------------------------------------------------- | ------------------ | -------------- | ------ | -------------------------------------- |
| **Super Admin**                  | All Administrative APIs (`/api/v1/admin/*`)       | 500 req/min        | 100            | 60s    | 429 Error + Warning Alert Log          |
| **Institution Admin (TPO)**      | Cohort & Placement APIs (`/api/v1/tpo/*`)         | 200 req/min        | 50             | 60s    | 429 Error + Temporary 2-min Throttling |
| **Placement Officer Staff**      | Shortlist & Filtering (`/api/v1/tpo/shortlist`)   | 150 req/min        | 40             | 60s    | 429 Error                              |
| **Student (General Navigation)** | Profile, Dashboard, Results (`/api/v1/student/*`) | 60 req/min         | 15             | 60s    | 429 Error                              |
| **Student (Active Assessment)**  | Submit Answers (`/api/v1/assessment/submit-l1`)   | 10 req/min         | 3              | 60s    | 429 Error + Session Integrity Log      |
| **Unauthenticated / Public**     | Certificate Verification (`/api/v1/verify/*`)     | 20 req/min per IP  | 5              | 60s    | 429 Error + Cloudflare IP Challenge    |

### 4.4 Granular Endpoint-Specific Throttling Matrix

```
                     ┌──────────────────────────────────────┐
                     │       API CALL INGESTION ENGINE      │
                     └──────────────────┬───────────────────┘
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             ▼                          ▼                          ▼
   ┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
   │  AUTH ENDPOINTS  │       │ L2 CODE SANDBOX  │       │  CLAUDE EVAL API │
   │ 10 req/min / IP  │       │ 10 runs/min/user │       │  200 RPM / 10k   │
   │ (Anti-Bruteforce)│       │ (CPU Throttle)   │       │  TPM (LLM Queue) │
   └──────────────────┘       └──────────────────┘       └──────────────────┘
```

| Target Endpoint                     | Rate Limit           | Scope             | Redis Key Format               | Technical Rationale                                                |
| ----------------------------------- | -------------------- | ----------------- | ------------------------------ | ------------------------------------------------------------------ |
| `/api/v1/auth/login`                | 10 req/min           | IP Address        | `rl:auth:ip:{ip}`              | Prevents credential stuffing and brute-force attacks.              |
| `/api/v1/auth/refresh`              | 20 req/min           | IP + User UUID    | `rl:refresh:{user_id}`         | Prevents token generation spamming.                                |
| `/api/v1/assessment/submit-l1`      | 10 req/min           | Candidate Session | `rl:l1_sub:{attempt_id}`       | Prevents automated submission script spamming during L1.           |
| `/api/v1/assessment/compile-l2`     | 10 req/min           | Candidate Session | `rl:l2_compile:{candidate_id}` | Protects Docker code execution sandbox from CPU/Memory exhaustion. |
| `/api/v1/assessment/evaluate-l3-l4` | 5 req/min            | Candidate Session | `rl:l3_eval:{candidate_id}`    | Throttles high-cost audio/video LLM evaluation requests.           |
| `/api/v1/eval/claude`               | 200 RPM / 10,000 TPM | Service Worker    | `rl:llm:claude_proxy`          | Controls Anthropic Claude API quota & prevents budget blowouts.    |
| `/api/v1/verify/{certificate_id}`   | 20 req/min           | Public IP         | `rl:verify:ip:{ip}`            | Protects public verification page against mass scraping.           |
| `/api/v1/placement/match`           | 30 req/min           | Institution ID    | `rl:match:inst:{inst_id}`      | Throttles heavy vector cosine matrix computations.                 |

---

### 4.5 Redis Caching Architecture, RAM Sizing & Invalidation Strategy

> **Machine Capacity & Memory Impact:**  
> Because Redis operates entirely in RAM, managing memory consumption is critical when scaling to 1 million candidates and 50,000 peak concurrent test takers. The table below details every cached data entity, key format, TTL, and RAM footprint estimate.

#### 4.5.1 Data Inventory Planned for RAM Caching

| Data Entity / Category          | Key Pattern & Storage Type                  | Purpose & Optimization                                                                | TTL (Time-To-Live) | Est. Key Payload | RAM Sizing @ 50k Concurrency                 |
| ------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------ | ---------------- | -------------------------------------------- |
| **Active Assessment Session**   | `session:assessment:{attempt_id}` (Hash)    | Candidate active test state, answer drafts, timer status, item progress.              | 2 Hours (120m)     | ~2.5 KB          | **~125 MB** (50,000 active test sessions)    |
| **Rate Limit Sliding Window**   | `rl:{role}:{identifier}` (ZSet / Lua)       | Rolling timestamp log for rate limit enforcement (Redis Lua script).                  | 60 Seconds         | ~200 Bytes       | **~20 MB** (100,000 rolling rate limit keys) |
| **Auth Token & User Session**   | `auth:token:{user_id}` (String)             | Decoded JWT claims, institution ID, assigned track, RBAC permissions.                 | 15 Minutes         | ~800 Bytes       | **~40 MB** (50,000 active user tokens)       |
| **L1 Active Item Bank Forms**   | `items:form:{track_id}:{level_id}` (String) | Pre-compiled active item sets per track form (eliminates DB joins during test start). | 24 Hours           | ~45 KB           | **~4.5 MB** (100 track/level active forms)   |
| **Cut Scores & Angoff Rubrics** | `cut_scores:track:{track_id}` (Hash)        | Panel cut scores ($\mu, \sigma$), BARS rubrics per competency.                        | 7 Days             | ~15 KB           | **~0.3 MB** (20 track/level matrices)        |
| **Public Certificate Payload**  | `verify:cert:{certificate_id}` (String)     | Cached JSON payload for public verification (`verify.smart.com/cert/<UUID>`).         | 1 Hour             | ~4 KB            | **~80 MB** (20,000 concurrent verifications) |
| **Company JD Vector Cache**     | `match:company:{jd_id}` (String)            | Parsed JD threshold vectors & embedding representation.                               | 30 Minutes         | ~12 KB           | **~12 MB** (1,000 active JDs)                |
| **BullMQ Async Worker Queues**  | `bull:queue:{queue_name}` (Stream)          | Redis job queue buffers for L2 code sandbox and L3 audio evaluation jobs.             | Managed by Queue   | Variable         | **~50 MB** (Buffered background jobs)        |

> **Total Memory Footprint Estimate:** **~331.8 MB RAM** under peak 50,000 concurrent candidates.  
> **Provisioned Infrastructure:** Dual-node High-Availability Redis Cluster with **2 GB RAM**, leaving >80% headroom for unexpected traffic spikes.

#### 4.5.2 Multi-Tier Cache Invalidation Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EVENT-DRIVEN CACHE INVALIDATION                        │
│                                                                             │
│  [Candidate Submits Test] ──▶ Kafka Event: smart.assessment.submitted       │
│                                           │                                 │
│                                           ▼                                 │
│                                 DEL session:assessment:{id}                 │
│                                 DEL student:results:{student_id}            │
│                                                                             │
│  [Admin Updates Cut Score]──▶ Kafka Event: smart.track.updated              │
│                                           │                                 │
│                                           ▼                                 │
│                                 DEL cut_scores:track:{track_id}             │
└─────────────────────────────────────────────────────────────────────────────┘
```

1. **Passive Time-To-Live (TTL) Eviction**:
   - Every key stored in Redis MUST carry an explicit TTL. Keys without expiration are explicitly forbidden to prevent memory leaks.
2. **Event-Driven Proactive Invalidation (Kafka → Redis Handler)**:
   - **On Assessment Submission (`smart.assessment.submitted`)**: Instantly invalidates candidate active session `DEL session:assessment:{attempt_id}` and clears stale dashboard cache.
   - **On Certificate Issuance (`smart.certificate.issued`)**: Purges stale candidate scorecards and updates `verify:cert:{certificate_id}` with new tier trail.
   - **On Cut Score / Rubric Calibration Update (`smart.track.updated`)**: Triggers pattern invalidation `DEL cut_scores:track:{track_id}` across all API workers.
   - **On Student Retest Approval (`smart.student.retested`)**: Flushes student scorecard cache `DEL student:results:{student_id}`.
3. **Cache-Aside (Lazy Loading) Read Pattern**:
   - API checks Redis first ──▶ If hit (95%+ target ratio), return RAM payload.
   - If miss ──▶ Fetch from Supabase PostgreSQL ──▶ Populate Redis with standard TTL ──▶ Return payload.
4. **Write-Through Batch Persistence**:
   - Active answer drafts in L1 are written to Redis `session:assessment:{attempt_id}` immediately, then flushed asynchronously to Supabase PostgreSQL in 5-second batch intervals via BullMQ.

#### 4.5.3 Redis Memory Eviction & Safety Controls

- **Redis Maxmemory Policy:** Set strictly to `volatile-lru` (Least Recently Used among keys with an explicit expire set).
- **Eviction Protection Guarantee:** Because all ephemeral assessment sessions and rate limit keys possess explicit TTLs, `volatile-lru` ensures that un-expiring configuration keys are never evicted during memory pressure.
- **Automated Memory Health Alerts:**
  - **70% Capacity Warning (1.4 GB / 2.0 GB)**: Triggers Slack/PagerDuty warning alert.
  - **85% Capacity Critical (1.7 GB / 2.0 GB)**: Activates automatic emergency purging of expired volatile keys (`MEMORY PURGE`) and temporary reduction of verification cache TTL from 1 hour to 15 minutes.

---

## 5. Core Data Model (PostgreSQL Relational Schema)

```sql
-- 1. Track Table
CREATE TABLE tracks (
    track_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'TECH_FULLSTACK', 'MBA_FINANCE'
    name VARCHAR(100) NOT NULL,
    category VARCHAR(20) CHECK (category IN ('TECH', 'MBA')),
    foundation_weight NUMERIC(4,2) DEFAULT 0.25,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Competency Table
CREATE TABLE competencies (
    competency_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    track_id UUID REFERENCES tracks(track_id) ON DELETE CASCADE,
    domain_code VARCHAR(10) NOT NULL, -- 'A', 'B', 'C', 'D', 'E'
    sub_domain VARCHAR(100) NOT NULL,
    name VARCHAR(150) NOT NULL,
    real_world_weight NUMERIC(4,2) NOT NULL, -- e.g. 0.20
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Level Table
CREATE TABLE levels (
    level_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    track_id UUID REFERENCES tracks(track_id) ON DELETE CASCADE,
    level_number INT CHECK (level_number BETWEEN 1 AND 5),
    format_type VARCHAR(50) NOT NULL, -- 'MCQ', 'SANDBOX', 'AUDIO_BARS', 'DEFENSE', 'CAPSTONE'
    UNIQUE(track_id, level_number)
);

-- 4. Item Bank Table
CREATE TABLE items (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level_id UUID REFERENCES levels(level_id) ON DELETE CASCADE,
    competency_id UUID REFERENCES competencies(competency_id),
    item_type VARCHAR(50) NOT NULL,
    prompt_text TEXT NOT NULL,
    model_answer_json JSONB,
    difficulty_tag VARCHAR(20) CHECK (difficulty_tag IN ('EASY', 'MEDIUM', 'HARD', 'EXPERT')),
    active_flag BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Calibration Panel & Cut Scores
CREATE TABLE calibration_panels (
    panel_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    track_id UUID REFERENCES tracks(track_id),
    level_id UUID REFERENCES levels(level_id),
    panelist_name VARCHAR(100) NOT NULL,
    role_title VARCHAR(100) NOT NULL,
    employer_name VARCHAR(100) NOT NULL
);

CREATE TABLE cut_scores (
    cut_score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level_id UUID REFERENCES levels(level_id) ON DELETE CASCADE,
    tier VARCHAR(20) CHECK (tier IN ('GOLD', 'SILVER', 'BRONZE')),
    mean_cut_value NUMERIC(5,2) NOT NULL,
    sd_cut_value NUMERIC(5,2) NOT NULL, -- Confidence Band SD
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Student & Assessment Execution Tables
CREATE TABLE students (
    student_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    assigned_track_id UUID REFERENCES tracks(track_id),
    secondary_track_id UUID REFERENCES tracks(track_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE attempts (
    attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(student_id) ON DELETE CASCADE,
    level_id UUID REFERENCES levels(level_id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    integrity_flag VARCHAR(50) DEFAULT 'CLEAN' -- 'CLEAN', 'FLAGGED_TIMING', 'FLAGGED_PROCTOR'
);

CREATE TABLE responses (
    response_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES attempts(attempt_id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(item_id),
    raw_answer_text TEXT,
    code_execution_result_json JSONB,
    score NUMERIC(5,2),
    evaluated_by VARCHAR(50), -- 'AUTO_MCQ', 'SANDBOX_CHECK', 'CLAUDE_BARS'
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE level_results (
    result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES attempts(attempt_id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(student_id),
    level_id UUID REFERENCES levels(level_id),
    raw_score NUMERIC(5,2) NOT NULL,
    tier_awarded VARCHAR(20) CHECK (tier_awarded IN ('GOLD', 'SILVER', 'BRONZE', 'BELOW_BRONZE')),
    confidence_band_str VARCHAR(100),
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Certificate & Placement Tables
CREATE TABLE certificates (
    certificate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(student_id) ON DELETE CASCADE,
    track_id UUID REFERENCES tracks(track_id),
    highest_level_cleared INT NOT NULL,
    headline_tier VARCHAR(20) NOT NULL,
    tier_trail_json JSONB NOT NULL, -- e.g. {"L1": "GOLD", "L2": "SILVER", "L3": "GOLD"}
    verification_url VARCHAR(255) UNIQUE NOT NULL,
    issued_date DATE DEFAULT CURRENT_DATE
);

CREATE TABLE placement_records (
    record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(student_id),
    track_id UUID REFERENCES tracks(track_id),
    tier_at_placement VARCHAR(20),
    placement_cycle VARCHAR(50), -- e.g. '2026-SPRING'
    interview_offered BOOLEAN DEFAULT FALSE,
    job_offered BOOLEAN DEFAULT FALSE,
    offered_package_lpa NUMERIC(4,2),
    company_name VARCHAR(100)
);

-- 8. Audit & System Rate Limit Logs
CREATE TABLE rate_limit_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier VARCHAR(100) NOT NULL, -- IP or User UUID
    endpoint VARCHAR(150) NOT NULL,
    violations_count INT DEFAULT 1,
    blocked_until TIMESTAMP WITH TIME ZONE,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE claude_evaluation_audits (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID REFERENCES responses(response_id),
    prompt_tokens INT NOT NULL,
    completion_tokens INT NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    cohens_kappa_score NUMERIC(4,2),
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 6. The Level × Tier Scoring Engine

SMART evaluates candidates on a **2-Axis Grid**:

```
                       TIER (Performance Quality)
                     Gold   │   Silver   │   Bronze
                 ┌──────────┼────────────┼───────────┐
       L5 Project│  L5 Gold │  L5 Silver │ L5 Bronze │
                 ├──────────┼────────────┼───────────┤
       L4 Defense│  L4 Gold │  L4 Silver │ L4 Bronze │
 LEVEL           ├──────────┼────────────┼───────────┤
(Cognitive Depth)L3 Spoken │  L3 Gold │  L3 Silver │ L3 Bronze │
                 ├──────────┼────────────┼───────────┤
       L2 Applied│  L2 Gold │  L2 Silver │ L2 Bronze │
                 ├──────────┼────────────┼───────────┤
     L1 Knowledge│  L1 Gold │  L1 Silver │ L1 Bronze │
                 └──────────┴────────────┴───────────┘
```

### 6.1 The 5 Levels Definition

- **L1 (Foundation Knowledge)**: Weighted Item Response scoring. Measures recall and foundational understanding via MCQs and numeric entry items.
- **L2 (Applied / Programming)**: Sandboxed code execution, SQL query evaluation, or structured applied scenario analysis.
- **L3 (Communication & Domain Knowledge)**: Spoken structured response evaluated by **Claude 5 Sonnet** using a Behaviorally Anchored Rating Scale (BARS).
- **L4 (Verification Defense)**: Live or Claude-simulated 1:1 defense questioning to verify candidate ownership and depth of understanding.
- **L5 (Capstone Project)**: End-to-end deliverable upload evaluated via split scoring (50% objective checklist + 30% practitioner judgment rubric + 20% presentation).

### 6.2 Cut Score Calibration Mechanics (Angoff Method)

Cut scores are established by a 3–5 practitioner panel per track:
$$\text{Cut}_{\text{Gold}} = \mu_{\text{panel}} \pm \sigma_{\text{panel}}$$

- $\mu_{\text{panel}}$ = Mean percentage score predicted by panelists for a borderline ready-now candidate.
- $\sigma_{\text{panel}}$ = Standard Deviation, displayed on certificates as the **Confidence Band**.

### 6.3 Level 2/3 BARS Scoring & Consensus Engine

Constructed responses are graded against a **Behaviorally Anchored Rating Scale (BARS)** using **mode-based consensus**:

1. Panel establishes explicit behavior anchors for Gold, Silver, and Bronze.
2. Claude 5 Sonnet evaluates student submissions against the mode-consensus rubric.
3. **Inter-rater reliability (Cohen's Kappa $\kappa$)** is tracked against human-graded calibration sets. Automated scoring requires $\kappa \ge 0.65$.

---

## 7. Claude AI Management Engine & RAG Pipeline

```
 Candidate Response (L3/L4) ──▶ Claude Proxy Engine ──▶ Embedding Query ──┐
                                       │                                  ▼
                                       │                         pgvector Store
                                       │                         (Rubrics & Context)
                                       ▼                                  │
                              Claude 5 Sonnet ◄───────────────────────────┘
                             (Structured JSON Output)
                                       │
                                       ▼
                             Consensus Score & BARS
                             Feedback Generated
```

### 7.1 LLM Token Bucket Management & Priority Queuing

To prevent hitting Anthropic API limits, all LLM traffic routes through the `ClaudeProxyService` with three priority queues:

1. **Priority 1 (Real-time Candidate Testing)**: L4 interactive defense sessions (Immediate execution, reserve 40% quota).
2. **Priority 2 (Asynchronous Assessment)**: L3 spoken response grading (Execution within 30 seconds).
3. **Priority 3 (Batch Processing)**: JD parsing and placement vector generation (Execution during off-peak hours).

### 7.2 Claude Evaluation Prompt Template

```json
{
  "system_prompt": "You are the SMART BARS Evaluation Engine. Evaluate the candidate's spoken transcript against the anchor rubrics for the given competency. Return JSON only.",
  "competency": "Domain E: Technical Communication & Trade-offs",
  "anchors": {
    "GOLD": "Explicitly articulates trade-offs, identifies failure modes, states assumptions clearly.",
    "SILVER": "Correctly identifies main solution but lacks depth on trade-offs or edge cases.",
    "BRONZE": "Basic understanding present but fails to justify decisions."
  },
  "transcript": "{{candidate_audio_transcript}}",
  "output_format": {
    "assigned_tier": "GOLD|SILVER|BRONZE|BELOW_BRONZE",
    "bars_score": 85.5,
    "confidence_score": 0.92,
    "justification": "Candidate clearly explained why Redis caching was selected over Memcached..."
  }
}
```

---

## 8. Domain Taxonomy 1 — IT Role Tracks (5 Roles)

### 8.1 Full Stack Developer

- **Domain A: Frontend Engineering** (L1 MCQ → L2 Sandbox: React, Next.js, State Management, Responsive CSS)
- **Domain B: Backend Engineering** (L1 MCQ → L2 Sandbox: REST APIs, Async Node/NestJS, Middleware, Auth)
- **Domain C: Data & Persistence** (L1 MCQ → L2 Sandbox: PostgreSQL SQL Queries, Indexing, MongoDB CRUD)
- **Domain D: Engineering Practice** (L2 Scenario → L4 Defense: Git workflows, PR reviews, System Design fundamentals)
- **Domain E: Technical Communication** (L3 Spoken BARS → L4 Defense: Justifying tech choices, debugging aloud)
- **L5 Capstone**: Full Stack Web App Feature Deliverable + Live Demo Video.

### 8.2 AI / ML Engineer

- **Domain A: Programming & Data** (L1 MCQ → L2 Sandbox: Core Python, Pandas dataframe manipulation)
- **Domain B: ML Foundations** (L1 MCQ → L2 Sandbox: Supervised learning, evaluation metrics F1/Recall, overfitting)
- **Domain C: Applied GenAI & LLMs** (L2 Sandbox → L3 Spoken: Prompt engineering patterns, RAG pipelines, Vector DBs, Model limits)
- **Domain D: MLOps & Deployment** (L1 MCQ → L2 Applied: Model serving API basics, drift monitoring)
- **Domain E: Applied Judgment & Responsible AI** (L3 Spoken BARS → L4 Defense: Communicating uncertainty, failure modes, bias)
- **L5 Capstone**: End-to-End ML/GenAI Pipeline Build & Evaluation Notebook.

### 8.3 Cloud / DevOps Engineer

- **Domain A: Systems Foundations** (L1 MCQ → L2 Sandbox: Linux bash scripting, permissions, TCP/IP networking)
- **Domain B: Cloud Platform Fundamentals** (L1 MCQ → L2 Sandbox: AWS/GCP compute, S3 storage, IAM access control)
- **Domain C: Containerization & Orchestration** (L1 MCQ → L2 Sandbox: Dockerfile authoring, K8s Pods/Deployments)
- **Domain D: CI/CD & Automation** (L2 Sandbox: GitHub Actions pipelines, Terraform IaC manifests)
- **Domain E: Reliability & Incident Response** (L3 Spoken BARS → L4 Defense: Root-cause analysis, log triage, incident comms)
- **L5 Capstone**: Containerized App Deployment with Automated CI/CD & Monitoring Pipeline.

### 8.4 Cybersecurity Analyst

- **Domain A: Networking & Systems** (L1 MCQ: Network protocols, OS hardening, firewall rules)
- **Domain B: Threat Landscape** (L1 MCQ: Phishing, OWASP Top 10, CVE severity classification)
- **Domain C: Detection & Analysis** (L1 MCQ → L2 Sandbox: Log correlation, SIEM query basics)
- **Domain D: Incident Response** (L2 Sandbox → L3/L4 Defense: Severity triage, incident documentation, containment logic)
- **Domain E: Specialization Awareness** (L1 MCQ: Cloud security basics, offensive vs defensive security)
- **L5 Capstone**: Incident Triage & Defense Documentation Package.

### 8.5 Data Analyst

- **Domain A: Data Querying & Manipulation** (L1 MCQ → L2 Sandbox: Complex SQL joins/window functions, Python pandas)
- **Domain B: Statistics & Interpretation** (L1 MCQ → L3 Spoken: Descriptive stats, correlation vs causation, hypothesis intuition)
- **Domain C: Visualization & BI Tooling** (L2 Sandbox: Dashboard design in PowerBI/Tableau, chart selection)
- **Domain D: Business Translation** (L3 Spoken BARS → L4 Defense: Metric reasoning, converting findings to action decks)
- **Domain E: AI-Assisted Analysis** (L2 Sandbox: AI copilot querying, output verification)
- **L5 Capstone**: End-to-End Dataset Analysis & Recommendation Deck.

---

## 9. Domain Taxonomy 2 — MBA Role Tracks (5 Roles)

### 9.1 Shared Foundation Layer (25–30% of MBA Score)

Taken once by all MBA students: Business Communication, Quantitative Data Interpretation, Case Judgment, Stakeholder Ethics.

### 9.2 Specialization Tracks

1. **Finance (Lead Track)**: Financial statement analysis, Valuation (DCF, Comps), Applied 3-statement financial modeling, Working capital & risk reasoning.
2. **Business Analytics (Lead Track)**: SQL data querying, Statistical business interpretation, Data-to-insight communication, Dataset recommendation case.
3. **Marketing**: Market sizing & segmentation, Campaign positioning case judgment, Marketing metrics (CAC, LTV, ROMI), Consumer behavior reasoning.
4. **Operations**: Supply chain problem solving, Quantitative ops (EOQ, Safety stock), Quality improvement (DMAIC/Six Sigma), Vendor negotiation judgment.
5. **Human Resources**: Recruitment scenario judgment, Employee relations case analysis, HR metrics (attrition/engagement), HR policy & compliance judgment.

---

## 10. Placement Overlay & Vector Matching Engine

```
 Candidate Profile Vector ──────┐
 [L1: Gold, L2: Silver, ...]    │
                                ▼
                       Cosine Similarity Match ──▶ Filtered TPO Shortlist
                                ▲
 Company Requirement Vector ────┘
 [Need: L2 Finance >= Silver]
```

### 10.1 JD NLP Ingestion Pipeline

- Employers or TPOs upload unstructured Job Descriptions (PDF/Text).
- **Claude 5 Sonnet** parses JDs into structured SMART threshold vectors:
  ```json
  {
    "company_name": "Goldman Sachs",
    "role": "Financial Analyst",
    "required_track": "MBA_FINANCE",
    "min_thresholds": {
      "L1_FOUNDATION": "SILVER",
      "L2_MODELING": "GOLD",
      "L3_COMMUNICATION": "SILVER"
    }
  }
  ```

### 10.2 Matching Engine & Placement Feedback Loop

- Candidates are scored using vector similarity:
  $$\text{MatchScore} = \cos(\vec{V}_{\text{candidate}}, \vec{V}_{\text{company}}) \times \prod \text{RuleFilters}$$
- Auto-shortlists are generated for Placement Directors.
- Real placement outcome data (interviews, offers) is written back to `placement_records` to validate the predictive validity of Gold tiers.

---

## 11. Public Verification & Trust Chain Pipeline

- **Public Certificate URL:** `verify.smart.com/cert/<UUID>`
- **Public Verification Display Components:**
  1. **Candidate Identity & Issued Date**
  2. **Specialization Track Certified**
  3. **Tier Trail Matrix**: Displays progress across all levels (e.g., L1: Gold | L2: Silver | L3: Gold).
  4. **Confidence Note**: Displays sample size, Angoff standard error, and calibration cycle status.
  5. **Calibration Panel Credits**: Lists regional employers who validated the track cut scores.
  6. **Dynamic QR Code**: Cryptographically signed SHA-256 hash verifying document authenticity.

---

## 12. Stakeholder Feature Specifications

| Feature                 | Super Admin           | Institution Admin (TPO) | Student               | Employer          |
| ----------------------- | --------------------- | ----------------------- | --------------------- | ----------------- |
| **Global Analytics**    | Full System Dashboard | Cohort Readiness View   | Individual Scorecard  | Verification View |
| **Rate Limit Control**  | Adjust System Limits  | View Usage Throttles    | N/A                   | N/A               |
| **Shortlist Generator** | N/A                   | Auto-Generate & Export  | View Shortlist Status | Upload JD & Match |
| **Gap Diagnostics**     | Global Track Gaps     | Batch Weakness Report   | Itemized Gap Feedback | N/A               |
| **Retest Pathway**      | Retest Policy Config  | Approve Retests         | Schedule Retest       | N/A               |

---

## 13. Integrity & Anti-Cheating Architecture

1. **L1 Item Rotation**: Dynamic item selection from parallel forms; exposed items retired via response-time anomaly detection.
2. **L2 Code Sandbox Isolation**: Code executed in ephemeral, non-networked Docker containers with CPU/memory caps (256MB RAM, 1 CPU core, 5s timeout).
3. **L3 Spoken Response Integrity**: Audio fingerprinting and voice activity detection to prevent pre-recorded playback.
4. **L5 Dataset Anonymization**: Scenarios use dynamically generated company names and numbers per cohort to prevent solution sharing.

---

## 14. Business Model & Institutional Growth Mechanics

- **Monetization**: Annual per-cohort licensing fee paid by higher education institutions / placement offices.
- **Student Add-On**: Voluntary nominal fee for deep diagnostic report & skill growth tools.
- **Standing Asset Mechanism**:
  - Published placement correlation reports updated every cycle.
  - Diagnostic gap reports change with every batch, informing curriculum updates.
  - Institutional cohort benchmarking creates multi-year retention lock-in.

---

## 15. Detailed 5-Sprint Execution Plan

> **CRITICAL EXECUTION DIRECTIVE:**  
> The project is structured into **exactly 5 Sprints**.  
> **Sprints 1 through 4** deliver 100% of product features.  
> **Sprint 5 is EXCLUSIVELY DEDICATED TO TESTING, SECURITY AUDITING, LOAD TESTING, AND HARDENING.** No new feature engineering is permitted in Sprint 5.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         5-SPRINT DELIVERY TIMELINE                          │
│                                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐  │
│  │   SPRINT 1   │   │   SPRINT 2   │   │   SPRINT 3   │   │   SPRINT 4   │  │
│  │ System Found.│──▶│ Assessment   │──▶│ Placement    │──▶│ Cert & Edge  │  │
│  │ & Rate Limit │   │ Delivery & AI│   │ Matching Engine│  │ Verification │  │
│  └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘  │
│                                                                  │          │
│                                                                  ▼          │
│                                                        ┌──────────────────┐ │
│                                                        │     SPRINT 5     │ │
│                                                        │   100% EXCLUSIVE │ │
│                                                        │   TESTING & QA   │ │
│                                                        └──────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Sprint 1 — System Foundation, Database & Rate Limiting (Dev Sprint 1)

**Sprint Goal:** Stand up core repository infrastructure, Supabase PostgreSQL schema, Clerk/NestJS authentication, Redis sliding-window rate limiting middleware, and the decoupled Claude Proxy Engine scaffold.

| Ticket ID  | Story Title                                        | Description & Acceptance Criteria                                                                                                  | Owner        | Points | Priority |
| ---------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------ | -------- |
| **US-1.1** | Repository Scaffold & Multi-Container Docker Stack | Provision Docker Compose with NestJS 10, Next.js 14, Supabase (PostgreSQL 16 + pgvector), Redis 7, and Apache Kafka.               | Tino         | 5 pts  | Critical |
| **US-1.2** | PostgreSQL Schema Provisioning                     | Execute DDL migrations for core schema (`tracks`, `competencies`, `levels`, `students`, `attempts`, `responses`, `certificates`).  | Tino         | 8 pts  | Critical |
| **US-1.3** | Auth & RBAC Middleware                             | Implement JWT authentication with role-based authorization for Super Admin, TPO, Student, and Public.                              | Satheeswaran | 8 pts  | Critical |
| **US-1.4** | Redis Sliding Window Rate Limiting Engine          | Build NestJS rate limiting guards with Redis Lua scripts supporting role-based and IP-based limits.                                | Tino         | 8 pts  | Critical |
| **US-1.5** | Granular Endpoint Rate Throttling Matrix           | Implement specific throttles for auth, code execution, audio submit, and verification endpoints.                                   | Tino         | 5 pts  | High     |
| **US-1.6** | Claude AI Proxy Service Setup                      | Build decoupled Anthropic API client (`ClaudeProxyService`) with token bucket rate limiting (200 RPM / 10k TPM) + Gemini Fallback. | Ramansh      | 8 pts  | Critical |
| **US-1.7** | pgvector Vector Store Provisioning                 | Initialize Supabase `pgvector` extension and schema for storing domain competency rubrics and embeddings.                          | Ramansh      | 5 pts  | High     |
| **US-1.8** | Student Profile & Track Enrollment API             | Build REST endpoints for student onboarding and specialization track assignment.                                                   | Satheeswaran | 5 pts  | High     |
| **US-1.9** | System Data Contracts & Zod Schemas                | Document and commit shared data contracts (Zod schemas / TypeScript DTOs) between frontend Next.js and backend NestJS services.    | Tino         | 5 pts  | High     |

**Sprint 1 Summary:** 9 Stories · 57 Story Points · Deliverable: Core infrastructure, Auth, Database, Rate Limiter, and Claude Proxy operational locally.

---

### Sprint 2 — Assessment Delivery & Claude Evaluation Engine (Dev Sprint 2)

**Sprint Goal:** Deliver full assessment delivery pipelines (L1–L5), Dockerized code execution sandbox, Claude 5 Sonnet BARS audio grading, and seed item banks for all 10 role tracks.

| Ticket ID  | Story Title                                         | Description & Acceptance Criteria                                                                                    | Owner        | Points | Priority |
| ---------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------ | ------ | -------- |
| **US-2.1** | L1 Assessment Delivery Service                      | Build real-time weighted MCQ assessment engine with timer enforcement and anti-cheat event logging.                  | Ramansh      | 8 pts  | Critical |
| **US-2.2** | L2 Code & SQL Sandbox Execution Engine              | Build isolated Docker container runner for evaluating candidate Python/Node code and SQL queries.                    | Tino         | 8 pts  | Critical |
| **US-2.3** | L3 Audio Spoken Response Recorder & Audio Ingestion | Frontend media recorder + NestJS endpoint for uploading candidate audio defenses to Cloudflare R2.                   | Satheeswaran | 5 pts  | High     |
| **US-2.4** | Claude 5 Sonnet BARS Evaluation Pipeline            | Build async BullMQ pipeline to transcribe audio and grade against mode-consensus BARS rubrics using Claude.          | Ramansh      | 8 pts  | Critical |
| **US-2.5** | L4 AI Interactive Defense Engine                    | Implement real-time interactive defense simulation service backed by Claude 5 Sonnet.                                | Ramansh      | 8 pts  | Critical |
| **US-2.6** | L5 Capstone Submission & Split Scoring              | Build capstone deliverable upload handler and objective checklist auto-checker.                                      | Satheeswaran | 5 pts  | High     |
| **US-2.7** | IT Track Item Bank Ingestion (5 Roles)              | Seed item banks, competency weights, and rubrics for 5 Tech tracks (Full Stack, AI/ML, DevOps, Cyber, Data Analyst). | Ramansh      | 8 pts  | Critical |
| **US-2.8** | MBA Track Item Bank Ingestion (5 Roles)             | Seed item banks and rubrics for 5 MBA tracks (Finance, Business Analytics, Marketing, Ops, HR).                      | Satheeswaran | 8 pts  | Critical |

**Sprint 2 Summary:** 8 Stories · 58 Story Points · Deliverable: Complete multi-method L1–L5 evaluation engine working with Claude AI.

---

### Sprint 3 — Placement Overlay, Vector Matching & Dashboards (Dev Sprint 3)

**Sprint Goal:** Build the JD NLP parser, candidate-company vector matching algorithm, auto-shortlist generator, Super Admin control center, TPO dashboard, and Student growth portal.

| Ticket ID  | Story Title                              | Description & Acceptance Criteria                                                                             | Owner        | Points | Priority |
| ---------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------ | ------ | -------- |
| **US-3.1** | Job Description NLP Ingestion Service    | Build PDF/Text JD upload handler utilizing Claude 5 Sonnet to parse required competency vectors.              | Ramansh      | 8 pts  | Critical |
| **US-3.2** | Candidate-Company Vector Matching Engine | Implement vector cosine similarity and rule-based filter algorithm in NestJS to match candidates to JDs.      | Ramansh      | 8 pts  | Critical |
| **US-3.3** | TPO Cohort Readiness Dashboard           | Build Next.js dashboard for Placement Directors showing batch readiness, Gold/Silver counts, and gap reports. | Satheeswaran | 8 pts  | Critical |
| **US-3.4** | Auto-Shortlist Generator & Export        | Implement filterable candidate shortlist view with CSV/PDF export for recruiting drives.                      | Satheeswaran | 5 pts  | High     |
| **US-3.5** | Student Diagnostic Portal & Gap Feedback | Build student UI displaying test results, itemized competency feedback, and retest scheduler.                 | Satheeswaran | 8 pts  | Critical |
| **US-3.6** | Super Admin Management Console           | Build platform control center for user management, rate limit overrides, and system health monitoring.        | Tino         | 8 pts  | High     |
| **US-3.7** | Correlation Record Tracking Module       | Build backend feedback mechanism to log interview/offer outcomes per placement cycle.                         | Tino         | 5 pts  | Medium   |

**Sprint 3 Summary:** 7 Stories · 50 Story Points · Deliverable: Working Placement Overlay Engine and functional multi-role dashboards.

---

### Sprint 4 — Certificate Pipeline, Verification & Edge Hardening (Dev Sprint 4)

**Sprint Goal:** Build public verification pipeline, QR code generation, Angoff cut-score confidence note calculator, edge gateway rate-limit tuning, and perform complete microservices integration.

| Ticket ID  | Story Title                                     | Description & Acceptance Criteria                                                                              | Owner        | Points | Priority |
| ---------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------ | ------ | -------- |
| **US-4.1** | Public Certificate Generation Pipeline          | Build service to generate shareable certificate records with Tier Trail JSON and unique UUIDs.                 | Satheeswaran | 8 pts  | Critical |
| **US-4.2** | Public Verification Portal (`verify.smart.com`) | Build public responsive page displaying certified tier, methodology, calibration credits, and confidence note. | Satheeswaran | 8 pts  | Critical |
| **US-4.3** | Dynamic QR Code & PDF Exporter                  | Implement cryptographically signed QR code generator and PDF certificate exporter.                             | Satheeswaran | 5 pts  | High     |
| **US-4.4** | Confidence Note & SD Calculator Engine          | Implement automated calculation of Angoff standard deviation confidence bands and Cronbach's alpha.            | Ramansh      | 5 pts  | High     |
| **US-4.5** | Kong / Edge Gateway Integration & Tuning        | Configure Edge API Gateway rate limits, Cloudflare DDoS rules, and SSL termination.                            | Tino         | 8 pts  | Critical |
| **US-4.6** | End-to-End Service Integration                  | Interconnect all microservices, message queues, and caching layers into a unified release candidate build.     | Tino         | 8 pts  | Critical |

**Sprint 4 Summary:** 6 Stories · 42 Story Points · Deliverable: 100% Feature Complete SMART Platform ready for Sprint 5 Testing.

---

### Sprint 5 — EXCLUSIVELY TESTING, QA, SECURITY AUDIT & HARDENING

> **SPRINT MANDATE:**  
> **100% EXCLUSIVE TO TESTING, QUALITY ASSURANCE, LOAD STRESSING, AND SECURITY AUDITING.**  
> Zero new feature code will be merged during Sprint 5. All engineering capacity is focused on resolving bugs, optimizing performance, and achieving production readiness.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SPRINT 5 TESTING SUITE                             │
│                                                                             │
│  ┌──────────────────────┐    ┌──────────────────────┐    ┌───────────────┐  │
│  │ Automated Testing    │    │ Security Audit &     │    │ 1M Load & Rate│  │
│  │ • PyTest Unit/Int    │    │ Penetration          │    │ Limit Stress  │  │
│  │ • Jest & Playwright  │    │ • OWASP Top 10       │    │ • Locust      │  │
│  │   E2E Web Tests      │    │ • Auth JWT Sanity    │    │ • K6 Scaling  │  │
│  └──────────┬───────────┘    └──────────┬───────────┘    └───────┬───────┘  │
│             │                           │                        │          │
│             └───────────────────┬───────┴────────────────────────┘          │
│                                 ▼                                           │
│                     ┌───────────────────────┐                               │
│                     │ Institutional UAT     │                               │
│                     │ • Pilot Batch Run     │                               │
│                     │ • Panel Validation    │                               │
│                     │ • Bug Hardening       │                               │
│                     └───────────────────────┘                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Ticket ID  | Testing Focus Area                               | Test Execution Details & Success Criteria                                                                           | Owner        | Points | Priority |
| ---------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------ | ------ | -------- |
| **TS-5.1** | Automated Unit & Integration Testing             | Execute comprehensive backend PyTest and frontend Jest test suites. Target: **>85% Code Coverage**.                 | Tino         | 8 pts  | Critical |
| **TS-5.2** | End-to-End User Flow Automation                  | Build Playwright test scripts covering complete flow: Auth → Assessment L1–L5 → Certification → Verification.       | Satheeswaran | 8 pts  | Critical |
| **TS-5.3** | Security Penetration & Vulnerability Audit       | Conduct OWASP Top 10 vulnerability scan, SQL injection, XSS, and JWT manipulation audit.                            | Satheeswaran | 8 pts  | Critical |
| **TS-5.4** | 1M Scale Load & Stress Testing                   | Run K6 / Locust load simulation testing 50,000 concurrent candidate test sessions. Verify p95 response time <200ms. | Tino         | 8 pts  | Critical |
| **TS-5.5** | Rate Limit System Stress Testing                 | Stress test Redis sliding window rate limiter under 100,000 req/min floods. Verify HTTP 429 compliance.             | Tino         | 8 pts  | Critical |
| **TS-5.6** | Claude AI Proxy Load & Error Fallback Test       | Simulate Anthropic API rate limits (HTTP 429) and network failures. Verify retry backoff and queue fallback.        | Ramansh      | 8 pts  | Critical |
| **TS-5.7** | Pilot Institution UAT & Calibration Verification | Conduct User Acceptance Testing with 1 pilot institution cohort (50 students). Validate Angoff cut scores.          | Ramansh      | 8 pts  | Critical |
| **TS-5.8** | Production Bug Fixing & Performance Hardening    | Resolve all Priority 1 & 2 bugs identified during testing. Optimize slow database queries and indexes.              | All Team     | 8 pts  | Critical |

**Sprint 5 Summary:** 8 Quality Assurance Tasks · 64 Test Points · Deliverable: Fully audited, load-tested, hardened production-ready platform.

---

## 16. Observability, Logging & Rate Limit Monitoring

### 16.1 Metrics Stack

- **Prometheus**: Collects API latency, container CPU/Memory, rate limit violation counts, and Redis connection metrics.
- **Grafana**: Dashboards displaying real-time system health, HTTP status codes (2xx, 4xx, 429, 5xx), and Claude API token consumption.
- **Datadog / Sentry**: Distributed tracing across microservices and frontend exception capturing.

### 16.2 Rate Limit Metrics Alerts

```yaml
groups:
  - name: smart_rate_limiting_alerts
    rules:
      - alert: HighRateLimitViolations
        expr: rate(smart_rate_limit_violations_total[5m]) > 50
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: 'High rate limit violations detected on {{ $labels.endpoint }}'
      - alert: ClaudeAPITokenBucketExhausted
        expr: smart_claude_token_bucket_remaining < 1000
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'Claude Proxy Service token bucket near exhaustion!'
```

---

## 17. V1 Scope vs. Phase 2 Scope

| Capability        | In V1 (Scope Committed)                        | Phase 2 (Deferred)                      |
| ----------------- | ---------------------------------------------- | --------------------------------------- |
| **Role Tracks**   | 5 IT Tracks + 5 MBA Tracks                     | SDE-2, Core Engineering, Legal Tracks   |
| **AI Management** | Native Claude 5 Sonnet / 4.7 Engine            | External Orion Integration (when ready) |
| **Rate Limiting** | Full Redis Sliding Window + Gateway Throttling | AI Dynamic Adaptive Throttling          |
| **Evaluation**    | 5-Level Battery (L1 MCQ → L5 Capstone)         | Adaptive IRT 2-Parameter Testing        |
| **Verification**  | Public URL (`verify.smart.com`) + QR Code      | Blockchain Verification Proofs          |
| **Dashboards**    | Super Admin, TPO, Student, Verification        | Employer Paid Search Portal             |

---

## 18. Risk Management & Fallback Protocols

1. **Anthropic API Outage / Rate Limit Breach**:
   - _Protocol_: System automatically routes traffic to the **Google Gemini API (Gemini 2.5 Pro / Flash)** fallback engine with matching BARS prompt schemas, preventing submission delays while alerting the engineering team. Submissions remain queued in Redis/BullMQ without candidate data loss.
2. **Redis Cache Layer Failure**:
   - _Protocol_: API gateway falls back to in-memory local leaky bucket rate limiting while Redis cluster auto-recovers.
3. **High Candidate Concurrent Flood during Institutional Assessment**:
   - _Protocol_: Gateway activates queueing room mode (Cloudflare Waiting Room) to admit candidates in controlled batches matching service capacity.

---

_This document is the absolute single source of truth for the SMART technical architecture, rate limiting specification, Claude AI integration, domain mapping, and 5-sprint delivery roadmap._
