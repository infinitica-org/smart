# AGENTS.md — SMART (entire repo)

You are working in the **SMART** monorepo. Shared context is team-wide; personal prefs live in gitignored `.cursor/local/`.

## Load context (in order)

1. `.cursor/local/IDENTITY.md` — who you are helping
2. `.cursor/local/preferences.md` — **durable personal preferences across agents**
3. `.cursor/local/working-memory.md` — current tickets / focus
4. `.cursor/kb/INDEX.md` — shared cheat sheets (`ownership.md`, rate limits, seams, …)
5. Role depth: `TEAM.md` + that person's section in `docs/delivery/ENGINEER_GUIDES.md`
6. As needed: `ARCHITECTURE.md`, `docs/delivery/*`, `packages/contracts`

Project rules in `.cursor/rules/*.mdc` always apply. **`02-dev-workflow.mdc` is mandatory.**

## Non-negotiable agent behaviour

| Rule      | Requirement                                                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Branch    | Never commit to `main`/`develop`. Use `feat/S#-XX-##-slug` (etc.)                                                                        |
| Quality   | `pnpm lint` · `typecheck` · `test` · `format:check` before PR                                                                            |
| Hooks     | Never `--no-verify`                                                                                                                      |
| Delivery  | Shippable work ends in a **PR to `develop`** with required **labels**                                                                    |
| Commits   | `<type>(<scope>): <summary> (<TICKET>)` — see `.cursor/rules/09-commits-and-prs.mdc`                                                     |
| Size      | ≤ 400 hand-written LOC per PR; one ticket per PR                                                                                         |
| Contracts | Change `@smart/contracts` first; Tino merges                                                                                             |
| Ownership | Edit owned paths only; otherwise PR + owner review                                                                                       |
| Secrets   | Never commit `.env` / keys                                                                                                               |
| Merge     | Do not merge unless the user explicitly asks; Tino approves                                                                              |
| Prefs     | Honor `.cursor/local/preferences.md` when present                                                                                        |
| Backlog   | Edit `tools/zoho-sprint*/backlog.mjs`; sync **GitHub Issues only** via `tools/backlog/sync-github.mjs` — do not update Zoho unless asked |

## Product in one line

Role-specific readiness certification (5×3 level×tier), transparent & verifiable. GA **2026-09-10 18:00 IST**.
