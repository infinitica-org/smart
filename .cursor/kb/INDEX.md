# KB index (team-wide)

Condensed shared knowledge. Canonical detail stays in repo docs.

| Sheet                                            | When to open                                                          |
| ------------------------------------------------ | --------------------------------------------------------------------- |
| [product.md](./product.md)                       | What SMART is                                                         |
| [architecture-cheat.md](./architecture-cheat.md) | Stack, ports, sync/async                                              |
| [ownership.md](./ownership.md)                   | Who owns paths / topics — deep dive: `TEAM.md` + `ENGINEER_GUIDES.md` |
| [seams.md](./seams.md)                           | Four integration seams                                                |
| [rate-limits.md](./rate-limits.md)               | Throttle matrix                                                       |
| [redis-keys.md](./redis-keys.md)                 | Key patterns + TTLs                                                   |
| [kafka-topics.md](./kafka-topics.md)             | Topics + producers                                                    |
| [doc-authority.md](./doc-authority.md)           | Which doc wins (includes frozen PRD v1 pack)                          |
| [commits-and-prs.md](./commits-and-prs.md)       | Commit subject + PR label tags                                        |
| [backlog-issues.md](./backlog-issues.md)         | Sprint backlog → GitHub Issues only (not Zoho)                        |
| [common-issues.md](./common-issues.md)           | Dirty merges, Actions billing, seed logins, escalation brief          |

**Sprint 3 handover (pull `main`):** [`docs/delivery/SPRINT03_HANDOVER.md`](../../docs/delivery/SPRINT03_HANDOVER.md) · MMP pack: [`docs/product/prd-v1/`](../../docs/product/prd-v1/README.md) · Architect map: [`docs/delivery/PRD_V1_ARCHITECT_REVIEW.md`](../../docs/delivery/PRD_V1_ARCHITECT_REVIEW.md)

**Full local setup:** [`docs/delivery/LOCAL_DEV.md`](../../docs/delivery/LOCAL_DEV.md)

Personal scratch + prefs: **`.cursor/local/`** (gitignored) — `preferences.md` is durable across agents.

## Agent workflow (non-negotiable)

Feature branch → lint/typecheck/test → commit (when asked) → **open PR to `dev`**. See `.cursor/rules/02-dev-workflow.mdc`.

## Quick commands

```bash
pnpm bootstrap
pnpm doctor
pnpm lint && pnpm typecheck && pnpm test && pnpm format:check
pnpm dev:api
```
