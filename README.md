# SMART — Role-Specific Readiness Certification Platform

> **Enterprise Platform Specification & Monorepo Infrastructure Architecture**  
> **Version:** v2.0 | **Scale Target:** 1M Active Candidates | **Stack:** Next.js 14, NestJS 10, Effect.ts, Supabase, Cloudflare R2, Claude 5 Sonnet / 4.7 + Gemini Fallback, Kafka, Redis

---

## 🎯 What SMART Is

SMART is a **role-specific readiness certification platform**. It assesses candidates against real competency requirements for a specific job track — not a generic aptitude score — and issues a criterion-referenced **Gold / Silver / Bronze** certificate that is:
- **Transparent** about its own methodology.
- **Honest** about its calibration maturity.
- **Student-controlled** and publicly verifiable.
- **Backed by correlation data** from real hiring outcomes.

> *SMART tells you who's actually ready for the job — and shows its work.*

---

## 🛠️ Enterprise Technology Stack (100% Open Source + Cloud Infrastructure)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SMART ENTERPRISE STACK                            │
│                                                                             │
│  ┌──────────────────────┐    ┌──────────────────────┐    ┌───────────────┐  │
│  │     Next.js 14       │    │     NestJS 10        │    │ Supabase DB / │  │
│  │ (App Router, React)  │    │  (Fastify Adapter)   │    │   pgvector    │  │
│  └──────────┬───────────┘    └──────────┬───────────┘    └───────┬───────┘  │
│             │                           │                        │          │
│             ▼                           ▼                        ▼          │
│  ┌──────────────────────┐    ┌──────────────────────┐    ┌───────────────┐  │
│  │  Claude 5 / 4.7 AI   │    │  Apache Kafka Event  │    │ Cloudflare R2 │  │
│  │  (+ Gemini Fallback) │    │  Streaming Broker    │    │ (Zero Egress) │  │
│  └──────────────────────┘    └──────────────────────┘    └───────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Layer | Technology Choice | License / Hosting | Architectural Role |
|---|---|---|---|
| **Frontend Applications** | **Next.js 14 (App Router)** | MIT | Student Portal, TPO Dashboard, Admin Console, Verification App (`verify.smart.com`). |
| **Primary Backend Core** | **NestJS 10 (Fastify Adapter)** | MIT | Enterprise REST API, microservices, auth, guards, Kafka/Redis handlers. |
| **Functional Math Module** | **Effect.ts (Effect 3.x)** | MIT | Pure-functional library (`packages/scoring-engine`) for IRT estimation & Angoff confidence bands. |
| **Database & Vector** | **Supabase (PostgreSQL 16 + `pgvector`)** | Apache 2.0 / Managed | Relational data (`students`, `attempts`, `certificates`) + placement vector cosine search. |
| **Object Storage** | **Cloudflare R2** | Cloudflare | Zero-egress S3-compatible storage for L3 audio defenses and PDF certificates. |
| **Primary AI Engine** | **Anthropic Claude 5 Sonnet & Claude 4.7** | Anthropic API | **Claude 5 Sonnet** (BARS grading, L3/L4 defense, JD parsing); **Claude 4.7** (rapid item extraction). |
| **Fallback AI Engine** | **Google Gemini API (Gemini 2.5 Pro / Flash)** | Google API | High-availability automatic fallback engine for Anthropic API rate limits or outages. |
| **Event Bus / Messaging** | **Apache Kafka (Strimzi / Redpanda)** | Apache 2.0 | Asynchronous event streaming (`smart.assessment.submitted`, `smart.eval.completed`). |
| **In-Memory Cache & Limits**| **Redis 7 / Valkey** | BSD-3 | Session state, sliding window rate-limiting Lua scripts, and BullMQ queue backend. |
| **Edge & API Gateway** | **Cloudflare Workers + Kong Gateway** | Apache 2.0 / Managed | Edge DDoS protection, SSL termination, and initial IP rate limiting. |

---

## 📚 Repository Documentation Index

### Core Architecture & Technical Specifications
- 📘 [Master System Architecture (`ARCHITECTURE.md`)](./ARCHITECTURE.md) — Comprehensive technical architecture, database schemas, level-tier mechanics, rate limiting matrix, and placement overlay.
- 🧩 [Services View & Work Items (`SERVICES_VIEW.md`)](./SERVICES_VIEW.md) — Decoupled 8 microservices specification, Kafka event interfaces, and developer work item assignments.
- 📐 [Repository & Monorepo Structure (`REPOSITORY_STRUCTURE.md`)](./REPOSITORY_STRUCTURE.md) — Turborepo Monorepo structure, NestJS vs. Effect.ts analysis, open-source stack breakdown, and Docker setup.
- ⚙️ [Master Technical Framework (`docs/SMART_Master_Technical_Framework.md`)](./docs/SMART_Master_Technical_Framework.md) — High-level technical framework and scoring mechanics.
- 📊 [Proposed Repo Structure (`docs/SMART_Proposed_Repo_Structure.md`)](./docs/SMART_Proposed_Repo_Structure.md) — Monorepo blueprint copy.
- 📑 [Final Product Summary (`docs/smart-final-product-summary.md`)](./docs/smart-final-product-summary.md) — Product positioning, core values, and placement trust chain.
- 📈 [Level × Tier Mechanics (`docs/Smart-Level-Tier.md`)](./docs/Smart-Level-Tier.md) — Deep dive into 5 Levels × 3 Tiers, Angoff cut scores, and BARS consensus scoring.
- 🗺️ [Domain-to-Level Mapping Tables (`docs/smart-domain-level-mapping-tables.md`)](./docs/smart-domain-level-mapping-tables.md) — Taxonomy mapping for all 10 role tracks.
- 📄 [V1 Full Product Specifications (`docs/SmartV1FullThings.md`)](./docs/SmartV1FullThings.md) — Detailed strategic blueprint for v1 delivery.

### Technical Role Blueprints (5 IT Tracks)
- 💻 [Full Stack Developer](./docs/SMART_Blueprint_FullStackDeveloper.md)
- 🤖 [AI / ML Engineer](./docs/SMART_Blueprint_AIMLEngineer.md)
- ☁️ [Cloud & DevOps Engineer](./docs/SMART_Blueprint_CloudDevOpsEngineer.md)
- 🛡️ [Cybersecurity Analyst](./docs/SMART_Blueprint_CybersecurityAnalyst.md)
- 📊 [Data Analyst](./docs/SMART_Blueprint_DataAnalyst.md)

### Business Role Blueprints (5 MBA Tracks)
- 📈 [MBA — Finance](./docs/SMART_Blueprint_MBA_Finance.md)
- 📉 [MBA — Business Analytics](./docs/SMART_Blueprint_MBA_BusinessAnalytics.md)
- 📣 [MBA — Marketing](./docs/SMART_Blueprint_MBA_Marketing.md)
- ⚙️ [MBA — Operations](./docs/SMART_Blueprint_MBA_Operations.md)
- 👥 [MBA — Human Resources (HR)](./docs/SMART_Blueprint_MBA_HR.md)

---

## 🚀 5-Sprint Execution Roadmap

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

> **Mandate:** Sprints 1 to 4 deliver 100% of product feature code.  
> **Sprint 5 is 100% EXCLUSIVELY DEDICATED TO TESTING, QA, LOAD TESTING, SECURITY AUDITING, AND HARDENING.**

---

## 💻 Monorepo Structure

```
smart-platform/
├── apps/
│   ├── web-student/            # Next.js 14 Student Portal & Assessment UI
│   ├── web-tpo/                # Next.js 14 Placement Office Dashboard
│   ├── web-admin/              # Next.js 14 Super Admin Console
│   ├── web-verify/             # Next.js 14 Certificate Verification App
│   └── api-core/               # NestJS 10 Enterprise Microservice Root
├── packages/
│   ├── ui/                     # Shared React Component Library (Tailwind + shadcn/ui)
│   ├── contracts/              # Shared OpenAPI Specs, Zod Schemas & DTOs
│   ├── scoring-engine/         # Effect.ts Functional Scoring Package
│   └── config/                 # Shared ESLint, TSConfig & Tailwind Configs
├── docker/                     # Docker Compose Setup (Postgres, Redis, Kafka, MinIO)
├── kubernetes/                 # K8s Helm Charts & Deployment Manifests
├── docs/                       # Framework & Blueprint Documentation
├── ARCHITECTURE.md             # Master System Architecture
└── REPOSITORY_STRUCTURE.md     # Dedicated Repository Structure Spec
```

---

*Maintainer: Infinitica Engineering Team · Single Source of Truth for SMART Platform.*