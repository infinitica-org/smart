# S6-VB-01 — Work Experience Verification (end-to-end)

| Field      | Value                                                                                                            |
| ---------- | ---------------------------------------------------------------------------------------------------------------- |
| Ticket     | **S6-VB-01**                                                                                                     |
| Owner      | Vishal Bharath R (`VB`)                                                                                          |
| Support    | Sathesh (student UI) · Vishal V (mail, Redis TTL, Prisma batch) · Ramansh (OCR/classify **via ai-gateway only**) |
| Priority   | P0                                                                                                               |
| Sprint     | post-GA / v1.1.0 (target 15 Sep 2026)                                                                            |
| Area       | assessment / trust chain (VB). Contracts first (`@smart/contracts`).                                             |
| Depends on | Phase 1 CRUD already on `dev` (PR #168)                                                                          |
| Excel      | `S6-VB-01-work-experience-verification.xlsx` (same folder)                                                       |

Phase 1 (merged) is **collection**. This ticket is **proof + employer + time**.

## Outcome

The system can always answer: _where is this candidate’s work-experience verification, what is already proven, what are we waiting on, and when is the next action due?_

Silence at 48 hours → `VERIFICATION_EXPIRED` → **restart from submission**, new `verificationAttemptId`. Never mint VERIFIED from non-response.

## Acceptance criteria

1. Candidate submits experience details **and** company identity (website + LinkedIn handle/URL mandatory when the employer has a public page).
2. Proof upload rejects offer / joining / appointment / internship-offer as `INVALID_DOCUMENT_TYPE`. Completion / relieving / service / experience letters only.
3. OCR + classify returns VALID / INVALID / NEEDS_MANUAL_REVIEW. Auto-fraud is forbidden.
4. Identity / company / dates / role compared to the claim. Role variance is recorded, not auto-reject.
5. Verifier prefers official company email. Structured employer Q: identity, dates, type, domain/skills, YES / NO / PARTIAL / NEED CLARIFICATION.
6. Reminders every 6 hours until 42h; expire at 48h; restart from step 1 with a new attempt row.
7. Dashboard columns: candidate, company, status, current step, email state, time remaining.
8. RBAC + rate-limit on every new route. No secrets in logs. LLM only through ai-gateway.
9. Unit + integration tests for happy path, invalid document type, company mismatch, 48h expiry, restart.

## Out of scope

GitHub verification, L1 player, SE-T01 skill SM, in-house liveness, merging to `main`.
