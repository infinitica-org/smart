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
- **AI Stack:** **Claude 5 Sonnet & Claude 4.7** (Primary) + **Google Gemini API (Gemini 2.5 Pro / Flash)** (Automatic Fallback).
- **Infrastructure Stack:** 100% Open-Source frameworks + Enterprise Cloud Infra (**Supabase PostgreSQL + `pgvector`**, **Cloudflare R2**, Apache Kafka, Redis/Valkey, Kong Gateway, Prometheus, Grafana).

---

## 2. Backend Framework Evaluation: NestJS vs. Effect.ts

We evaluated **NestJS** and **Effect.ts** to determine the optimal backend foundation for SMART's microservices and API layer.

### 2.1 Framework Comparison Matrix

| Evaluation Criteria | NestJS (TypeScript) | Effect.ts (Effect.js) | SMART Engineering Decision |
|---|---|---|---|
| **Architecture & Structure** | Enterprise Modular Monolith / Microservices with out-of-the-box Domain-Driven Design (DDD). | Functional programming paradigm with explicit Effect types, fiber concurrency, and algebraic data types. | **NestJS** provides a standardized, maintainable architecture for a multi-developer engineering team. |
| **Kafka & Microservice Transports** | Native `@nestjs/microservices` package supporting Apache Kafka, Redis, NATS, gRPC, and RabbitMQ out-of-the-box. | Requires custom wrapper code and third-party boilerplate to connect Kafka event consumers and producers. | **NestJS** wins for instant, production-tested Kafka event-driven integration. |
| **Database & ORM Integration** | Seamless integration with **Supabase PostgreSQL** via Prisma ORM / TypeORM, supporting PostgreSQL 16 and `pgvector`. | Requires Schema / Equinox integrations or raw SQL client wrappers. | **NestJS + Prisma + Supabase** provides instant migrations, type-safe queries, and seeding. |
| **Job Queue & Async Workers** | First-class `@nestjs/bullmq` integration for Redis-backed background workers (L2 code sandbox, L3 audio evaluation). | Custom fiber-based queues require building queue persistence from scratch. | **NestJS + BullMQ** provides robust Redis job queues with retries and dead-letter queues. |
| **Security & Middleware** | Built-in Guards, Interceptors, Pipes, and Middleware for JWT Auth, RBAC, and Redis Sliding Window Rate Limiting. | Pure functional error handling, but requires custom middleware wrappers for standard HTTP servers. | **NestJS** provides immediate security, rate-limiting, and middleware capabilities. |
| **OpenAPI / Swagger Generation** | Automated `@nestjs/swagger` decorator generation, exporting OpenAPI specs to Next.js clients. | Manual API contract generation or third-party schema mapping. | **NestJS** ensures frontend-backend contract synchronicity. |
| **Mathematical / Scoring Engine** | Standard imperative TypeScript code. | Exceptional for pure functional mathematical pipelines with zero unhandled exceptions. | **Effect.ts** is ideal for pure algorithmic calculations (IRT & Angoff cut-scores). |

---

## 3. Enterprise Technology Stack Table

All components in the SMART platform leverage open-source frameworks and enterprise cloud infrastructure:

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
├── apps/                           # Application Services & Portals
│   ├── web-student/                # Next.js 14 Student Portal & Assessment Engine UI
│   ├── web-tpo/                    # Next.js 14 Placement Office (TPO) Portal
│   ├── web-admin/                  # Next.js 14 Super Admin Platform Control Center
│   ├── web-verify/                 # Next.js 14 Public Certificate Verification App
│   └── api-core/                   # NestJS Enterprise Backend Monolith / Microservices
├── packages/                       # Shared Internal Libraries & Packages
│   ├── ui/                         # Shared React UI Component Library (shadcn/ui + Tailwind)
│   ├── contracts/                  # Shared API Contracts, DTOs & OpenAPI Schemas
│   ├── scoring-engine/             # Effect.ts Functional Mathematical Scoring Engine
│   └── config/                     # Shared Tooling Configurations (ESLint, TSConfig, Tailwind)
├── docker/                         # Docker & Local Container Environment (docker-compose.yml)
├── kubernetes/                     # Production K8s Helm Charts & Deployment Manifests
├── docs/                           # Master Documentation Folder
├── ARCHITECTURE.md                 # Primary Master System Architecture Specification
├── REPOSITORY_STRUCTURE.md         # Repository Structure Specification
└── turbo.json                      # Turborepo Build Pipeline & Caching Config
```

---

*For complete details, see [REPOSITORY_STRUCTURE.md](file:///mnt/Data/Work%27s/Grad360%20/smart/REPOSITORY_STRUCTURE.md).*
