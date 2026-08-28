# ADR 0012 — V1 matching is rules-based and TPO-mediated

- **Status:** Accepted
- **Date:** 2026-08-28
- **Owner:** Tino (`@brittytino`)
- **Product source:** PRD v1 §6.3 and §9.1

## Context

Allen assigned Vishal V the matching algorithms and the Jobs & Placements outcome path. The existing CODEOWNERS map is: Ramansh owns `matching/` (JD NLP + pgvector), Vedika owns `placement/` (JD records, shortlists, outcomes).

PRD v1 is explicit: V1 matching is a **transparent weighted score** shown to the TPO, who shortlists by hand. Autonomous matching and a candidate job feed are **V2**. AGILE_PLAN Sprint 3 still lists pgvector cosine as P0 for Ramansh.

A “dating app” in V1 means: structured JD in → ranked verified candidates out → human TPO → company ATS. It does not mean unsupervised swipe-to-hire.

## Decision

| Layer       | V1 (MMP, ship)                                                                                               | V2 / droppable in S3                  |
| ----------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| Rank        | Rules: skill presence + proficiency met/exceeded + domain + experience + location. Score 0–1 + one-line why. | pgvector cosine as an extra signal    |
| Who sees it | TPO only (`web-tpo`). No candidate job board (`CN-02`).                                                      | Company self-serve sourcing (`CO-07`) |
| Persistence | `placement` shortlist + `smart.placement.matched`                                                            | —                                     |
| LLM         | Optional JD parse / confidence interview via `ai-gateway` only                                               | Embedding re-rank                     |

**RACI for the outcome path (does not silently rewrite CODEOWNERS):**

| Concern                                              | O                                                                                        | C                               | I    |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------- | ---- |
| Rules ranker + match API orchestration (`SE-T05`)    | **Vishal V**                                                                             | Ramansh (if vector signal)      | Tino |
| JD NLP parse / embeddings (`S3-RM-01`)               | **Ramansh**                                                                              | VV                              | Tino |
| JD records, shortlist rows, outcomes (`S3-VG-01/02`) | **Vedika G**                                                                             | VV                              | Tino |
| TPO JD inbox / shortlist UI / send-to-company        | **Satheswaran V** (UI) + **Vishal Bharath R** (ATS/opportunity APIs per Allen AC-T03–06) | VV                              | Tino |
| Skill verification state machine (PRD 7.3)           | **Vishal Bharath R**                                                                     | Ramansh (MCQ/interview scoring) | Tino |

Path owners in Git remain: `matching/**` Ramansh, `placement/**` Vedika, `assessment/**` Vishal Bharath, platform Vishal V. Vishal V **implements the rules ranker** in `matching` via PR + Ramansh review, or as `matching/rules-ranker` that Ramansh merges. Do not duplicate a second matcher.

## Consequences

- Sprint 3 demo script is: Company JD → rules rank → TPO shortlist → opt-in → confidence check (VEGA/L4 reuse) → send to company → ATS stage syncs to My Applications.
- If S3 is behind, **cut cosine matching before cutting the rules ranker**. That matches PRD §9.1 and AGILE_PLAN §14 spirit (keep the honest shortlist).
- No bulk export of candidate PII to company tenants. Enforced in API, not only hidden in UI.
