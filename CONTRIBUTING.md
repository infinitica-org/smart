# Contributing to SMART

Read these in order before writing code:

1. [`TEAM.md`](./TEAM.md) — who owns which path
2. [`docs/delivery/ENGINEER_GUIDES.md`](./docs/delivery/ENGINEER_GUIDES.md) — your day-to-day
3. [`docs/delivery/DEFINITION_OF_DONE.md`](./docs/delivery/DEFINITION_OF_DONE.md) — merge bar
4. [`docs/delivery/AGILE_PLAN.md`](./docs/delivery/AGILE_PLAN.md) — sprint calendar to 10 Sep 2026

## Rules that do not get waived

- **Tino does not write feature code.** Architect review is mandatory (`CODEOWNERS`).
- **Contract-first.** Cross-module types live in `@smart/contracts`. Implement against a merged type, do not invent a parallel DTO.
- **One owner per path.** If you are not the owner, open a PR; do not merge into someone else's module.
- **Unlimited endpoints do not ship.** Every route has a rate-limit policy and RBAC roles in `packages/contracts/src/http/routes.ts`.
- **Conventional Commits** with a scope from `commitlint.config.mjs`, e.g. `feat(auth): issue access token (S1-VV-02)`.

## Local loop

```bash
pnpm bootstrap          # install, start data plane, generate Prisma, seed
pnpm doctor             # check toolchain
pnpm dev:api            # Nest API on :3000
pnpm --filter @smart/web-student dev
```

Seeded logins (local only): `student@smart.local` / `tpo@smart.local` / `admin@smart.local` — password `ChangeMe!Dev`.

## VPS

See [`infra/vps/README.md`](./infra/vps/README.md).
