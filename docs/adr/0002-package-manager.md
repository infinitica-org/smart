# ADR-0002: pnpm + Turborepo workspace

- **Status:** Accepted
- **Date:** 2026-08-21
- **Deciders:** Tino
- **Ticket:** S0-TN-04

## Context

Six engineers need fast incremental builds, a single lockfile, and strict version alignment across apps and packages.

## Decision

- Package manager: **pnpm ≥ 11** (pinned in `packageManager` / Corepack).
- Build orchestrator: **Turborepo** (`turbo.json` pipelines: lint, typecheck, build, test).
- Workspace layout: `apps/*`, `packages/*`, `tools/*`, `tests/*`.
- Shared versions via pnpm `catalog:` in `pnpm-workspace.yaml`.

## Consequences

- Root scripts (`pnpm lint|typecheck|build|test`) are the CI contract.
- Adding a postinstall build dependency requires architect review (`onlyBuiltDependencies`).
- npm/yarn are unsupported; engineers use Corepack.
