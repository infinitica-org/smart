# Sprint 3 handover — pull `main`, then build

> **Author:** Tino · **Date:** 28 Aug 2026  
> Architect work for this sprint is **done**. I review and merge. You own and ship your modules.

**Pull this:** `origin/main` (same tree as `dev` after #101 / #102).  
**Branch from:** up-to-date `dev` (or `main` — they match).  
**PR into:** `dev`. I squash-merge after CI + review.  
**Do not** open feature PRs into `main`. I promote `dev` → `main`.

Frozen product: [`docs/product/prd-v1/`](../product/prd-v1/README.md)  
Who does what: [`PRD_V1_ARCHITECT_REVIEW.md`](./PRD_V1_ARCHITECT_REVIEW.md)  
Matching: [ADR 0012](../adr/0012-mmp-placement-matching.md)  
Contracts **v0.2.0** (`@smart/contracts`) already has `JobOpening`, `Application`, `AtsStage`, `SkillClaim`, rules match explanation, `smart.application.stage_changed`. Implement against those. Do not invent parallel DTOs.

---

## Sprint goal (must be true on 6 Sep)

A TPO posts a **structured** JD, sees a **rules-ranked** verified pool, shortlists, sends to company; the candidate sees ATS status; a completed track still issues a certificate.

Demo fails only if step “ranked list” is empty. Public profile is bonus.

---

## Take ownership — build your module

| You                | Build (P0)                                                                                                                                                                   | Do not absorb                      |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| **Vishal V**       | Prisma migration for openings/applications. Rules ranker (pure function + tests). Notify + ATS event consume. Indexes.                                                       | LLM parse, item banks, UI          |
| **Vishal Bharath** | Skill-claim SM on attempt complete. Integrity: flagged ≠ Verified ≠ certificate. Opportunity/ATS APIs. Certificate issuance still P0 if you must cut ATS chrome.             | Matcher, JD NLP, TPO visual design |
| **Ramansh**        | VEGA = L4 reuse for confidence interview. Score VB’s attempts. JD parse **only** if the form is free text (structured form ⇒ `parseConfidence=1`). Cosine is P1 / first cut. | Rules ranker, migrations           |
| **Vedika**         | MMP taxonomy skills (Software & IT). Persist openings + shortlist rows + outcomes. Cohort cards.                                                                             | Ranker math, ATS UI                |
| **Satheswaran**    | Verification badge. TPO ranked list + JD form (taxonomy picks). ATS Kanban. My Applications. **Never rank in the browser.**                                                  | Backend ranker, skill SM           |
| **Tino**           | Review + merge. 17:00 board. No feature code.                                                                                                                                | Your tickets                       |

Product Owner xlsx: `CO-T04` dashboard → **SV**. `CO-T05` stage sync + `INF-02` schema → **VV**.

---

## Do

- One ticket, one branch from `dev`: `<type>/S3-<initials>-<nn>-<slug>`
- Import types from `@smart/contracts` only
- Declare RBAC + rate-limit using the route already in `ROUTES`
- Tests for the promise you ship
- PR to `dev` with labels: priority + area + `sprint-3`

## Do not

- Rewrite CI, auth, or the monorepo (they exist)
- Build a fifth company app or a candidate job board (`CN-02` is V2)
- Bulk-export candidate PII to company tenants
- Duplicate a second matcher (VV lands rules in `matching/` — Ramansh reviews)
- Invent a second skill score next to Gold/Silver/Bronze
- Hardcode cooldown days — env default (VG + VB pick, e.g. 60)
- Wait for me to write your module
- Squash-merge `dev` into `main` yourselves

## If Thursday is already on fire

Cut in this order: Helm / Kong → cosine → project GitHub agent → ATS chrome.  
**Keep:** rules ranker + TPO shortlist table + certificate issuance.
