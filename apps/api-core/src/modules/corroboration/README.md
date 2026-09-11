# corroboration

**Owner:** Ramansh (AI Engineer)

## Purpose & boundary

Fuses passive platform signals (GitHub language breakdown today; HackerRank/LeetCode later) with mandatory skill-verification outcomes to produce trust-weighted competency readouts.

- **In scope:** rule-based passive encoding handoff, `fuseSignals()` integration, Redis snapshots, admin review flags on contradiction.
- **Out of scope:** promoting or demoting `SkillClaim.status`, Prisma migrations (v1 uses Redis), offline weight learning job.

Playbook §5.5: passive signal is corroborating weight only.

## Endpoints

| Method | Path                                                   | Role    |
| ------ | ------------------------------------------------------ | ------- |
| GET    | `/api/v1/corroboration/me`                             | STUDENT |
| GET    | `/api/v1/admin/corroboration/review-flags`             | ADMIN   |
| POST   | `/api/v1/admin/corroboration/review-flags/:id/resolve` | ADMIN   |

## Kafka

- Consumes: `smart.candidate.skills_discovered` (via signal-encoder), `smart.skill.verification.completed`
- Produces: `smart.corroboration.updated`, `smart.signal.encoded` (encoder)

## Security (S6-RM-11)

- Institution-scoped admin flag list/resolve (`INSTITUTION_ADMIN` filtered by `institutionId`)
- Audit events: `corroboration.review_flag.created`, `corroboration.review_flag.resolved`
- Kafka idempotency: `corroboration:processed:{claimId}:{eventId}` (7d TTL)
- Claim/user binding on verification consumer (`claim.studentId === event.userId`)
- Passive ingest requires `consentScope` on `VectorizedSignal`
- Outbox debounce for `corroboration.updated` (30s per user)
- Signed weight model checksum via `@smart/scoring-engine` `verifySignalWeightModel()`

## Pending (VV migration ticket)

Proposed Prisma tables (not authored here — ADR-0007):

- `passive_signal_snapshots` — durable corroboration readouts
- `corroboration_review_flags` — admin queue with institution index

Until migration lands, Redis remains the source of truth.

## Pending

- HackerRank/LeetCode adapters
- Offline weight learning CLI
- `POST /signals/refresh` with `corroboration.refresh` rate limit
