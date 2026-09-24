# AGENTS.md — SMART (repository-wide)

This file governs agent behavior across the **SMART** monorepo. Shared context applies team-wide; personal preferences live in the excluded `.cursor/local/` directory.

## Context load order

1. `.cursor/local/IDENTITY.md` — the operator being assisted
2. `.cursor/local/preferences.md` — durable personal preferences, applied across agent sessions
3. `.cursor/local/working-memory.md` — active tickets and current focus
4. `.cursor/kb/INDEX.md` — shared reference material (`ownership.md`, rate limits, integration seams, and related notes)
5. Role depth: `TEAM.md` together with the relevant section of `docs/delivery/ENGINEER_GUIDES.md`
6. As required: `ARCHITECTURE.md`, `docs/delivery/*`, `packages/contracts`

Project rules under `.cursor/rules/*.mdc` apply at all times. `02-dev-workflow.mdc` is mandatory.

## Non-negotiable agent behavior

| Rule                    | Requirement                                                                                                                                                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Branching               | Never commit directly to `main`, `qa`, or `dev`. All changes enter `dev` via a feature/bugfix branch PR. Direct pushes to `dev` are mechanically blocked. See `docs/delivery/BRANCHING.md`.                                                                                          |
| Quality                 | `pnpm lint`, `typecheck`, `test`, and `format:check` pass before a pull request is opened.                                                                                                                                                                                           |
| Hooks                   | Git hooks are never bypassed (`--no-verify` is not used).                                                                                                                                                                                                                            |
| Delivery                | Shippable work concludes as a pull request into `dev`, carrying the required labels (promotion follows `dev` → `qa` → `main`).                                                                                                                                                       |
| Commits                 | `<type>(<scope>): <summary> (<TICKET>)` — see `.cursor/rules/09-commits-and-prs.mdc`.                                                                                                                                                                                                |
| Size                    | No more than 400 hand-written lines of code per pull request; one ticket per pull request.                                                                                                                                                                                           |
| Contracts               | Changes to `@smart/contracts` are made first and reviewed by the system architect before dependent work proceeds.                                                                                                                                                                    |
| Ownership               | Only owned paths are edited directly; otherwise a pull request is opened for owner review.                                                                                                                                                                                           |
| Secrets                 | Environment files and credentials are never committed.                                                                                                                                                                                                                               |
| Merging                 | Feature PRs into `dev` require passing CI + approval from the designated Module Code Owner. Cross-cutting paths (`@smart/contracts`, CI, build graph) require System Architect (`@brittytino`) approval. Release promotions (`dev → qa → main`) are gated and executed by Tino only. |
| Preferences             | `.cursor/local/preferences.md` is honored when present.                                                                                                                                                                                                                              |
| Backlog                 | `tools/zoho-sprint*/backlog.mjs` is the edited source; synchronization to GitHub Issues runs via `tools/backlog/sync-github.mjs` only. The external sprint-tracking system is not updated unless explicitly requested.                                                               |
| Deployment verification | A deployment is not considered successful on the basis of a green CI run alone. The triggered deployment workflow, and the resulting live environment, are confirmed independently.                                                                                                  |

## Product summary

SMART is a role-specific readiness certification platform, assessed on a five-level by three-tier grid and issued as a transparent, publicly verifiable credential.
