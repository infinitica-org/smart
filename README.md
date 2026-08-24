# SMART

Role-specific readiness certification. Candidates are assessed on a 5-level × 3-tier grid (Gold / Silver / Bronze) against real job-track competencies, then issued a student-controlled, publicly verifiable certificate.

**GA target: 10 September 2026, 18:00 IST.** Methodology, owners and sprint calendar: [`TEAM.md`](./TEAM.md), [`docs/delivery/AGILE_PLAN.md`](./docs/delivery/AGILE_PLAN.md). Architecture decisions: [`docs/adr/`](./docs/adr/). Branching: [`docs/delivery/BRANCHING.md`](./docs/delivery/BRANCHING.md).

## Who owns what

| Engineer             | Role                      | Writes                                                                      |
| -------------------- | ------------------------- | --------------------------------------------------------------------------- |
| **Tino**             | System Architect & Review | Architecture, `@smart/contracts`, quality gates. **No feature code.**       |
| **Vishal V**         | Senior Backend            | Platform core: auth, Prisma, Redis, Kafka, rate limit, sandbox, infra       |
| **Satheswaran V**    | Frontend + Full-stack     | `@smart/ui`, `@smart/api-client`, student + TPO apps                        |
| **Vishal Bharath R** | Full-stack + Backend      | Assessment lifecycle, certificates, verify + admin apps                     |
| **Ramansh**          | AI Engineer               | AI gateway, evaluation, matching, `@smart/prompts`, `@smart/scoring-engine` |
| **Vedika G**         | Data + AI/Backend         | Catalog, calibration, item banks, placement records, analytics              |

Enforced by [`.github/CODEOWNERS`](./.github/CODEOWNERS). **New engineers:** [`ENGINEER_START_CHECKLIST.md`](./docs/delivery/ENGINEER_START_CHECKLIST.md) · Day-to-day: [`ENGINEER_GUIDES.md`](./docs/delivery/ENGINEER_GUIDES.md) · [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Stack

Turborepo + pnpm workspaces. Next.js 16 (four portals) · NestJS 11 / Fastify · PostgreSQL 16 + **pgvector** · Redis 7 · Redpanda (Kafka) · MinIO (S3) · Mailpit (dev SMTP) · Caddy.

Shared packages: `@smart/contracts` (frozen API), `@smart/scoring-engine`, `@smart/prompts`, `@smart/observability`, `@smart/api-client`, `@smart/ui`.

## Local development

**Exact step-by-step commands (Windows + Unix):** [`docs/delivery/LOCAL_DEV.md`](./docs/delivery/LOCAL_DEV.md).

Requires Node **22.20** (see `.nvmrc`), pnpm **11.22** (pinned in `packageManager`). Docker Desktop recommended for the data plane.

```bash
pnpm bootstrap          # install, start data plane, Prisma generate/migrate, seed
pnpm doctor             # toolchain check (scripts/doctor.sh — needs bash)
pnpm infra:up           # data plane only (see ports below)
pnpm dev:api            # http://localhost:3000 — /health, /ready, /api/docs
pnpm dev:web            # portals on :3001–:3004
```

### Data plane (`pnpm infra:up`)

| Service       | Host URL / port                          | Notes                                   |
| ------------- | ---------------------------------------- | --------------------------------------- |
| Postgres      | `localhost:5432`                         | `pgvector/pgvector:pg16`                |
| Redis         | `localhost:6380` → container `6379`      | Windows often already binds host `6379` |
| Redpanda      | `localhost:19092`                        | Kafka-compatible                        |
| MinIO         | `localhost:9000` / console `:9001`       | S3-compatible                           |
| Mailpit       | UI `http://localhost:8025`, SMTP `:1025` | Captured outbound mail                  |
| Prisma Studio | `http://localhost:5555`                  | Browse/edit rows (same DB as the API)   |

Optional Compose profiles:

- `pnpm infra:obs` — Prometheus, Grafana, Loki
- `pnpm infra:apps` — containerized API + four webs (VPS/integration style; no Next HMR)

> **Windows / pnpm 9:** if `PATH` still surfaces standalone pnpm 9, wrapped scripts (`infra:*`, `db:*`, `bootstrap`) print a tip and continue (or re-exec via `npx pnpm@11.22.0`). **`pnpm install` stays strict** — put `%APPDATA%\npm` before `%LOCALAPPDATA%\pnpm`, or use Corepack. Details: [`LOCAL_DEV.md` §0](./docs/delivery/LOCAL_DEV.md).

### API probes (after `pnpm dev:api`)

| Path        | Purpose                                 |
| ----------- | --------------------------------------- |
| `/health`   | Liveness                                |
| `/ready`    | Readiness (Postgres + Redis must be up) |
| `/api/docs` | Swagger UI                              |

Seeded accounts (local only), password `ChangeMe!Dev`:

- `student@smart.local`
- `tpo@smart.local`
- `admin@smart.local`

## VPS hosting

One machine, Docker Compose, Caddy TLS. Full steps: [`infra/vps/README.md`](./infra/vps/README.md).

```bash
cp .env.example .env    # set JWT_SECRET, passwords, DNS hostnames
bash scripts/deploy-vps.sh
# or: pnpm infra:vps
```

## Quality

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm verify:handover   # optional live data-plane smoke (bash + Docker)
```

CI runs lint / typecheck / unit tests / build / compose config on every PR. Merge bar: [`docs/delivery/DEFINITION_OF_DONE.md`](./docs/delivery/DEFINITION_OF_DONE.md).

## Architecture docs

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — system design, scoring, rate limits
- [`SERVICES_VIEW.md`](./SERVICES_VIEW.md) — module boundaries
- [`REPOSITORY_STRUCTURE.md`](./REPOSITORY_STRUCTURE.md) — layout rationale
- Role blueprints live under [`docs/`](./docs/)
