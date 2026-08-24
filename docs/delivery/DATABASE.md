# SMART — Database (Postgres, optional Supabase host)

> Owner: Vishal V (schema / migrations) · Tino (this policy)  
> Runtime client: **Prisma 7** in `apps/api-core`. There is no second ORM.

## One database engine

SMART talks to **PostgreSQL 16+ with `pgvector`**. How that Postgres is hosted can change per environment. Application code always uses `DATABASE_URL`.

| Host                            | When to use                | What you set                                                                                      |
| ------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------- |
| Docker `pgvector/pgvector:pg16` | Laptop, kvm2/kvm4 Compose  | `DATABASE_URL=postgresql://smart:…@postgres:5432/smart`                                           |
| **Supabase Postgres**           | Shared cloud DB (optional) | `DATABASE_URL` = Supabase URI (direct **5432** for migrations, pooler **6543** for app if needed) |

Do **not** add `@supabase/supabase-js` for core data access. Prisma stays the write path. Supabase Auth / Realtime stay out of V1 unless a later ADR says otherwise (`ARCHITECTURE.md` SSO notes are product intent, not current code).

## Environment isolation (mandatory)

Never point `dev`, `qa`, and `prod` at the same database.

| Environment | Git branch | VPS                                          | Database                                         |
| ----------- | ---------- | -------------------------------------------- | ------------------------------------------------ |
| local       | feature    | laptop Docker                                | local volume                                     |
| **dev**     | `dev`      | **kvm2** (`COMPOSE_PROJECT_NAME=smart-dev`)  | kvm2 volume **or** Supabase project `smart-dev`  |
| **qa**      | `qa`       | **kvm2** (`COMPOSE_PROJECT_NAME=smart-qa`)   | kvm2 volume **or** Supabase project `smart-qa`   |
| **prod**    | `main`     | **kvm4** (`COMPOSE_PROJECT_NAME=smart-prod`) | kvm4 volume **or** Supabase project `smart-prod` |

If you use Supabase: **one project per environment**. Enable the `vector` extension. Use the session/direct connection for `prisma migrate deploy` (port 5432), not transaction pooler, unless you add `?pgbouncer=true` only on the app URL.

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
