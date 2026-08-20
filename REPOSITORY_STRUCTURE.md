# SMART — Proposed Repository Structure & System Architecture Blueprint

> **Version:** v1.0 — Monorepo & Technology Stack Blueprint  
> **Last Updated:** 2026-08-20  
> **Maintainer:** Infinitica Engineering Team  
> **Purpose:** Standardized repository layout, open-source technology selection, NestJS vs. Effect.ts backend evaluation, and microservices architecture specification for the SMART platform.

---

## 1. Executive Summary & Architectural Decisions

SMART is engineered to support **1 million active candidates** with high throughput, strict rate-limiting, real-time code execution, Claude AI evaluation, and public certificate verification. To ensure developer productivity, code reusability, and modular scalability, SMART adopts a **Turborepo Monorepo Architecture**.

### 1.1 Key Stack Choices
- **Frontend Framework:** **Next.js 14 (App Router)** — React, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, and Zustand.
- **Backend Framework Choice:** **NestJS (TypeScript)** as the primary backend framework, with **Effect.ts** utilized as an isolated functional sub-module.
- **Infrastructure Stack:** 100% Open-Source frameworks (Apache Kafka, Redis/Valkey, PostgreSQL + pgvector, MinIO, Kong, Prometheus, Grafana).

---

## 2. Backend Framework Evaluation: NestJS vs. Effect.ts

We evaluated **NestJS** and **Effect.ts** to determine the optimal backend foundation for SMART's microservices and API layer.

### 2.1 Framework Comparison Matrix

| Evaluation Criteria | NestJS (TypeScript) | Effect.ts (Effect.js) | SMART Engineering Decision |
|---|---|---|---|
| **Architecture & Structure** | Enterprise Modular Monolith / Microservices with out-of-the-box Domain-Driven Design (DDD). | Functional programming paradigm with explicit Effect types, fiber concurrency, and algebraic data types. | **NestJS** provides a standardized, maintainable architecture for a multi-developer engineering team. |
| **Kafka & Microservice Transports** | Native `@nestjs/microservices` package supporting Apache Kafka, Redis, NATS, gRPC, and RabbitMQ out-of-the-box. | Requires custom wrapper code and third-party boilerplate to connect Kafka event consumers and producers. | **NestJS** wins for instant, production-tested Kafka event-driven integration. |
| **Database & ORM Integration** | Seamless integration with **Prisma ORM** / TypeORM, supporting PostgreSQL 16 and `pgvector`. | Requires Schema / Equinox integrations or raw SQL client wrappers. | **NestJS + Prisma** provides instant migrations, type-safe queries, and seeding. |
| **Job Queue & Async Workers** | First-class `@nestjs/bullmq` integration for Redis-backed background workers (L2 code sandbox, L3 audio evaluation). | Custom fiber-based queues require building queue persistence from scratch. | **NestJS + BullMQ** provides robust Redis job queues with retries and dead-letter queues. |
| **Security & Middleware** | Built-in Guards, Interceptors, Pipes, and Middleware for JWT Auth, RBAC, and Redis Sliding Window Rate Limiting. | Pure functional error handling, but requires custom middleware wrappers for standard HTTP servers. | **NestJS** provides immediate security, rate-limiting, and middleware capabilities. |
| **OpenAPI / Swagger Generation** | Automated `@nestjs/swagger` decorator generation, exporting OpenAPI specs to Next.js clients. | Manual API contract generation or third-party schema mapping. | **NestJS** ensures frontend-backend contract synchronicity. |
| **Mathematical / Scoring Engine** | Standard imperative TypeScript code. | Exceptional for pure functional mathematical pipelines with zero unhandled exceptions. | **Effect.ts** is ideal for pure algorithmic calculations (IRT & Angoff cut-scores). |

### 2.2 Final Backend Architecture Recommendation
> **Decision: Hybrid Enterprise Architecture**
> 1. **Primary Backend Framework:** **NestJS 10 (Fastify Adapter)**  
>    NestJS serves as the API gateway, microservice host, authentication provider, database broker, Kafka consumer/producer, and Redis rate-limiting middleware.
> 2. **Functional Sub-Package (`packages/scoring-engine`):** **Effect.ts**  
>    Effect.ts is embedded as an internal, pure-functional TypeScript library within `packages/scoring-engine` for executing Item Response Theory (IRT) estimation, Angoff standard deviation confidence band calculations, and BARS mode-consensus matrix math cleanly without side effects.

---

## 3. 100% Open-Source Technology Stack Table

All components in the SMART platform leverage open-source frameworks and technologies:

| Layer / Subsystem | Technology Choice | License / Hosting | Function & Purpose in SMART |
|---|---|---|---|
| **Frontend UI** | Next.js 14 (App Router) | MIT | Server-side rendering, responsive UI dashboards, and static certificate pages. |
| **Styling & Components** | Tailwind CSS + shadcn/ui | MIT | Design system, accessible components, and modern dark-mode aesthetic. |
| **State & API Queries** | Zustand + TanStack Query | MIT | Client-side assessment state and asynchronous server state caching. |
| **Primary Backend Core** | NestJS 10 (Fastify Node.js) | MIT | Enterprise REST API, microservices, auth, guard middleware, and WebSocket handlers. |
| **Functional Math Sub-Module** | Effect.ts (Effect 3.x) | MIT | Pure functional IRT scoring engine and Angoff confidence band calculations. |
| **Primary AI Engine** | Anthropic Claude 5 Sonnet & 4.7 | Anthropic API | **Claude 5 Sonnet** (BARS grading, L3/L4 defense, JD parsing); **Claude 4.7** (rapid item extraction). |
| **Fallback AI Engine** | Google Gemini 2.5 API (Pro / Flash) | Google API | High-availability automatic fallback engine for Anthropic API rate limits or outages. |
| **Event Streaming / Bus** | Apache Kafka (Redpanda / Strimzi) | Apache 2.0 | Asynchronous event streaming (assessment submitted, evaluation completed, certificate issued). |
| **In-Memory Cache & Rate Limit** | Redis 7 / Valkey | BSD / BSD-3 | Session cache, sliding window rate limiting (Lua scripts), and BullMQ queue backend. |
| **Relational DB & Vector** | Supabase (PostgreSQL 16 + `pgvector`) | Apache 2.0 / Managed | Core relational storage (`students`, `attempts`, `responses`, `certificates`) + vector cosine search. |
| **Object Storage** | Cloudflare R2 (S3-compatible) | Cloudflare | Zero-egress S3-compatible cloud object storage for candidate audio defenses and PDF certificates. |
| **Reverse Proxy & Gateway** | Cloudflare Workers + Kong Gateway | Apache 2.0 / Managed | Edge SSL termination, DDoS protection, and initial IP rate limiting. |
| **Observability & Metrics** | Prometheus + Grafana + Loki | Apache 2.0 / AGPLv3 | Open-source LGTM stack for container metrics, rate-limit violation tracking, and logs. |

---

## 4. Proposed Turborepo Monorepo Repository Structure

```
smart-platform/
├── .github/                        # CI/CD Workflows & Automation
│   ├── workflows/
│   │   ├── ci-lint-test.yml        # PR validation (ESLint, Prettier, PyTest, Jest)
│   │   ├── cd-build-deploy.yml     # Automated Docker build & K8s deployment
│   │   └── security-scan.yml       # OWASP & dependency vulnerability scanner
│   └── CODEOWNERS                  # Code ownership definitions per module
│
├── apps/                           # Application Services & Portals
│   ├── web-student/                # Next.js 14 Student Portal & Assessment Engine UI
│   │   ├── src/
│   │   │   ├── app/                # App Router pages (Dashboard, Assessment, Results)
│   │   │   ├── components/         # Assessment delivery player, audio recorder UI
│   │   │   ├── hooks/              # Custom React hooks (Timer, MediaRecorder)
│   │   │   ├── store/              # Zustand active test state store
│   │   │   └── lib/                # API client SDK & contract handlers
│   │   ├── public/                 # Static assets, fonts, icons
│   │   ├── package.json
│   │   └── next.config.mjs
│   │
│   ├── web-tpo/                    # Next.js 14 Placement Office (TPO) Portal
│   │   ├── src/
│   │   │   ├── app/                # Cohort readiness, shortlists, gap report UI
│   │   │   ├── components/         # Analytics charts, candidate table, filter bar
│   │   │   └── lib/                # TPO API SDK
│   │   ├── package.json
│   │   └── next.config.mjs
│   │
│   ├── web-admin/                  # Next.js 14 Super Admin Platform Control Center
│   │   ├── src/
│   │   │   ├── app/                # System status, rate-limit overrides, panel config
│   │   │   └── components/         # Global health dashboards, user management
│   │   └── package.json
│   │
│   ├── web-verify/                 # Next.js 14 Public Certificate Verification App
│   │   ├── src/
│   │   │   ├── app/                # verify.smart.com/cert/[id] verification view
│   │   │   └── components/         # Tier Trail matrix, confidence note, QR validator
│   │   └── package.json
│   │
│   └── api-core/                   # NestJS Enterprise Backend Monolith / Microservices
│       ├── src/
│       │   ├── main.ts             # Entry point (Fastify + Swagger + Kafka Listeners)
│       │   ├── app.module.ts       # Root NestJS module importing sub-modules
│       │   ├── modules/
│       │   │   ├── auth/           # Clerk JWT Authentication & RBAC Guards
│       │   │   ├── assessment/     # L1–L5 Delivery, Timer & Integrity Service
│       │   │   ├── sandbox/        # Isolated Docker Code Runner Service
│       │   │   ├── claude-proxy/   # Claude 5 Sonnet / 4.7 API Token Bucket Proxy
│       │   │   ├── evaluation/     # BARS Mode-Consensus Audio/Video Grading
│       │   │   ├── placement/      # JD NLP Parsing & Vector Matching Engine
│       │   │   ├── certificate/    # PDF & Dynamic QR Code Generation Service
│       │   │   └── rate-limiter/   # Redis Sliding Window Lua Rate Limit Guard
│       │   ├── kafka/              # Kafka Event Producers, Consumers & Handlers
│       │   ├── database/           # Prisma Schemas, Migrations & Seed Scripts
│       │   └── common/             # Interceptors, Filters, DTOs, Decorators
│       ├── package.json
│       └── nest-cli.json
│
├── packages/                       # Shared Internal Libraries & Packages
│   ├── ui/                         # Shared React UI Component Library
│   │   ├── src/                    # shadcn/ui components, buttons, modals, cards
│   │   └── package.json
│   │
│   ├── contracts/                  # Shared API Contracts, DTOs & OpenAPI Schemas
│   │   ├── src/                    # Zod schemas, TypeScript types, OpenAPI specs
│   │   └── package.json
│   │
│   ├── scoring-engine/             # Effect.ts Functional Mathematical Scoring Engine
│   │   ├── src/                    # IRT estimations, Angoff SD confidence calculations
│   │   └── package.json
│   │
│   └── config/                     # Shared Tooling Configurations
│       ├── eslint/                 # Shared ESLint rules
│       ├── typescript/             # Base tsconfig.json templates
│       └── tailwind/               # Shared Tailwind CSS themes & tokens
│
├── docker/                         # Docker & Local Container Environment
│   ├── docker-compose.yml          # Local development stack (Postgres, Redis, Kafka, MinIO)
│   ├── docker-compose.prod.yml     # Production overlay configuration
│   ├── Dockerfile.next             # Multi-stage Dockerfile for Next.js web apps
│   ├── Dockerfile.nest             # Multi-stage Dockerfile for NestJS API core
│   └── nginx/                      # Local NGINX reverse proxy & SSL config
│
├── kubernetes/                     # Production K8s Helm Charts & Deployment Manifests
│   ├── helm/
│   │   └── smart-platform/         # Helm charts for API core, Web apps, Kafka Workers
│   └── manifests/                  # Base K8s deployment, service, and ingress manifests
│
├── docs/                           # Master Documentation Folder
│   ├── SMART_Master_Technical_Framework.md
│   ├── SMART_Proposed_Repo_Structure.md
│   └── blueprints/                 # All 10 Role Blueprint Markdown Files
│
├── ARCHITECTURE.md                 # Primary Master System Architecture Specification
├── REPOSITORY_STRUCTURE.md         # Repository Structure Specification (This Document)
├── turbo.json                      # Turborepo Build Pipeline & Caching Config
├── package.json                    # Monorepo Root Package Specs & Workspace Scripts
├── README.md                       # Repository Onboarding & Developer Guide
└── .gitignore                      # Git Ignore Rules
```

---

## 5. Microservice Communications & Kafka Event Blueprint

NestJS microservices communicate asynchronously via **Apache Kafka** event streams:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       KAFKA EVENT-DRIVEN MESSAGING                          │
│                                                                             │
│  [Assessment Module] ──▶ Topic: smart.assessment.submitted ──┐              │
│                                                              │              │
│  [Claude Proxy]      ◄── Topic: smart.eval.requested ────────┤              │
│  [Evaluation Module] ──▶ Topic: smart.eval.completed ────────┤              │
│                                                              ▼              │
│  [Certificate Mod]   ◄── Topic: smart.certificate.issued ────┴┐             │
│                                                                ▼            │
│  [Placement Mod]     ◄── Topic: smart.placement.matched ── [PostgreSQL 16] │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Key Kafka Topics & Payloads

1. `smart.assessment.submitted`: Emitted by `assessment` module when a candidate completes L1–L5.
   - Payload: `{ attempt_id, student_id, level_id, raw_responses, submitted_at }`
2. `smart.eval.requested`: Triggers async LLM grading via `claude-proxy`.
   - Payload: `{ response_id, audio_s3_url, prompt_template_id, competency_id }`
3. `smart.eval.completed`: Emitted by `evaluation` module after Claude 5 Sonnet BARS scoring.
   - Payload: `{ response_id, assigned_tier, bars_score, justification, cohens_kappa }`
4. `smart.certificate.issued`: Emitted when candidate completes final tier trail.
   - Payload: `{ certificate_id, student_id, track_id, headline_tier, verification_url }`

---

## 6. Local Development Quickstart

To run the complete SMART stack locally:

```bash
# 1. Clone repository & install dependencies
git clone https://github.com/infinitica/smart-platform.git
cd smart-platform
npm install

# 2. Start local open-source infrastructure (Postgres, Redis, Kafka, MinIO)
docker compose -f docker/docker-compose.yml up -d

# 3. Run database migrations & seed items
npm run db:migrate
npm run db:seed

# 4. Start Turborepo development server (Next.js apps + NestJS API)
npm run dev
```

---

*This specification establishes the official monorepo design, open-source technology stack, and NestJS + Effect.ts architectural foundation for SMART.*
