# SMART — Master Technical Framework & System Architecture

> **Version:** v2.0 — Final Master Technical Framework  
> **Last Updated:** 2026-08-20  
> **Maintainer:** Infinitica Engineering Team  
> **Purpose:** Master framework consolidating all 10 role blueprints (5 Tech + 5 MBA), Level × Tier scoring engine, explicit rate limiting matrix, decoupled Claude AI engine, placement overlay engine, public verification pipeline, and 5-sprint delivery roadmap.

---

## 1. Executive Summary & Core Philosophy

SMART is a **role-specific readiness certification platform**. It assesses students against real competency requirements for a specific job track — not a generic employability score — and issues a criterion-referenced **Gold / Silver / Bronze** certificate that is:
- Transparent about its own methodology.
- Honest about its calibration maturity.
- Student-controlled and publicly verifiable.
- Backed by correlation data from real hiring outcomes.

### 1.1 Positioning Statement
*For placement offices and students who are done trusting opaque, one-size-fits-all employability scores — SMART certifies exactly what a specific role requires, shows its work, and tracks whether it's actually predicting real hiring outcomes.*

### 1.2 The Three Core Values
1. **Precision over breadth**: One role track certified with deep rigor beats five shallow tests. Certificates are issued per specialization, never as a generic score.
2. **Transparency over authority**: Scoring methodology, item weights, and Angoff cutoffs are exposed. Anyone can inspect how a tier was determined.
3. **Honesty over inflation**: Every report carries a **Confidence Note** stating sample size, Cronbach's alpha, and calibration maturity. Nothing is labeled "standardized" without empirical proof.

---

## 2. Decoupled AI Architecture — Claude Management Engine & Gemini Fallback

> **Architectural Separation:** Orion is being built separately by a parallel team. SMART directly integrates with **Anthropic's Claude 5 Sonnet & Claude 4.7 API** as its primary intelligence layer, backed by automatic failover to **Google Gemini API (Gemini 2.5 Pro / Flash)** and native Supabase `pgvector`.

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

- **Claude 5 Sonnet (Primary)**: Operates L3 spoken BARS evaluation, L4 interactive defense simulation, L5 qualitative review, and unstructured JD parsing.
- **Claude 4.7 (Primary)**: Handles rapid item generation, pre-tokenization, intent classification, and keyword matching.
- **Google Gemini 2.5 Pro / Flash (Automatic Fallback Engine)**: High-availability failover target triggered automatically during Anthropic API rate limits or outages.
- **Supabase pgvector**: Stores vector embeddings of competency rubrics and model answers for fast RAG context insertion.

---

## 3. Rate Limiting System Architecture (Rate Limit Everything)

### 3.1 Rate Limiting Architecture Overview
SMART implements a **Sliding Window Counter** + **Token Bucket** algorithm using Redis Lua scripts enforced at both Edge Gateway (Kong/NGINX) and API Middleware layers.

All responses return standard rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`). Violations yield HTTP `429 Too Many Requests`.

### 3.2 Role-Based Rate Limits

| User Role | Endpoint Scope | Max Requests / Min | Burst Capacity | Window | Violation Action |
|---|---|---|---|---|---|
| **Super Admin** | Administrative (`/api/v1/admin/*`) | 500 req/min | 100 | 60s | 429 Error + Audit Log |
| **Institution Admin (TPO)** | Cohort/Placement (`/api/v1/tpo/*`) | 200 req/min | 50 | 60s | 429 Error + 2-min Throttle |
| **Placement Staff** | Shortlist Filtering (`/api/v1/tpo/shortlist`) | 150 req/min | 40 | 60s | 429 Error |
| **Student (General UI)** | Profile/Dashboard (`/api/v1/student/*`) | 60 req/min | 15 | 60s | 429 Error |
| **Student (Active Test)** | Answer Submit (`/api/v1/assessment/submit-l1`) | 10 req/min | 3 | 60s | 429 Error + Session Audit |
| **Unauthenticated / Public** | Verification (`/api/v1/verify/*`) | 20 req/min per IP | 5 | 60s | 429 Error + IP Challenge |

### 3.3 Endpoint-Specific Throttling Matrix

| Target Endpoint | Rate Limit | Scope | Redis Key Format | Technical Rationale |
|---|---|---|---|---|
| `/api/v1/auth/login` | 10 req/min | IP Address | `rl:auth:ip:{ip}` | Anti-bruteforce protection. |
| `/api/v1/auth/refresh` | 20 req/min | User UUID | `rl:refresh:{user_id}` | Prevents refresh spamming. |
| `/api/v1/assessment/submit-l1` | 10 req/min | Attempt UUID | `rl:l1_sub:{attempt_id}` | Blocks automated submission scripts. |
| `/api/v1/assessment/compile-l2` | 10 req/min | Student UUID | `rl:l2_compile:{candidate_id}` | Sandbox CPU/RAM protection. |
| `/api/v1/assessment/evaluate-l3-l4` | 5 req/min | Student UUID | `rl:l3_eval:{candidate_id}` | Controls high-cost LLM audio grading. |
| `/api/v1/eval/claude` | 200 RPM / 10k TPM | Service | `rl:llm:claude_proxy` | Anthropic API quota manager. |
| `/api/v1/verify/{certificate_id}` | 20 req/min | Public IP | `rl:verify:ip:{ip}` | Scraping protection for verification URL. |
| `/api/v1/placement/match` | 30 req/min | Inst UUID | `rl:match:inst:{inst_id}` | Vector matrix computation throttle. |

---

## 4. Database Schema (PostgreSQL DDL)

The core relational database schema encompasses:
- `tracks` & `competencies`
- `levels` & `items`
- `calibration_panels` & `cut_scores`
- `students`, `attempts`, & `responses`
- `level_results` & `certificates`
- `placement_records`
- `rate_limit_logs` & `claude_evaluation_audits`

Refer to [ARCHITECTURE.md](file:///mnt/Data/Work%27s/Grad360%20/smart/ARCHITECTURE.md#5-core-data-model-postgresql-relational-schema) for complete DDL specifications.

---

## 5. The Level × Tier Evaluation Engine

- **5 Levels**: L1 Knowledge (MCQ) → L2 Applied (Sandbox/SQL) → L3 Spoken (Claude BARS) → L4 Defense (Interactive AI) → L5 Capstone (Deliverable Split Scoring: 50% checklist, 30% rubric, 20% presentation).
- **3 Tiers**: Gold (Ready Now), Silver (Needs Supervised Onboarding), Bronze (Core Knowledge Present).
- **Angoff Cut Scores**: $\text{Cut}_{\text{Gold}} = \mu_{\text{panel}} \pm \sigma_{\text{panel}}$. The SD forms the confidence band displayed on certificates.

---

## 6. Complete Role Taxonomies (10 Role Tracks)

### 6.1 5 IT Role Tracks
1. **Full Stack Developer**: Frontend (React/CSS), Backend (Node/NestJS), Data (PostgreSQL/Mongo), Practice (Git/System Design), Comm (Trade-offs), Capstone.
2. **AI / ML Engineer**: Programming (Python/Pandas), ML Foundations (Supervised/Evaluation), GenAI (Prompting/RAG/Vector DBs), MLOps (Serving/Drift), Judgment (Bias/Uncertainty), Capstone.
3. **Cloud / DevOps Engineer**: Systems (Linux/TCP-IP), Cloud (AWS/GCP/IAM), Containers (Docker/K8s), CI/CD (Actions/Terraform), Reliability (Logs/Incidents), Capstone.
4. **Cybersecurity Analyst**: Networking (Firewalls/Hardening), Threat Landscape (OWASP/CVE), Detection (SIEM/Log correlation), Incident Response (Triage/Containment), Awareness, Capstone.
5. **Data Analyst**: Querying (SQL/Pandas), Statistics (Descriptive/Inferential), Visuals (PowerBI/Tableau), Translation (Metric reasoning), AI-Assisted, Capstone.

### 6.2 5 MBA Role Tracks
- **Shared Foundation (~25–30%)**: Business Communication, Quant/Data Interpretation, Case Judgment, Ethics.
- **Finance**: Statement analysis, Valuation (DCF/Comps), 3-Statement modeling, Working capital & risk.
- **Business Analytics**: SQL querying, Statistical interpretation, Data-to-insight comms, Recommendation deck case.
- **Marketing**: Market sizing/segmentation, Campaign positioning case, Marketing metrics (CAC/LTV), Consumer behavior.
- **Operations**: Supply chain problem solving, Quantitative ops (EOQ/Safety stock), Quality (DMAIC), Vendor negotiation.
- **Human Resources**: Recruitment scenario judgment, Employee relations case, HR metrics (attrition/engagement), Policy/compliance.

---

## 7. Placement Overlay & Public Verification

- **Candidate-Company Matching**: Vector cosine similarity between student level-tier profiles and parsed JD requirement vectors.
- **Public Verification**: `verify.smart.com/cert/<UUID>` showing Tier Trail, Confidence Note, Calibration Employers, and dynamic QR Code.

---

## 8. Detailed 5-Sprint Implementation Plan

> **RULE:** Sprints 1–4 deliver 100% of product feature code.  
> **SPRINT 5 IS 100% EXCLUSIVELY DEDICATED TO TESTING, QA, LOAD TESTING, AND SECURITY HARDENING.**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         5-SPRINT DELIVERY TIMELINE                          │
│                                                                             │
│  Sprint 1: System Foundation, DB Schema, Auth & Rate Limiter Middleware      │
│  Sprint 2: L1–L5 Delivery Engine, Sandboxed Execution & Claude BARS Service │
│  Sprint 3: Placement Overlay Engine, Vector Search & Stakeholder Dashboards │
│  Sprint 4: Certificate Pipeline, Public Verification & Edge Gateway Tuning  │
│  Sprint 5: EXCLUSIVELY TESTING (Unit/E2E, OWASP Audit, 1M Load Stress, UAT) │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Sprint 1 (Dev)**: Scaffold, PostgreSQL DDL, Clerk Auth, Redis Rate Limiter Middleware, Claude Proxy Scaffold.
- **Sprint 2 (Dev)**: L1-L5 Engines, Sandboxed Code Runner, Claude 5 Sonnet BARS Pipeline, Item Banks for 10 Roles.
- **Sprint 3 (Dev)**: JD Ingestion, Candidate Vector Matching, TPO Dashboard, Shortlist Generator, Student Growth Portal.
- **Sprint 4 (Dev)**: Certificate Generator, Public Verification Page, Dynamic QR Code, Edge Gateway SSL & Rate Tuning.
- **Sprint 5 (TESTING ONLY)**:
  - *TS-5.1*: Automated Unit & Integration Tests (PyTest >85% coverage).
  - *TS-5.2*: End-to-End Flow Tests (Playwright automated web suites).
  - *TS-5.3*: OWASP Security Penetration & Vulnerability Audit.
  - *TS-5.4*: 1M Scale Concurrent Load Stress Testing (K6/Locust simulating 50k users).
  - *TS-5.5*: Rate Limiter Stress Testing under 100k req/min floods.
  - *TS-5.6*: Claude API Proxy Fallback & Resiliency Testing.
  - *TS-5.7*: Pilot Institution UAT & Angoff Cut Score Validation.
  - *TS-5.8*: Production Bug Fixing & Database Index Optimization.

---

*For detailed code snippets, SQL DDL tables, and exact ticket breakdowns, see the master document: [ARCHITECTURE.md](file:///mnt/Data/Work%27s/Grad360%20/smart/ARCHITECTURE.md).*
