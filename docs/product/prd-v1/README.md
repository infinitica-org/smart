# SMART PRD v1.0 — frozen product pack

**Status:** Frozen for V1 MMP (28 Aug 2026). Improvements go through an ADR + contract PR, not by editing this pack in place.

**Owner:** Product Owner · **Architect steward:** Tino (`docs/delivery/PRD_V1_ARCHITECT_REVIEW.md`)

| File                                                   | What it is                                                                                           |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| [SMART_PRD_v1.md](./SMART_PRD_v1.md)                   | Product requirements. `[M]` / `[S]` / `[V2]` / `[V3]` tags.                                          |
| [SMART_UI_Design_Brief.md](./SMART_UI_Design_Brief.md) | Screen map and states for designers / Satheswaran.                                                   |
| [SPRINT_BACKLOG.md](./SPRINT_BACKLOG.md)               | Lightweight 5-day demo backlog. Subject to change.                                                   |
| [diagrams/](./diagrams/)                               | Architecture, ERD, onboarding, skill SM, placement, project verify, proctoring, tenant verification. |

## How this pack relates to the rest of the repo

When this pack and the delivery system disagree, use [`.cursor/kb/doc-authority.md`](../../../.cursor/kb/doc-authority.md):

1. `TEAM.md` + `CODEOWNERS` — who may edit which path
2. `@smart/contracts` — what is actually shipped at the API
3. `ARCHITECTURE.md` — certification engine (5×3 grid, tracks)
4. `docs/delivery/AGILE_PLAN.md` — GA calendar (10 Sep 2026)
5. **This pack** — product MMP narrative (verified profiles → TPO-mediated jobs)

The certification engine and this PRD are **one product**, not two. Verified skills and certificates are the dating-app _profile_. Matching + TPO shortlist + ATS are the _outcome_.

## Do not

- Rewrite this PRD to “fix” it. File an ADR.
- Treat the Product Owner’s xlsx as a greenfield sprint that rebuilds CI, auth, and the monorepo. Those exist.
- Open company bulk-export, self-serve job browse (`CN-02`), or full liveness IDV in V1.
