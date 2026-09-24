# PRF-02 — student readiness (I332–I338): rules, decisions and limits

**Branch:** `feat/prf-02-readiness-summary` · **Contract:** `packages/contracts/src/dto/student-readiness.dto.ts`
**Endpoint:** `GET /users/me/readiness` (role `STUDENT`, identity from the JWT, every student-specific query scoped to that student)

## Principle

Nothing is invented. Every rule below already exists in the repo or on the tracker; a value that cannot be
calculated from those rules is `null` with an explicit availability (`NOT_CONFIGURED`, `NO_TARGET_ROLE`, `NO_DATA`).

## Where the rules come from

I360 ("define minimum proficiency for each skill") and I361 ("require selected evidence types") are
**employer** stories: employers define per-role requirements. The repo already holds both kinds of rule:

- **Required evidence** — the skill blueprint's proficiency requirements (`resolveProficiencyVerification`),
  the same gates skill verification finalisation uses. They differ per skill: e.g. SQL and Containerization
  need real-world application evidence at ADVANCED, Python needs only the interview gate at ADVANCED, and all
  need real-world + substantial application at PROFESSIONAL. Up to PROFICIENT nothing is required.
- **Minimum proficiency for a role** — `JobOpeningSkill.minProficiency`, defined by the employer on each opening.
  Catalog target roles have no minimums, so they are never scored.

## Status by ticket

| Ticket                           | Status                   | What it does                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I332 identity                    | Built                    | `VERIFIED` when email **and** LinkedIn or GitHub are verified, else `NOT_STARTED`; signals listed. `PENDING`/`FAILED` exist in the contract but nothing persists them, so they are never returned.                                                                                                                                                                                                 |
| I333 evidence completeness       | **Built**                | Over the student's VERIFIED skills at their verified levels: required evidence items (from the blueprint) that are present ÷ required. Lists each item as present/missing. No verified skill → `NO_DATA`. Nothing required → 100% with the reason "No evidence is required at your verified levels."                                                                                               |
| I334 demonstration               | Built                    | Per skill: `DEMONSTRATED` / `PROVISIONAL` / `NOT_DEMONSTRATED` using the existing qualification rules.                                                                                                                                                                                                                                                                                             |
| I335 completeness vs proficiency | Built                    | Proficiency is its own section (VERIFIED claims only, never a declared placeholder) and is never combined with completeness.                                                                                                                                                                                                                                                                       |
| I336 role readiness              | **Built for open roles** | For each open role at the student's institution that lists required skills: a skill is READY when the student's verified proficiency is at or above the employer minimum **and** the evidence the blueprint requires at that minimum level is present. `readinessPercent = round(100 × ready ÷ required)`, no weights or defaults. The catalog target role stays coverage-only (`NOT_CONFIGURED`). |
| I337 recommendations             | Built                    | One per skill/gap: missing required evidence (HIGH), role skills to add/verify, gaps for the closest open role (MEDIUM), evidence for verified skills (LOW). Sorted, capped at 8.                                                                                                                                                                                                                  |
| I338 optional evidence           | Built                    | Optional catalog-role skills have `affectsReadiness: false`, are only ever LOW priority, and evidence fully under NDA (`Project.ndaStatus = FULL`) is never asked for again.                                                                                                                                                                                                                       |

## Decisions taken (please confirm)

1. **Identity rule:** email AND one provider signal. Phone OTP in onboarding is UI-only, so it is not a signal.
2. **Interviews:** an interview is a verification gate with no evidence record, so it is not counted in evidence
   completeness. It is satisfied when the skill is verified.
3. **"Substantial application"** is met only by verified PROJECT evidence; "real-world application" by verified
   project or work-experience evidence.
4. **Readiness unit:** the share of a role's required skills that are READY. Partial proficiency is shown per
   skill (`BELOW_MINIMUM`) but earns no partial credit.
5. **NDA:** only `FULL` counts as "cannot be disclosed".
6. **Roles considered:** OPEN roles at the student's own institution with at least one required skill (newest 20,
   best 5 shown). Roles with no required skills are not listed.

## Known limits

- The catalog role has no score until employer-defined minimums exist for it (I360).
- No web screen currently sets the student's target role, so most students see "no target role".
- Evidence _expiry_ is reflected only through evidence status (EXPIRED evidence no longer counts).
- Interview outcomes are not readable from evidence records, so they are not part of completeness.

## Validation

- 65 API tests (rules above, student scoping, empty state, failure, idempotency) and 18 web tests.
- Real local Postgres, rolled-back transactions: completeness moved 0% → 100% when verified evidence was added;
  a role with two required skills went 0% → 50%; roles with no skills and closed roles were excluded.
