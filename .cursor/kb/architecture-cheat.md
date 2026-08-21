# Architecture cheat sheet

Canonical: `ARCHITECTURE.md`, `REPOSITORY_STRUCTURE.md`, `README.md`.

## Stack (as shipped in repo)

| Layer | Choice |
|---|---|
| Monorepo | Turborepo + pnpm · Node 22.20 |
| API | NestJS 11 + Fastify |
| Web | Next.js 16 · four apps (student, tpo, admin, verify) |
| DB | PostgreSQL + pgvector (Prisma steward: Vishal V) |
| Cache / queues | Redis 7 · BullMQ |
| Events | Redpanda (Kafka API) |
| Object store | MinIO local / R2 prod |
| AI | Claude primary · Gemini failover via `ai-gateway` only |
| Scoring math | Effect.ts in `@smart/scoring-engine` |

## Local ports (truth)

| Port | Service |
|---|---|
| 3000 | `api-core` (`/health`, Swagger TBD `/api/docs`) |
| 3001–3004 | web-student, web-tpo, web-admin, web-verify |
| 5432 | Postgres |
| 6379 | Redis |
| 19092 | Redpanda (see `KAFKA_BROKERS` in env) |
| 9000 / 9001 | MinIO / console |

## Sync vs async (SLA)

| Mode | Rule | Examples |
|---|---|---|
| **Sync** | p95 target often ≪ 200 ms | login/refresh, next-item, L1 draft, public verify |
| **Async** | job_id + Kafka/BullMQ | L2 sandbox, L3/L4 eval, PDF cert, vector match |

## Scale targets

1M active candidates / season · **50k** peak concurrent test takers · Redis inventory ~332 MB → provision **2 GB**, `volatile-lru`.

## Shared packages

`@smart/contracts` (frozen API) · `scoring-engine` · `prompts` · `observability` · `api-client` · `ui`

## Auth model

15m access JWT + HttpOnly refresh · OAuth (Google/GitHub) · institutional SSO · public verify · B2B `X-SMART-API-KEY` · outbound HMAC webhooks.
