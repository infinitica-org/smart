# ADR-0001: Primary application stack

- **Status:** Accepted
- **Date:** 2026-08-21
- **Deciders:** Tino (System Architect)
- **Ticket:** S0-TN-04

## Context

SMART must ship a role-specific certification platform (4 portals + API + AI evaluation) by 10 Sep 2026 with a 6-person team. Stack choice must maximize reuse, typed boundaries, and operational simplicity on a single VPS first.

## Decision

| Layer          | Choice                                                            |
| -------------- | ----------------------------------------------------------------- |
| API            | NestJS 11 + Fastify (`apps/api-core`)                             |
| Web            | Next.js 16 (student, TPO, admin, verify)                          |
| Data           | PostgreSQL 16+ with `pgvector` (Docker, self-hosted; Prisma only) |
| Cache / limits | Redis 7                                                           |
| Events         | Redpanda (Kafka API)                                              |
| Objects        | MinIO (local) / R2 (prod)                                         |
| Shared types   | `@smart/contracts` (Zod)                                          |
| Scoring math   | `@smart/scoring-engine` (Effect.ts)                               |

## Consequences

- One modular monolith API for V1; extract services later only with an ADR.
- Portals share `@smart/ui` and `@smart/api-client`.
- Orion RAG is out of band — SMART owns its own AI gateway and vectors.
