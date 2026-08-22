# SMART local knowledge base (`.cursor`)

**Tracked (git):** team rules + shared cheat sheets.  
**Gitignored:** your identity, **preferences**, and working memory under `.cursor/local/` (examples + README stay tracked).

| Path                           | Purpose                                                            |
| ------------------------------ | ------------------------------------------------------------------ |
| [`rules/*.mdc`](./rules/)      | Always-on + path-scoped Cursor rules (workflow, ownership, DoD, …) |
| [`kb/`](./kb/)                 | Shared cheat sheets for every engineer/agent                       |
| [`local/`](./local/)           | Per-developer IDENTITY + **preferences** + working memory          |
| [`../AGENTS.md`](../AGENTS.md) | Agent entrypoint                                                   |

## Setup for a new engineer

```bash
cp .cursor/local/IDENTITY.example.md .cursor/local/IDENTITY.md
cp .cursor/local/preferences.example.md .cursor/local/preferences.md
cp .cursor/local/working-memory.example.md .cursor/local/working-memory.md
```

Then: feature branches only; PR every shippable change to `develop`.

## Role detail (no duplicated playbooks)

Use `TEAM.md` + `docs/delivery/ENGINEER_GUIDES.md`. Shared map: `kb/ownership.md`.

## Canonical docs

`README.md` → `TEAM.md` → `CONTRIBUTING.md` → `ARCHITECTURE.md` → `docs/delivery/*` → `packages/contracts`
