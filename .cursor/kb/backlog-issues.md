# Backlog & GitHub Issues

**Living backlog = GitHub Issues.** Zoho Sprints holds a one-time mirror for sprint planning in the UI.

## Edit flow

1. Change AC / DoD / subtasks in `tools/zoho-sprint0/backlog.mjs` or `tools/zoho-sprint1/backlog.mjs`.
2. Run `node tools/backlog/sync-github.mjs` (or `sprint0` / `sprint1`).
3. Do **not** push updates to Zoho via MCP unless the user explicitly requests a re-import.

## Issue numbering

| Sprint   | GitHub  | Zoho sprintId       |
| -------- | ------- | ------------------- |
| Sprint 0 | #26–#43 | `45711000000025055` |
| Sprint 1 | #3–#24  | `45711000000026035` |

Full ID map: `docs/delivery/SPRINT0_ZOHO_MANIFEST.md`, `SPRINT1_ZOHO_MANIFEST.md`.

## Labels (on every issue)

Priority (`P0-blocker`, `P1-high`, …) + area (`area:backend`, …) + `sprint-0` … `sprint-5`.

Details: `.cursor/rules/09-commits-and-prs.mdc`.
