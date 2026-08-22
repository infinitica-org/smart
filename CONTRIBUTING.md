# Contributing to SMART

**New engineer?** Start here: [`docs/delivery/ENGINEER_START_CHECKLIST.md`](./docs/delivery/ENGINEER_START_CHECKLIST.md) — access, bootstrap, sign-off, first ticket, PR workflow.

Read these in order before writing code:

1. [`TEAM.md`](./TEAM.md) — who owns which path
2. [`docs/delivery/ENGINEER_GUIDES.md`](./docs/delivery/ENGINEER_GUIDES.md) — your day-to-day
3. [`docs/delivery/DEFINITION_OF_DONE.md`](./docs/delivery/DEFINITION_OF_DONE.md) — merge bar
4. [`docs/delivery/AGILE_PLAN.md`](./docs/delivery/AGILE_PLAN.md) — sprint calendar to 10 Sep 2026
5. [`AGENTS.md`](./AGENTS.md) + [`.cursor/`](./.cursor/) — shared agent/human KB and workflow rules
6. [`docs/delivery/LOCAL_DEV.md`](./docs/delivery/LOCAL_DEV.md) — **exact local commands**

## Rules that do not get waived

- **Feature branches only.** Never commit to `main` or `develop`. Branch: `<type>/S<sprint>-<initials>-<nn>-<slug>`.
- **PR required.** Every shippable change opens a PR into `develop` (squash-merge after review). Local commits alone are not done.
- **Quality gates.** `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm format:check` must pass. Do not skip hooks (`--no-verify`).
- **Tino does not write feature code.** Architect review is mandatory (`CODEOWNERS`).
- **Contract-first.** Cross-module types live in `@smart/contracts`. Implement against a merged type, do not invent a parallel DTO.
- **One owner per path.** If you are not the owner, open a PR; do not merge into someone else's module.
- **Unlimited endpoints do not ship.** Every route has a rate-limit policy and RBAC roles in `packages/contracts/src/http/routes.ts`.
- **Conventional Commits** — `<type>(<scope>): <summary> (<TICKET>)` with scopes from `commitlint.config.mjs`. Details: [`.cursor/rules/09-commits-and-prs.mdc`](./.cursor/rules/09-commits-and-prs.mdc).
- **PR labels (tags)** — every PR: one of `P0-blocker`/`P1`/`P2-droppable` + one `area:*` + `sprint-N`. Optional: `needs-contract`, `needs-content`, `blocked`.
- **PR size.** ≤ 400 hand-written LOC; one ticket per PR.

Personal Cursor notes (identity, working memory) live in `.cursor/local/` and are gitignored — copy the `*.example.md` files there.

## Local loop

Full command list: [`docs/delivery/LOCAL_DEV.md`](./docs/delivery/LOCAL_DEV.md).

```bash
pnpm bootstrap          # install, start data plane, generate Prisma, seed
pnpm dev:api            # Nest API on :3000
pnpm dev:web            # all four portals :3001–:3004
```

Seeded logins (local only): `student@smart.local` / `tpo@smart.local` / `admin@smart.local` — password `ChangeMe!Dev`.

## VPS

See [`infra/vps/README.md`](./infra/vps/README.md).
