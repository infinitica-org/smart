# `@smart/api-core`

NestJS 11 + Fastify platform API. **Owner: Vishal V** (schema steward). Domain modules are owned per `TEAM.md` / `CODEOWNERS`.

## Run

```bash
# from repo root — data plane must be up (Redis host port 6380)
pnpm infra:up
pnpm --filter @smart/api-core db:deploy
pnpm --filter @smart/api-core db:seed
pnpm dev:api
```

| Probe / surface              | URL                                   |
| ---------------------------- | ------------------------------------- |
| Liveness                     | `GET http://localhost:3000/health`    |
| Readiness (Postgres + Redis) | `GET http://localhost:3000/ready`     |
| Swagger UI                   | `http://localhost:3000/api/docs`      |
| OpenAPI JSON                 | `http://localhost:3000/api/docs-json` |

## Migrations

Only Vishal V runs `prisma migrate`. Open an issue with table/column/type/reason; do not run `prisma migrate dev` on feature branches.

## Seed login

`student@smart.local` / `ChangeMe!Dev` (see seed script for TPO/admin variants).
