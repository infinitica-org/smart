# ADR-0004: Module ownership boundaries

- **Status:** Accepted
- **Date:** 2026-08-21
- **Deciders:** Tino
- **Ticket:** S0-TN-04

## Context

Without hard ownership, PRs collide and nobody is accountable for production failures.

## Decision

- Authoritative maps: `TEAM.md` + `.github/CODEOWNERS` (CODEOWNERS wins on conflict).
- Tino reviews every PR; Tino writes **no** feature code.
- Path owners (summary): VV platform/auth/data/infra · SV UI/student/TPO · VB assessment/certs/verify/admin · RM AI/scoring/prompts · VG catalog/calibration/placement/content.
- Merging into another owner's path requires their review.

## Consequences

- WIP and review load are predictable.
- Cross-cutting changes start as contracts or ADRs, not drive-by edits.
