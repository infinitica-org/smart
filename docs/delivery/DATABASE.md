# SMART — Database (Postgres)

> Owner: Vishal V (schema / migrations) · Tino (this policy)  
> Runtime client: **Prisma 7** in `apps/api-core`. There is no second ORM.

## One database engine

SMART talks to **PostgreSQL 16+ with `pgvector`**, self-hosted via Docker on every environment. Application code always uses `DATABASE_URL`.

| Host                            | When to use               | What you set                                            |
| ------------------------------- | ------------------------- | ------------------------------------------------------- |
| Docker `pgvector/pgvector:pg16` | Laptop, kvm2/kvm4 Compose | `DATABASE_URL=postgresql://smart:…@postgres:5432/smart` |

Prisma stays the only write path — no separate data-access SDK.

## Connection pooling (PgBouncer)

The `api` container's own runtime queries go through **PgBouncer** (transaction
pooling mode, `infra/docker/docker-compose.yml` service `pgbouncer`,
`edoburu/pgbouncer`) instead of connecting to `postgres` directly — the CLI
(`prisma migrate deploy`, `prisma db seed`, etc.) always keeps using
`DATABASE_URL` straight to `postgres:5432`, since transaction-mode pooling
doesn't support the session-level behavior migrations need.

| Var                   | Used by                         | Points at                              |
| --------------------- | ------------------------------- | -------------------------------------- |
| `DATABASE_URL`        | Prisma CLI, migrations, seeding | `postgres:5432` directly               |
| `POOLED_DATABASE_URL` | `api`'s own `PrismaPg` pool     | `pgbouncer:6432` (transaction pooling) |

`POOLED_DATABASE_URL` is optional — `PrismaService` falls back to
`DATABASE_URL` when it's unset (e.g. `pnpm dev:api` outside Docker on a
laptop). This exists because Postgres has a fixed `max_connections`; once
`api` runs as more than one instance/container, each instance's own `pg.Pool`
(currently `max: 20`) would otherwise multiply directly against that ceiling.
Add a second `api` replica only after confirming PgBouncer's
`default_pool_size`/`max_client_conn` (env `PGBOUNCER_DEFAULT_POOL_SIZE`,
`PGBOUNCER_MAX_CLIENT_CONN`) still fit inside Postgres's `max_connections`.

## Environment isolation (mandatory)

Never point `dev`, `qa`, and `prod` at the same database.

| Environment | Git branch | VPS                                          | Database     |
| ----------- | ---------- | -------------------------------------------- | ------------ |
| local       | feature    | laptop Docker                                | local volume |
| **dev**     | `dev`      | **kvm2** (`COMPOSE_PROJECT_NAME=smart-dev`)  | kvm2 volume  |
| **qa**      | `qa`       | **kvm2** (`COMPOSE_PROJECT_NAME=smart-qa`)   | kvm2 volume  |
| **prod**    | `main`     | **kvm4** (`COMPOSE_PROJECT_NAME=smart-prod`) | kvm4 volume  |

## Env files

| File                                       | Committed? | Purpose                    |
| ------------------------------------------ | ---------- | -------------------------- |
| `.env.example`                             | yes        | Laptop defaults            |
| `.env.dev.example`                         | yes        | kvm2 / `dev` template      |
| `.env.qa.example`                          | yes        | kvm2 / `qa` template       |
| `.env.prod.example`                        | yes        | kvm4 / `main` template     |
| `.env`, `.env.dev`, `.env.qa`, `.env.prod` | **never**  | Real secrets on the server |

Copy the matching example on the VPS, fill secrets, never commit.

## Migrations

Only Vishal V authors Prisma migrations (ADR-0007). On a server:

```bash
docker compose -f infra/docker/docker-compose.yml --profile apps exec api \
  sh -c 'npx prisma migrate deploy'
```

## Seeding

Local: `pnpm bootstrap` (or `pnpm --filter @smart/api-core db:seed`).

VPS: the `api` container is a slim production image — no `pnpm`, no
TypeScript source — so `prisma/seed.ts` cannot run via `docker compose exec`.
Use `bash scripts/seed-vps.sh <dev|qa|prod>` from `~deploy/smart` instead; see
`infra/vps/README.md`.
