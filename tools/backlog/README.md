# Backlog → GitHub Issues (agent workflow)

**GitHub Issues are the living backlog.** Zoho Sprints was bootstrapped once; do not re-sync descriptions or items to Zoho unless the user explicitly asks for a one-time import.

## Source of truth

| Sprint   | Ticket definitions               | GitHub ↔ Zoho IDs                |
| -------- | -------------------------------- | -------------------------------- |
| Sprint 0 | `tools/zoho-sprint0/backlog.mjs` | `tools/zoho-sprint0/config.json` |
| Sprint 1 | `tools/zoho-sprint1/backlog.mjs` | `tools/zoho-sprint1/config.json` |

Manifests (read-only reference): `docs/delivery/SPRINT0_ZOHO_MANIFEST.md`, `SPRINT1_ZOHO_MANIFEST.md`.

Authority for scope: `docs/delivery/AGILE_PLAN.md`.

## When you change a ticket

1. Edit the story in the correct `backlog.mjs` (AC, DoD, subtasks, deps).
2. Sync **GitHub only**:

```bash
node tools/backlog/sync-github.mjs          # both sprints
node tools/backlog/sync-github.mjs sprint0  # Sprint 0 only (#26–#43)
node tools/backlog/sync-github.mjs sprint1  # Sprint 1 only (#3–#24)
```

3. Open a PR if the backlog change itself should be versioned (optional but good for team visibility).

## What agents must not do (unless user asks)

- Call `ZohoSprints_UpdateItem` / `CreateItem` / checklist APIs to push backlog text into Zoho
- Re-run one-time Zoho import scripts (removed from repo)
- Treat Zoho item descriptions as editable — engineers work from **GitHub issue bodies**

## Regenerate manifests (IDs only)

```bash
node tools/zoho-sprint0/generate-manifest.mjs
node tools/zoho-sprint1/generate-manifest.mjs
```
