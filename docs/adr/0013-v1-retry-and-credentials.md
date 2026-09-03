# ADR 0013 — V1 retry is one reattempt; licenses are first-class

- **Status:** Accepted
- **Date:** 2026-09-01
- **Owner:** Tino (`@brittytino`)
- **Ticket:** S2-TN-04
- **Product source:** Product Owner (1 Sep 2026) + playbook §5.2 / §5.6 + V1 launch roadmap

## Context

Playbook §5.6 said 3 attempts in 90 days. PRD §7.3 said a 2-strike model with a long cooldown. Prisma `Skill` still defaults `cooldown_days = 60` and `validity_days = 180`. Profile/parse contracts had education, experience, and skills — not licenses or certifications.

The Product Owner locked V1: add licenses & certifications, one reattempt, refresh the skill in 35 days.

## Decision

| Rule                     | Value in `@smart/contracts` v0.2.1                                               |
| ------------------------ | -------------------------------------------------------------------------------- |
| Attempts                 | `SKILL_MAX_ATTEMPTS = 2` (first + one reattempt)                                 |
| Reattempts               | `SKILL_REATTEMPTS = 1`                                                           |
| Refresh / lock length    | `SKILL_REFRESH_DAYS = 35`                                                        |
| Gap before the reattempt | `SKILL_INTER_ATTEMPT_COOLDOWN_HOURS = 48`                                        |
| Licenses                 | `LicenseCredentialSchema` on the resume-parse draft (and persist the same shape) |

Technical failures still do not consume an attempt.

Vishal V owns the Prisma default change (60/180 → 35). Until that migration, application code uses the contract constants.

## Consequences

- SE-T01 implements this machine only. A third try is a bug.
- CN-T01 / CN-T02 / CN-T03 show and persist `licenses`.
- Frozen PRD v1 text is not rewritten in place (ADR 0011). This ADR wins for retry and credentials.
