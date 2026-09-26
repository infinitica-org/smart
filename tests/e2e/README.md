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

## Wave 1 regression specs (S6-VV-146)

The sprint ship gate: run these before calling a sprint done.

- `student-signup.spec.ts`: register (no session issued) → sign-in refused until the email is verified → resend cooldown → verify → sign in as STUDENT → web-auth login redirects to the student portal.
- `employer-signup.spec.ts`: free-mail refused → onboarding + email code → submit + document → no sign-in while pending → admin approval (audited) → invite → set password → `APPROVED` status → a company hold blocks the next call.
- `auth-abuse.spec.ts`: lockout after 5 wrong passwords, per-IP login and register limits (429 + `Retry-After`).

They are API-level (Playwright `request` + Mailpit) except the web-auth login step, so they only need the API, Mailpit and web-auth running (global setup also checks web-verify).
Each spec sends its own made-up `X-Forwarded-For` (the API trusts the proxy header), so one spec's rate-limit hits never throttle another.
Every run creates new users and companies with unique emails; nothing needs cleaning up between runs.

> Videos (`retain-on-failure`) need Playwright's ffmpeg: `pnpm --filter @smart/e2e exec playwright install ffmpeg`.
