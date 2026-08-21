# SMART

Role-specific readiness certification. Candidates are assessed on a 5-level × 3-tier grid (Gold / Silver / Bronze) against real job-track competencies, then issued a student-controlled, publicly verifiable certificate.

**GA target: 10 September 2026, 18:00 IST.** Methodology, owners and sprint calendar: [`TEAM.md`](./TEAM.md), [`docs/delivery/AGILE_PLAN.md`](./docs/delivery/AGILE_PLAN.md).

## Who owns what

| Engineer             | Role                      | Writes                                                                      |
| -------------------- | ------------------------- | --------------------------------------------------------------------------- |
| **Tino**             | System Architect & Review | Architecture, `@smart/contracts`, quality gates. **No feature code.**       |
| **Vishal V**         | Senior Backend            | Platform core: auth, Prisma, Redis, Kafka, rate limit, sandbox, infra       |
| **Satheswaran V**    | Frontend + Full-stack     | `@smart/ui`, `@smart/api-client`, student + TPO apps                        |
| **Vishal Bharath R** | Full-stack + Backend      | Assessment lifecycle, certificates, verify + admin apps                     |
| **Ramansh**          | AI Engineer               | AI gateway, evaluation, matching, `@smart/prompts`, `@smart/scoring-engine` |
| **Vedika G**         | Data + AI/Backend         | Catalog, calibration, item banks, placement records, analytics              |

Enforced by [`.github/CODEOWNERS`](./.github/CODEOWNERS). Day-to-day: [`docs/delivery/ENGINEER_GUIDES.md`](./docs/delivery/ENGINEER_GUIDES.md). How to contribute: [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Stack

Turborepo + pnpm workspaces. Next.js 16 (four portals) · NestJS 11 / Fastify · PostgreSQL 16 + pgvector · Redis 7 · Redpanda (Kafka) · MinIO (S3) · Caddy.

Shared packages: `@smart/contracts` (frozen API), `@smart/scoring-engine`, `@smart/prompts`, `@smart/observability`, `@smart/api-client`, `@smart/ui`.

## Local development

**Exact step-by-step commands (Windows + Unix):** [`docs/delivery/LOCAL_DEV.md`](./docs/delivery/LOCAL_DEV.md).

Requires Node **22.20** (see `.nvmrc`), pnpm **11**, Docker optional but recommended.

```bash
pnpm bootstrap          # install, start data plane, Prisma generate, seed
pnpm doctor             # toolchain check (scripts/doctor.sh — needs bash)
pnpm dev:api            # http://localhost:3000/health
pnpm dev:web            # portals on :3001–:3004
```

`pnpm infra:up` starts Postgres, Redis (host **6380** → container 6379), Redpanda and MinIO only. App images are a separate profile (see VPS).

> **Windows note:** host port `6379` is often already taken (svchost/WSL). Local `.env` uses `REDIS_URL=redis://127.0.0.1:6380`.

Seeded accounts (local only), password `ChangeMe!Dev`:

- `student@smart.local`
- `tpo@smart.local`
- `admin@smart.local`

## VPS hosting

One machine, Docker Compose, Caddy TLS. Full steps: [`infra/vps/README.md`](./infra/vps/README.md).

```bash
cp .env.example .env    # set JWT_SECRET, passwords, DNS hostnames
bash scripts/deploy-vps.sh
```

## Quality

```bash
pnpm lint
pnpm typecheck
pnpm test
```

CI runs the same on every PR. Merge bar: [`docs/delivery/DEFINITION_OF_DONE.md`](./docs/delivery/DEFINITION_OF_DONE.md).

## Architecture docs

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — system design, scoring, rate limits
- [`SERVICES_VIEW.md`](./SERVICES_VIEW.md) — module boundaries
- [`REPOSITORY_STRUCTURE.md`](./REPOSITORY_STRUCTURE.md) — layout rationale
- Role blueprints live under [`docs/`](./docs/)
