# SMART — Repository Structure & Architecture Reference

> **Status:** Adopted
> **Maintainer:** System Architect
> **Purpose:** Authoritative reference for the SMART monorepo layout, technology stack, and the rationale behind the primary architectural decisions. For backend module boundaries and service topology, see [`SERVICES_VIEW.md`](./SERVICES_VIEW.md). For per-module and per-engineer ownership, see [`TEAM.md`](./TEAM.md).

---

## 1. Executive Summary & Architectural Decisions

SMART is a role-specific readiness certification platform designed to support high-volume candidate throughput, strict API rate-limiting, real-time code execution, LLM-based evaluation, and public certificate verification. To maximize code reuse, enforce typed boundaries between services, and keep local and CI builds fast, the platform is organized as a **Turborepo-managed pnpm workspace monorepo**.

### 1.1 Key Stack Choices

- **Frontend framework:** Next.js 16 (App Router) across all web portals, using React, TypeScript, Tailwind CSS, shadcn/ui (via Radix primitives), and TanStack Query for server-state caching.
- **Backend framework:** NestJS 11 on the Fastify adapter (`apps/api-core`), deployed as a single modular monolith, with Effect.ts adopted as a functional core for specific computation- and pipeline-heavy code paths.
- **Infrastructure:** PostgreSQL 16 with `pgvector`, Redis 7, Redpanda (Kafka-API-compatible event streaming), S3-compatible object storage (MinIO locally, Cloudflare R2 in production), and Caddy as the reverse proxy / TLS termination layer.
- **AI evaluation layer:** A provider-agnostic AI gateway (`apps/api-core/src/modules/ai-gateway`) is the sole point of contact with large language model providers; all other modules are prohibited from importing LLM SDKs directly (see [ADR-0005](./docs/adr/0005-ai-failover.md)).

---

## 2. Backend Framework Rationale: NestJS with an Effect.ts Functional Core

An evaluation was conducted between NestJS and Effect.ts to determine the primary backend foundation for SMART's API and domain modules.

### 2.1 Framework Comparison

| Evaluation Criteria                 | NestJS (TypeScript)                                                                                                   | Effect.ts                                                                                                 | Engineering Decision                                                                                   |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Architecture & structure**         | Modular-monolith-friendly, with conventions for dependency injection, module boundaries, and domain organization.        | Functional paradigm built on explicit effect types, fiber-based concurrency, and algebraic data types.       | NestJS gives the multi-engineer team a standardized, maintainable module structure.                        |
| **Kafka / event transports**         | Native `@nestjs/microservices` support for Kafka, Redis, NATS, and gRPC transports.                                      | Requires custom wrapper code to integrate event producers and consumers.                                     | NestJS is used for production-tested, low-friction Kafka integration via `kafkajs`.                        |
| **Database & ORM integration**       | Integrates directly with Prisma against PostgreSQL 16 and `pgvector`.                                                    | Requires custom schema or raw SQL client wrappers.                                                           | NestJS + Prisma provides type-safe queries, migrations, and seeding out of the box.                        |
| **Job queues & async workers**       | First-class BullMQ integration for Redis-backed background workers (evaluation, sandboxed code execution, notifications).| Queue persistence and retry semantics would need to be built from first principles.                          | NestJS + BullMQ supplies retries and dead-letter handling with minimal custom code.                        |
| **Security & middleware**            | Built-in guards, interceptors, pipes, and middleware for JWT authentication, RBAC, and Redis sliding-window rate limits. | Pure functional error handling, but standard HTTP middleware requires custom wrapping.                       | NestJS provides immediate, conventional security and rate-limiting primitives.                             |
| **Mathematical / scoring pipelines** | Standard imperative TypeScript.                                                                                          | Well suited to pure, composable mathematical pipelines with explicit, typed error handling.                  | Effect.ts is used for the psychometric scoring engine, where correctness and composability matter most.   |

### 2.2 Adopted Backend Architecture

NestJS 11 (Fastify adapter) is the primary backend framework. It serves as the API surface, authentication provider, database access layer, Kafka consumer/producer host, and Redis-backed rate-limiting middleware for `apps/api-core`.

Effect.ts is embedded as the functional core of `packages/scoring-engine`, where it drives Item Response Theory (IRT) estimation, Angoff cut-score calculations, and inter-rater reliability statistics (Cohen's kappa, Cronbach's alpha) without side effects. It is also used selectively within a small number of `api-core` services (assessment and evaluation) where a composable, explicitly-typed effect pipeline simplifies orchestration of multi-step, fallible operations. Its use outside `packages/scoring-engine` remains the exception rather than the default and is subject to architecture review.

---

## 3. Technology Stack

All infrastructure components are open-source or self-hostable, with the exception of the managed AI provider APIs and (in production) object storage.

| Layer / Subsystem            | Technology                                                              | Function & Purpose in SMART                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| **Frontend UI**                | Next.js 16 (App Router)                                                   | Server-side rendering, portal dashboards, and public certificate pages.                                              |
| **Styling & components**       | Tailwind CSS + shadcn/ui (Radix primitives)                               | Shared design system and accessible component primitives, distributed via `packages/ui`.                            |
| **Server-state caching**       | TanStack Query                                                            | Client-side caching and synchronization of server state across portals.                                              |
| **Primary backend core**       | NestJS 11 (Fastify)                                                       | Modular-monolith REST API, authentication, guard middleware, and background workers.                                 |
| **Functional scoring core**    | Effect.ts                                                                 | Pure functional psychometric engine (IRT, Angoff cut-scores, reliability statistics) in `packages/scoring-engine`.  |
| **AI evaluation gateway**      | Anthropic Claude (primary), Google Gemini (fallback), OpenRouter (aggregation path) | Role-based model routing (primary reasoning, fast extraction, fallback reasoning/extraction, embeddings) behind a single internal gateway module, with circuit-breaker failover. |
| **Prompt management**          | `packages/prompts`                                                        | Versioned, guardrail-enforced LLM prompt registry; every AI-produced grade cites the prompt reference used.          |
| **Event streaming / bus**      | Redpanda (Kafka-API-compatible)                                           | Asynchronous domain events (assessment submitted, evaluation completed, certificate issued, and others).             |
| **In-memory cache & rate limit** | Redis 7                                                                 | Session cache, sliding-window rate limiting (Lua scripts), and BullMQ queue backend.                                 |
| **Relational DB & vector store** | PostgreSQL 16 + `pgvector` (self-hosted, containerized)                 | Core relational storage and vector similarity search over candidate/skill signals.                                   |
| **ORM & migrations**           | Prisma                                                                    | Schema definition, migrations, and seeding for `apps/api-core`.                                                      |
| **Object storage**             | MinIO (local/CI), Cloudflare R2 in production, via AWS SDK v3 (S3-compatible) | Storage for proctoring artifacts, candidate media, and generated certificates.                                       |
| **Reverse proxy / edge**       | Caddy                                                                     | Host-based routing and TLS termination in front of the API and each web portal.                                      |
| **Observability**              | Prometheus, Grafana, Grafana Loki, Grafana Tempo, Grafana Alloy           | Metrics collection, dashboards, log aggregation, and distributed tracing.                                            |

### 3.1 Capacity Planning & Cache Invalidation Strategy

Because Redis memory footprint directly informs cache-node sizing, SMART maintains an explicit memory budget and invalidation model for planning purposes. The figures below are an illustrative sizing model for a representative peak-load scenario (50,000 concurrent candidates) and should be re-derived against observed production metrics rather than treated as fixed limits.

**Indicative RAM inventory at peak concurrency:**

- **Active assessment sessions** (`session:assessment:{id}`): ~2.5 KB/user, TTL 2 hours.
- **Rate-limit sliding-window logs** (`rl:{role}:{id}`): ~200 B/key, TTL 60 seconds.
- **Auth tokens** (`auth:token:{user_id}`): ~800 B/user, TTL 15 minutes.
- **Active item-bank forms** (`items:form:{track_id}`): ~45 KB/form, TTL 24 hours.
- **Public verification payloads** (`verify:cert:{id}`): ~4 KB/certificate, TTL 1 hour.
- **BullMQ background queues** (`bull:queue:*`): stream buffers, sized to sustained job throughput.

**Invalidation strategy:**

1. **Passive eviction** — every cached key carries a mandatory TTL.
2. **Event-driven invalidation** — Kafka/Redpanda topics (e.g. `smart.assessment.submitted`, `smart.track.updated`) trigger immediate Redis deletions to purge stale assessment and cut-score caches.
3. **Eviction policy** — `volatile-lru`, so that active session keys are protected under memory pressure while other volatile keys are purged first.

---

## 4. Monorepo Repository Structure

```
smart/
├── .github/                        # CI/CD workflows and repository automation
│   ├── actions/
│   │   └── setup-node-pnpm/        # Composite action: pnpm + Node toolchain setup
│   ├── ISSUE_TEMPLATE/
│   ├── workflows/
│   │   ├── ci.yml                  # Lint, typecheck, unit test pipeline
│   │   ├── content-validate.yml    # Domain content / blueprint validation
│   │   ├── deploy-dev.yml          # Deployment to the development environment
│   │   ├── deploy-prod.yml         # Deployment to the production environment
│   │   └── perf.yml                # Manually-triggered load/stress/soak pipeline
│   ├── CODEOWNERS                  # Per-path code ownership (see CONTRIBUTING.md)
│   └── PULL_REQUEST_TEMPLATE.md
│
├── apps/                           # Deployable applications and services
│   ├── api-core/                   # NestJS 11 (Fastify) modular-monolith API
│   │   └── src/
│   │       ├── main.ts             # Entry point (Fastify bootstrap, Swagger, Kafka listeners)
│   │       ├── app.module.ts       # Root module composition
│   │       ├── modules/            # Domain modules (auth, assessment, evaluation, ai-gateway,
│   │       │                       #   placement, certificate, rate-limit, proctoring, matching,
│   │       │                       #   institutions, notifications, webhooks, and others —
│   │       │                       #   see SERVICES_VIEW.md for the complete module map)
│   │       ├── platform/           # Cross-cutting infrastructure: Prisma, Redis, Kafka, queue,
│   │       │                       #   storage, mailer, config, health, audit
│   │       └── common/             # Guards, interceptors, filters, decorators
│   │
│   ├── proctoring-cv/              # Python HTTP sidecar for proctoring signal analysis
│   │
│   ├── web-admin/                  # Next.js 16 — platform administration console
│   ├── web-auth/                   # Next.js 16 — authentication and invitation portal
│   ├── web-company/                # Next.js 16 — employer/company portal (early scaffold;
│   │                               #   configuration files only at present, not yet a
│   │                               #   package.json-bearing workspace member)
│   ├── web-student/                # Next.js 16 — candidate assessment portal
│   ├── web-tpo/                    # Next.js 16 — training & placement office console
│   └── web-verify/                 # Next.js 16 — public certificate verification portal
│
├── packages/                       # Shared internal libraries
│   ├── api-client/                 # Typed HTTP client for the SMART API (contract-validated)
│   ├── config-eslint/              # Shared ESLint 9 flat config (`@smart/eslint-config`)
│   ├── config-next/                # Shared Next.js configuration (`@smart/next-config`)
│   ├── config-tailwind/            # Shared Tailwind CSS 4 theme tokens (`@smart/tailwind-config`)
│   ├── config-typescript/          # Shared base tsconfig (`@smart/tsconfig`)
│   ├── contracts/                  # Cross-module contracts: domain enums, DTOs, Zod schemas,
│   │                               #   Kafka event payloads — the integration boundary
│   ├── observability/              # Structured logging, PII redaction, correlation IDs,
│   │                               #   Prometheus metric registry
│   ├── prompts/                    # Versioned LLM prompt registry with output guardrails
│   ├── scoring-engine/             # Effect.ts psychometric scoring engine (IRT, Angoff, reliability)
│   └── ui/                         # Shared React component library and design system
│
├── infra/                          # Infrastructure-as-code and local/production environment
│   ├── docker/                     # docker-compose.yml, Caddyfile, per-service Dockerfiles
│   ├── helm/                       # Helm chart scaffolding
│   ├── k8s/                        # Kubernetes manifest scaffolding
│   ├── observability/              # Prometheus, Grafana, Alloy, and Tempo configuration
│   └── vps/                        # Single-VPS deployment configuration
│
├── docs/                           # Documentation
│   ├── adr/                        # Architecture Decision Records
│   ├── delivery/                   # Process docs: branching policy, local dev guide,
│   │                               #   definition of done, engineer onboarding
│   ├── engineering/                # Engineering notes and tracked technical debt
│   ├── product/                    # Product requirements and roadmap
│   └── SMART_Blueprint_<Role>.md   # Per-role certification blueprint documents
│
├── tools/                          # Internal tooling
│   ├── backlog/
│   ├── content-pipeline/           # Assessment content authoring/validation pipeline
│   └── load-tests/                 # k6-based load, stress, spike, and soak test suites
│
├── tests/
│   └── e2e/                        # End-to-end test suite
│
├── scripts/                        # Bootstrap, doctor, and workspace maintenance scripts
├── ARCHITECTURE.md                 # Primary system architecture specification
├── SERVICES_VIEW.md                # Backend module boundaries and service topology
├── REPOSITORY_STRUCTURE.md         # This document
├── TEAM.md                         # Ownership by path (personal-name exception per CONTRIBUTING.md)
├── CONTRIBUTING.md                 # Contribution and repository conventions
├── turbo.json                      # Turborepo pipeline and caching configuration
├── package.json                    # Workspace root scripts and shared devDependencies
├── pnpm-workspace.yaml             # Workspace package globs and dependency catalog
└── README.md                       # Repository onboarding guide
```

---

## 5. Event-Driven Communication

Domain modules within `apps/api-core` communicate asynchronously through Redpanda (Kafka-API-compatible) event streams. Representative topics include:

```
┌───────────────────────────────────────────────────────────────────────────┐
│                    EVENT-DRIVEN MESSAGING (Redpanda)                      │
│                                                                           │
│  [Assessment module] ──▶ smart.assessment.submitted ──┐                  │
│                                                        │                  │
│  [AI Gateway]         ◄── smart.eval.requested ───────┤                  │
│  [Evaluation module]  ──▶ smart.eval.completed ───────┤                  │
│                                                        ▼                  │
│  [Certificate module] ◄── (issues) smart.certificate.issued ─┐           │
│                                                                ▼          │
│  [Placement module]   ◄── smart.placement.matched ── [PostgreSQL 16]     │
└───────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Representative Kafka Topics

1. `smart.assessment.submitted` — emitted by the assessment module when a candidate completes an assessment level.
2. `smart.eval.requested` — triggers asynchronous LLM-based grading via the AI gateway.
3. `smart.eval.completed` — emitted by the evaluation module once grading resolves.
4. `smart.certificate.issued` — emitted when a candidate completes a certification track.
5. `smart.placement.matched` / `smart.track.updated` — consumed by the placement module for matching and cut-score cache invalidation.

The complete, authoritative topic and payload catalog is defined in `packages/contracts/src/events`; this section is illustrative rather than exhaustive.

---

## 6. Local Development Quickstart

The commands below reflect the scripts defined in the workspace root `package.json`.

```bash
# 1. Clone the repository and install dependencies
git clone <repository-url>
cd smart

# 2. One-command bootstrap: installs dependencies, builds shared packages,
#    starts local infrastructure (Postgres, Redis, Redpanda, MinIO, Mailpit),
#    and runs migrations/seeding
pnpm bootstrap

# — or, step by step —

# 2a. Install dependencies
pnpm install

# 2b. Start local infrastructure (Postgres, Redis, Redpanda, MinIO)
pnpm infra:up

# 2c. Run database migrations and seed data
pnpm db:migrate
pnpm db:seed

# 3. Start the development servers
pnpm dev          # all apps, via Turborepo
pnpm dev:api      # apps/api-core only
pnpm dev:web      # all web-* portals only
```

Additional workspace scripts of note: `pnpm doctor` (environment diagnostics), `pnpm infra:down` / `pnpm infra:reset` (tear down local infrastructure), and the `pnpm stress:*` family (k6-driven load, stress, spike, and soak testing against the local or a target stack). The full script list is defined in the root `package.json`.

---

_This document establishes the adopted monorepo layout, technology stack, and NestJS + Effect.ts backend architecture for SMART. It is kept in sync with the actual repository structure; discrepancies should be corrected in the same change that introduces them._
