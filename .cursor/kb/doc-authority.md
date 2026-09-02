# Document authority

When sources disagree, use this order:

1. **`.github/CODEOWNERS`** + **`TEAM.md`** — who owns what (mechanical + human)
2. **`packages/contracts/**`** — API/event/rate-limit shapes actually enforced in code
3. **`ARCHITECTURE.md`** — system design, SLAs, schema narrative, rate-limit rationale
4. **`docs/delivery/*`** — calendar, DoD, engineer guides (process)
5. **`docs/product/prd-v1/`** — frozen MMP product pack (Allen, 28 Aug 2026). Story and `[M]` scope. Does **not** override TEAM.md or contracts. Improvements via ADR, not in-place PRD edits. Architect map: `docs/delivery/PRD_V1_ARCHITECT_REVIEW.md`
   - **V1 ship lock (1 Sep 2026):** [`docs/SMART_Platform_Playbook.md`](../../docs/SMART_Platform_Playbook.md) + [`docs/SMART_V1_Launch_Roadmap.md`](../../docs/SMART_V1_Launch_Roadmap.md) + [ADR 0013](../../docs/adr/0013-v1-retry-and-credentials.md). Retry = 1 reattempt / 35-day refresh. Licenses on the profile. These win over older playbook 3-strike text and PRD §7.3 cooldown examples.
6. **`tools/zoho-sprint*/backlog.mjs`** — sprint ticket AC/DoD/subtasks (synced to GitHub Issues)
7. **`README.md`** — local ports and bootstrap (prefer over guide tables if they conflict)
8. Older narrative docs (`SERVICES_VIEW.md` ownership tables, blueprint marketing copy) — **historical**; do not override TEAM.md

## Known drift (logged 2026-08-21)

| Topic                    | Wrong / stale                                           | Prefer                                                                                          |
| ------------------------ | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Auth / sandbox ownership | `SERVICES_VIEW` assigns auth→Satheeswaran, sandbox→Tino | TEAM: **Vishal V** owns auth + sandbox                                                          |
| Local ports              | `ENGINEER_GUIDES` table (student:3000, api:4000)        | README + `env.ts`: **API 3000**, webs **3001–3004**                                             |
| Nest/Next versions       | Some docs say Nest 10 / Next 14                         | README: Nest **11** / Next **16**                                                               |
| Sprint count             | ARCHITECTURE says 5 sprints                             | AGILE_PLAN: **6** (S0–S5) in 21 days                                                            |
| Auth vendor              | Occasional "Clerk" mentions                             | Dual JWT + SSO (OAuth/SAML, no Supabase) — implement per contracts/TEAM                         |
| Matching owner           | Allen assigned VV; CODEOWNERS `matching/` = Ramansh     | **ADR 0012:** VV implements rules ranker via PR to `matching`; RM reviews. Git owner unchanged. |

Update this file when you discover new conflicts.
