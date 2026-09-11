# SMART Playwright E2E

Owner: Satheswaran V.

## Prerequisites

1. Data plane running: `pnpm infra:up` (Postgres, Redis, **Mailpit** on `:8025`)
2. Database seeded: `pnpm db:seed`
3. Apps running:
   - `pnpm dev:api` → `:3000`
   - `pnpm --filter @smart/web-auth dev` → `:3005`
   - `pnpm --filter @smart/web-student dev` → `:3001`
   - `pnpm --filter @smart/web-tpo dev` → `:3002`
   - `pnpm --filter @smart/web-verify dev` → `:3004`

Default credentials (from seed): `student@smart.local` / `tpo@smart.local` — password `ChangeMe!Dev`.

## Run

```bash
pnpm --filter @smart/e2e exec playwright install chromium
pnpm e2e
```

Headed / debug:

```bash
pnpm --filter @smart/e2e test:headed
pnpm --filter @smart/e2e test:ui
```

## Work experience verification spec

`specs/work-experience-verification.spec.ts` covers:

- Student API create + send verification (Mailpit captures link)
- TPO ops dashboard pending row
- Employer YES on web-verify
- TPO + student UI verified state
- Invalid token + PARTIAL comment validation UI

Override URLs/credentials with `E2E_*` env vars (see `helpers/env.ts`).
