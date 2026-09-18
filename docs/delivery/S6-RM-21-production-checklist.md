# S6-RM-21 — Production checklist (AI interview & verification)

**Ticket:** S6-RM-21 · **Owner:** Ramansh (evaluation, ai-gateway consumers)  
**Branch:** `feat/S6-RM-21-ai-interview-agent`  
**Use:** Complete before promoting this branch to `qa` / production. Tick items in the PR body.

> **Branch scope note:** This branch contains merged work beyond RM-21 (matching, web-tpo, docs, etc.).  
> For production, run **full monorepo CI** on the PR; use the sections below for **interview / QLIX / skill-verify / proctoring** specifically.

---

## 0. Ship readiness (do first)

| Status | Item                                                                                                                                                                     |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ☐      | **All local interview fixes committed** — large unstaged set (defense proctoring, QLIX routing, skill-verify async, capability coerce) must not reach prod only on disk. |
| ☐      | `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm format:check` green on CI (not only affected packages).                                                             |
| ☐      | Prisma migrations on branch reviewed by **VV** and applied in target env (`project_qlix_*` migrations).                                                                  |
| ☐      | Redis + Bull workers running in prod (`qlix-poll`, `qlix-recalibration`, `skill-verify-grade` queues registered).                                                        |
| ☐      | Deployment workflow + live smoke verified (not CI-green alone).                                                                                                          |

**Last local audit (2026-09-18):** `@smart/api-core` typecheck green; `@smart/contracts` tests green (proctoring checkpoint reclassified ASYNC); defense / proctoring / pending-flow specs green; `skill-verify-exam` heading test aligned to catalog skill names.

---

## 1. Environment & secrets (production)

### API (`api-core`)

| Variable                                    | Production expectation                                                                                   |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                  | `production`                                                                                             |
| `OPENROUTER_API_KEY` or `GOOGLE_AI_API_KEY` | **At least one set** — defense stub **disabled** in production (`shouldUseDefenseStub()` returns false). |
| `QLIX_API_KEY`                              | Set for real integrity checks (omit = stub mode — not acceptable for GA ownership path).                 |
| `QLIX_*` thresholds                         | Confirm with product: `QLIX_SIMILARITY_HARD_FAIL`, `BORDERLINE`, `AI_LIKELIHOOD_FLAG`.                   |
| `PROCTORING_FULL`                           | `true`                                                                                                   |
| `PROCTORING_CV_PROVIDER`                    | `real` + **`proctoring-cv` sidecar** reachable at `PROCTORING_CV_URL`                                    |
| `SPEECH_STT_PROVIDER`                       | Prefer `whisper` (or configured prod provider); `stub` = browser-only transcripts on student.            |
| `SPEECH_TTS_PROVIDER`                       | Prod TTS or accept browser fallback in UI.                                                               |

### Web student

| Variable                      | Production expectation                                                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_PROCTORING_FULL` | **Must not be `false` when `PROCTORING_FULL=true`** — otherwise UI skips onboarding while API enforces `assertInterviewReady` → `proctoring_required`. |

Document in deploy secrets / Vercel env for `web-student`.

### Infra

| Component      | Check                                                                                |
| -------------- | ------------------------------------------------------------------------------------ |
| Redis          | TTL on defense sessions, proctor onboard keys, interview gate, skill-verify sessions |
| Object storage | Presigned upload for proctor snapshots + defense audio keys                          |
| Kafka          | `project-verify-completed`, defense-completed fusion consumers deployed              |

---

## 2. Ownership interview (project defense) — behavior verified

### Happy path (manual E2E)

1. Student submits project → verify completes → QLIX completes → **Start interview** visible.
2. Open `/profile/projects/:id/defense` → **prepare** → proctor onboarding (Chrome, camera) → **start** → opening question plays.
3. Speak / submit answers → examiner follow-ups → **complete** → grade + project status update.
4. `web-verify` / profile shows interview **COMPLETED**.

### Proctoring / session alignment (regression for `proctoring_required`)

| ☐ | **Same `sessionId`** for `ProctoringShell` attemptId and Redis active defense session. |
| ☐ | **`prepare` idempotent** while session ACTIVE and `startedAt` null (no rotate on double mount / Strict Mode). |
| ☐ | Stale `prepareDefense` responses ignored on client (`prepareSeqRef`). |
| ☐ | After **start**, clock runs; **reply** does not throw `proctoring_required` if onboarding completed on that session. |
| ☐ | **Abandon** clears session; re-entry gets new prepare only when prior attempt was started or explicitly cleared. |

### Failure modes

| Scenario                            | Expected                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| No LLM keys in **production**       | Start/reply/complete → **503** / `ai_unavailable`, **not** dev stub grader.                      |
| Redis session expired mid-interview | Reconcile → gate **PENDING**; student can prepare again.                                         |
| Proctor lock (integrity)            | Terminate path → complete with `integrityTerminated` → UNDER_REVIEW / ownership concern.         |
| QLIX failed / timeout               | Interview gate **closed**; student sees review path, not voice interview.                        |
| High similarity QLIX **completed**  | **Interview gate opens** + project may still route **UNDER_REVIEW** (`SOURCE_OVERLAP_ELEVATED`). |

### Automated tests (run before merge)

```bash
pnpm --filter @smart/api-core test project-defense.service.spec.ts proctoring.service.spec.ts qlix-poll.service.spec.ts project-verify.heuristics.spec.ts
pnpm --filter @smart/web-student test project-defense
```

---

## 3. QLIX & project verify

| ☐ | `routeQlixResult`: completed QLIX → `opensInterviewGate: true` (except failed/timeout). |
| ☐ | No min-token-only block to review (removed from heuristics). |
| ☐ | Poll processor + hard cap respected; stuck checks observable in logs. |
| ☐ | **Existing projects** verified **before** routing change may lack interview gate in Redis/DB — plan: re-run verify or admin repair (routing change does not backfill). |

---

## 4. Skill verification (SDE v4 + interview)

| ☐ | Finish assessment → async grading (Bull + in-process fallback) → **Under review** / pending UI when interview/evidence required. |
| ☐ | `verificationInProgress` on claim; UI blocks duplicate “Take assessment” while grading pending. |
| ☐ | `markClaimVerificationInProgress` updates `sourceMetadata` without strike increment. |
| ☐ | Interview questions cached per session; regen capped (`SKILL_VERIFY_INTERVIEW_MAX_REGENERATIONS`). |
| ☐ | **No** direct HTTP `POST /evaluation/skill-interview/*` — students use `/assessment/skill-verify/.../interview/*` only. |
| ☐ | Capability inference LLM output coerced (short `evidenceRefs`) — verify pipeline completes after QLIX on cred projects. |

```bash
pnpm --filter @smart/api-core test skill-verification skill-verification-pending-flow capability-inference
pnpm --filter @smart/prompts test capability-inference
pnpm --filter @smart/web-student test skill-declarations skill-verify
```

---

## 5. Proctoring (shared with skill-verify & defense)

| ☐ | `assertInterviewReady`: consent + precheck + face + liveness before defense start/reply/complete. |
| ☐ | Stub CV: enroll allows missing `faceCount` (dev); **prod** uses real CV with face count validation. |
| ☐ | Route registry: `/proctoring/checkpoint` marked **ASYNC** execution, SLA 3000ms (CV-bound). |
| ☐ | Heartbeat job enabled when `PROCTORING_FULL=true`. |

**UX gap (non-blocking):** Project defense onboarding still shows **skill-verify playbook** (`faceLiveCheck=true`). Consider `projectDefenseRuleItems()` in a follow-up ticket.

---

## 6. Security & abuse

| ☐ | All new/changed routes in `@smart/contracts` `ROUTES` with roles + rate limits. |
| ☐ | Defense audio keys scoped to `project-defense/{projectId}/`. |
| ☐ | `assertAttemptOwner` resolves defense session via `project:defense:session:{id}` Redis key. |
| ☐ | Skill-verify interview security spec green. |

---

## 7. Observability

| ☐ | Structured logs on defense complete, QLIX route decision, skill-verify grading failures. |
| ☐ | Metrics: confirm any new counters from branch registered in `@smart/observability` and scraped in prod. |
| ☐ | AI gateway audit IDs persisted on examiner/grader calls where implemented. |

---

## 8. Production smoke script (15 min)

1. **Project path:** One test student, one project with GitHub → submit → wait QLIX → interview end-to-end in Chrome.
2. **Skill path:** One skill claim → complete form → confirm pending/under-review → optional interview step.
3. **Negative:** Hit `startDefense` without onboarding → **400** `proctoring_required` (proves gate works).
4. **Rollback:** Feature flags / revert PR path documented if LLM or QLIX outage.

---

## 9. Change log (RM-21 interview stack — review focus)

| Area              | What changed                                                            |
| ----------------- | ----------------------------------------------------------------------- |
| Defense hardening | P1 examiner, prod stub off, session reconcile + TTL refresh, closing UX |
| QLIX routing      | Interview gate on completed QLIX even when review flagged               |
| Proctoring        | Prepare/session id alignment; stub enroll; checkpoint route SLA class   |
| Skill verify      | Async grading queue, in-progress claim metadata, UI badges              |
| Prompts           | Capability inference coercion; defense / SDE templates                  |
| Contracts         | Pending verification domain; route registry updates                     |

---

## 10. Sign-off

| Role                          | Name | Date | OK  |
| ----------------------------- | ---- | ---- | --- |
| Engineer                      | RM   |      | ☐   |
| Module owner (evaluation)     | RM   |      | ☐   |
| Architect review              | TN   |      | ☐   |
| Platform (migrations/workers) | VV   |      | ☐   |

---

_Generated for S6-RM-21 production push. Update section 0 after each local audit._
