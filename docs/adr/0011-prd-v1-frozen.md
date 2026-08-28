# ADR 0011 — Freeze SMART PRD v1 as the MMP product pack

- **Status:** Accepted
- **Date:** 2026-08-28
- **Owner:** Tino (`@brittytino`)

## Context

Allen issued a final PRD v1 (MMP) plus diagrams, a UI brief, and a lightweight sprint backlog. He asked the architect to review it. The pack is “no more changes, subject to improvements.”

The repo already has a GA plan (`docs/delivery/AGILE_PLAN.md`), a certification model (`ARCHITECTURE.md`), and module owners (`TEAM.md`). Dropping a second product bible next to those without a freeze rule will fork the team.

## Decision

1. Canonical copy lives at `docs/product/prd-v1/`.
2. That directory is **frozen**. Product improvements are ADRs (and contract PRs if the API changes). Do not silently rewrite the PRD.
3. GA date, branching, DoD, and CODEOWNERS still win for _how we ship_. The PRD wins for _what V1 MMP means_ when it is more specific than older marketing/blueprint copy.
4. Allen’s 5-day xlsx is a **scope list for a demo loop**, not a replacement for Sprints 0–5.

## Consequences

- Tino’s review and Sprint 3 playbook: `docs/delivery/PRD_V1_ARCHITECT_REVIEW.md`.
- Matching MMP decision: ADR 0012.
- Engineers implement against contracts + this pack’s `[M]` items that survive the mapping table in the review.
