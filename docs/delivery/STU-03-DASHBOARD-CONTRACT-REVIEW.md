# STU-03 — `StudentDashboardSummary` contract review

**Status:** awaiting system-architect review · **Branch:** `feat/stu-03-student-dashboard` (`c309a13`)
**Contract:** `packages/contracts/src/dto/student-dashboard.dto.ts` · **Routes:** `packages/contracts/src/http/routes.ts` (STU-03 block)
**Tickets covered:** I227–I234 (one aggregate read model)

Per `AGENTS.md`, contract changes are reviewed before dependent work proceeds. The API and web
were built ahead of this review, so any change requested here will ripple into every split PR.
Please review the contract first.

## What is being asked to approve

One authenticated endpoint, `GET /users/me/dashboard` (role `STUDENT`), returning
`StudentDashboardSummary`, plus `GET|PUT /users/me/profile-views-setting`.

Contract field names differ from the ticket wording; mapping used below:

| Ticket                      | Contract field       |
| --------------------------- | -------------------- |
| I227 profile completion     | `completion`         |
| I228 verification attention | `attentionItems`     |
| I229 top matches            | `topMatches`         |
| I230 opportunities          | `opportunities`      |
| I231 active applications    | `activeApplications` |
| I232 recent activity        | `recentActivity`     |
| I233 next action            | `nextAction`         |
| I234 profile views          | `profileViews`       |

## Review points

### 1. `completion` — source of truth

- Computed server-side by the existing `ProfileCompletionService.getProgressForStudent`.
- The browser previously re-derived this from seven separate API calls (`useProfileProgress`). The two
  implementations can drift; **decision needed:** should `useProfileProgress` be retired for the
  dashboard and, later, elsewhere?
- Fields: `percent` (0–100 int), `completedAreas`, `incompleteAreas` (area ids as plain strings — see Q1).

### 2. `attentionItems` — kinds, states, links

- `kind`: `CREDENTIAL | CERTIFICATE | EDUCATION | WORK_EXPERIENCE | PROJECT | SKILL`.
- `state`: `NEEDS_ACTION | PROCESSING | FAILED`. Mapping: credential `PENDING_VERIFICATION`→PROCESSING,
  `REVOKED`→FAILED; certificate `DECLARED|UPLOADED`→NEEDS_ACTION, `IN_VERIFICATION`→PROCESSING,
  `REJECTED`→FAILED; education `unverified`→NEEDS_ACTION, `rejected`→FAILED; work experience
  `SUBMITTED|PENDING_EMPLOYER`→PROCESSING, `REJECTED|EXPIRED`→FAILED, `DRAFT`→NEEDS_ACTION; active
  project `SUBMITTED|UNDER_REVIEW`→PROCESSING, `REJECTED`→FAILED; skill claim
  `DECLARED|BEGINNER_REATTEMPT`→NEEDS_ACTION.
- Ordered FAILED, NEEDS_ACTION, PROCESSING; capped at 10. `href` is an in-app path
  (`/profile?section=…`, `/assessments`).
- **Remaining limit:** failures that exist only as background-job state in Redis (for example a failed
  reconciliation job) have no persisted status and cannot be shown; such a record stays "in progress".
  Surfacing them needs a persisted job-status column or outbox. **Decision needed:** accept for I228, or
  schedule that change?

### 3. `topMatches` — I229 sources

- Two real sources, merged, best first, capped at 5, each item tagged `source`:
  - `APPLICATION`: the student's active applications that carry a system-computed `matchScore`
    (`matchPercent = round(score × 100)`); `applicationId` and `stage` are set.
  - `OPENING`: eligible, unapplied, open openings scored against the student's **VERIFIED** skill claims
    with the same locked rules ranker (`scoreCandidate`) used by the institution shortlist;
    `applicationId` and `stage` are `null`.
- Not shown: openings that list no required skills (cannot be scored meaningfully) and openings where
  the student holds none of the required skills. No verified skills means no opening-level matches.
  Nothing scorable means an empty list; no default score is ever invented.
- **Behaviour to be aware of:** the student's years of experience and location are unknown, exactly as in
  the institution shortlist, and the frozen ranker treats unknowns as neutral. A student holding the single
  required skill can therefore score 100%. **Decision needed:** keep parity with the shortlist, or apply a
  different treatment for the student-facing view?

### 4. `opportunities` — source and empty state

- Source: `JobOpening` with `status = OPEN`, at the student's `institutionId`, created in the last 30 days,
  `lastDateToApply` null or not past, **no existing `Application` by this student**.
- Eligibility applied only on stored fields: `minSscPercentage`, `minHscPercentage`, `backlogsAllowed`.
  `minCollegePercentage` is **not** applied (CGPA is stored on a 0–10 scale; no agreed conversion).
- `total` is the eligible count; `items` capped at 5. No institution ⇒ `{ total: 0, items: [] }`.
- **Decisions needed:** the 30-day "new" window; whether to apply a CGPA→percentage rule.

### 5. `activeApplications` — definition of "active"

- Stages `APPLIED, SHORTLISTED, AI_VERIFIED, INTERVIEW, OFFER`. Excludes `HIRED`, `REJECTED`, `WITHDRAWN`.
- `total` is a count query, `items` the 5 most recently updated. Confirm `OFFER` should count as active and
  `HIRED` should not.

### 6. `recentActivity` — events, timestamps, ordering

- Two sources merged, newest first, capped at 10: (a) `AuditLog` rows where the student is the **actor**
  (`actorId`) or the **subject** (`resourceType = user` and `resourceId` is the student, or
  `metadata.studentId` is the student) and `action` starts with an allow-listed prefix
  (`personal_info.`, `profile_visibility.`, `profile_view_setting.`, `messaging_preference.`,
  `data_request.`, `candidate_education.`, `work_experience.`, `candidate_certificate.`, `evidence.`,
  `skill_`); (b) `ApplicationStageEvent` rows for the student's applications.
- Items carry `kind` (`PROFILE | VERIFICATION | APPLICATION`) and `byYou` (false when someone else acted,
  such as a college confirming education). `label` is generated (`personal_info.updated` → "Personal info
  updated").
- Institution-staff `candidate.profile_viewed` events are not on the allow-list and are never shown.
- `occurredAt` is the row's `createdAt`. Rows created in one transaction share a timestamp, so ties are
  unordered.
- **Remaining limit:** subject events are only found when the writer recorded the student as
  `resourceId` or in `metadata.studentId`. Other audit writers may need to follow that convention.

### 7. `nextAction` — action types and destinations

- First incomplete area in fixed order: skills, languages, education, experience, projects,
  certifications, links, job preferences. Destination `/profile?section=<area>` (job preferences →
  `/profile`). `null` means the profile is complete.
- Copy (title, description, CTA label) currently lives in the API. **Decision needed:** keep copy server-side
  or return an action id and localise on the client?

### 8. `profileViews` — employer only, deduplicated, opt-in

- New table `profile_views` (student, viewer, viewer role, viewer organisation, source, time).
  A row is written when an **authenticated `COMPANY`** account opens `GET /public/candidates/:slug`.
  Anonymous visitors, students and institution staff are never counted; institution-staff views remain in
  the audit log as `candidate.profile_viewed` and are never merged into this number.
- One counted view per employer per student per 24h.
- `users.show_employer_view_count` (default **false**). When off the API returns
  `{ visible: false, employerViews: null }` — the number never leaves the server. Window: 30 days.
- The public route stays unauthenticated; an optional bearer token is decoded only to identify the viewer
  (`AuthService.tryVerifyAccessToken`) and grants nothing. Tracking failures never fail the profile read.
- **Decisions needed:** is `B2B_PARTNER` an employer for this count? Should the viewer's organisation be
  shown to the student (currently stored, not exposed)? Data-retention period for `profile_views`?

### 9. Loading, error and empty behaviour

- Every section is an empty array/`null`/zero when its source is empty; the contract has no placeholder
  values. The client shows explicit empty states and a per-panel "Loading…" while pending.
- Failure of the endpoint shows a retryable error banner; nothing is cached as empty on failure.
- Any single section failing fails the whole response (`Promise.all`). **Decision needed:** should sections
  degrade independently instead?

### 10. Authorization and student isolation

- Controller is `@Roles('STUDENT')`; identity is `user.sub` from the JWT, never a request parameter.
- Every query filters by that id (`studentId`, `actorId`, or `application.studentId`). Unit tests assert the
  filters; a real-database run confirmed results.
- Opportunities are scoped by the student's own `institutionId`.

### 11. One aggregate endpoint?

- Pros: one round trip, one authorisation boundary, one place for consistency and caching; removes seven
  client-side calculations.
- Cons: one slow or failing section affects the whole response; the payload grows with the dashboard.
- **Recommendation:** keep one aggregate for now; revisit section-level `partial` results if a section
  becomes slow.

## Open questions

1. Should `completedAreas` / `incompleteAreas` be an enum in the contract rather than strings?
2. Add `kind` to `recentActivity` items and `type` to `nextAction`?
3. Are `matchPercent` (0–100 int) and ISO-8601 strings the agreed conventions?
4. Rate-limit tier: the routes use `role.student`; is a stricter tier wanted for the aggregate (200 ms SLA)?

## Validation already done

- Unit tests: contracts 311, api-core 1306, api-client 50, web-student 524 (all passing; 2 web and 4 api
  tests are skipped for unrelated, documented reasons).
- Real local Postgres: the aggregate read satisfied the contract schema; employer-view deduplication,
  staff/anonymous exclusion and opt-in visibility were verified in a rolled-back transaction; seeded,
  rolled-back runs confirmed the opportunity, match, application, activity, certificate and project queries
  and filters against real rows, including opening-level scoring and subject-event lookup via the JSON
  metadata path.
- Not yet done: load/performance testing, a request through the running HTTP server, and an index for the
  `audit_logs.metadata` path lookup (currently unindexed; bounded by the allow-listed prefix and `take`).
