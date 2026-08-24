# Document authority

When sources disagree, use this order:

1. **`.github/CODEOWNERS`** + **`TEAM.md`** — who owns what (mechanical + human)
2. **`packages/contracts/**`** — API/event/rate-limit shapes actually enforced in code
3. **`ARCHITECTURE.md`** — system design, SLAs, schema narrative, rate-limit rationale
4. **`docs/delivery/*`** — calendar, DoD, engineer guides (process)
5. **`tools/zoho-sprint*/backlog.mjs`** — sprint ticket AC/DoD/subtasks (synced to GitHub Issues)
6. **`README.md`** — local ports and bootstrap (prefer over guide tables if they conflict)
7. Older narrative docs (`SERVICES_VIEW.md` ownership tables, blueprint marketing copy) — **historical**; do not override TEAM.md

## Known drift (logged 2026-08-21)

| Topic                    | Wrong / stale                                           | Prefer                                                                                   |
| ------------------------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Auth / sandbox ownership | `SERVICES_VIEW` assigns auth→Satheeswaran, sandbox→Tino | TEAM: **Vishal V** owns auth + sandbox                                                   |
| Local ports              | `ENGINEER_GUIDES` table (student:3000, api:4000)        | README + `env.ts`: **API 3000**, webs **3001–3004**                                      |
| Nest/Next versions       | Some docs say Nest 10 / Next 14                         | README: Nest **11** / Next **16**                                                        |
| Sprint count             | ARCHITECTURE says 5 sprints                             | AGILE_PLAN: **6** (S0–S5) in 21 days                                                     |
| Auth vendor              | Occasional "Clerk" mentions                             | Dual JWT + SSO (Supabase Auth called out in architecture) — implement per contracts/TEAM |

Update this file when you discover new conflicts.
