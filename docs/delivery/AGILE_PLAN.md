# SMART — Agile Delivery Plan

> **Version:** v3.0
> **Framework:** Scrum with a hard, fixed release date
> **Start:** Friday 21 August 2026
> **General Availability:** **Thursday 10 September 2026, 18:00 IST**
> **Total runway:** 21 calendar days · 6 sprints · 5 delivery engineers + 1 architect/reviewer
> **Owner:** Tino (System Architect) — acting Scrum Master & Release Manager

---

## 1. Read this first — what "21 days" actually forces

This is a **fixed-date, fixed-team** delivery. The only variable left is scope. Therefore:

1. **Scope is ranked, not negotiated mid-sprint.** Every ticket carries `P0` / `P1` / `P2`.
   `P0` is a release blocker. `P1` ships if the sprint holds. `P2` is explicitly droppable and
   will be dropped without a meeting if Sprint 3 is behind.
2. **Sprints 0–4 build. Sprint 5 only hardens.** Zero feature merges after code freeze
   (8 Sep 23:59 IST). This mandate comes from `ARCHITECTURE.md` §15 and it is not waived.
3. **Contract-first is mandatory, not stylistic.** With 5 engineers and 21 days there is no
   time to rework an integration. See `TEAM.md` §4.1.
4. **Vertical slices only.** Every ticket must be demoable on its own. "Backend done, UI next
   sprint" is not a slice — it's an integration debt we cannot pay off in this runway.
5. **Content is on the critical path.** Vedika's item banks and cut scores gate Sprint 2's
   evaluation work. Content lateness is a release risk, tracked daily like code.

---

## 2. Sprint Calendar

```
AUG 2026                                          SEP 2026
 21 22 23 │ 24 25 26 27 28 │ 29 30 31  1  2 │  3  4  5  6 │  7  8 │  9 10
 └─ S0 ─┘ │ └───── S1 ────┘ │ └───── S2 ────┘ │ └─── S3 ──┘ │ └ S4┘ │ └ S5┘
 Foundation   Platform Core     Assessment &      Placement    Verify   TEST
 & Contracts  Identity/Data     AI Evaluation     & Certify    & Edge   ONLY
                                                              ▲        ▲
                                                       CODE FREEZE    GA
                                                       8 Sep 23:59   10 Sep
                                                                     18:00
```

| Sprint       | Window                  | Days | Sprint Goal (one sentence — if this isn't true at review, the sprint failed)                                                                                          |
| ------------ | ----------------------- | :--: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sprint 0** | Fri 21 Aug – Sun 23 Aug |  3   | Every one of the 6 engineers can run the full stack locally, and `@smart/contracts` v0.1 is merged and frozen.                                                        |
| **Sprint 1** | Mon 24 Aug – Fri 28 Aug |  5   | A student can log in via SSO, be enrolled on a track, and see a real item bank served through a rate-limited API; the AI gateway answers with Gemini failover proven. |
| **Sprint 2** | Sat 29 Aug – Wed 2 Sep  |  5   | A student can complete L1→L5 end to end and receive a calibrated tier for each level, graded by BARS with κ tracked.                                                  |
| **Sprint 3** | Thu 3 Sep – Sun 6 Sep   |  4   | A TPO can upload a JD, get a vector-matched shortlist, and see cohort readiness; a completed track issues a certificate.                                              |
| **Sprint 4** | Mon 7 Sep – Tue 8 Sep   |  2   | An employer can verify a certificate publicly in < 80 ms behind the edge gateway; all services integrated as one release candidate.                                   |
| **Sprint 5** | Wed 9 Sep – Thu 10 Sep  |  2   | The release candidate survives 50 k concurrent load, an OWASP pass, and pilot UAT — then it ships.                                                                    |

---

## 3. Ceremonies (IST — keep them short, they are cheap only if they stay short)

| Ceremony                              | When                       | Duration         | Who                                   | Output                                                                                              |
| ------------------------------------- | -------------------------- | ---------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Daily Standup**                     | Every day 09:30            | 15 min hard stop | All 6                                 | Yesterday / today / blockers. Blockers get an owner **in the meeting**.                             |
| **Architecture Review Board**         | Every day 17:00            | 30 min           | Tino + PR authors                     | Every open PR triaged: `merge` / `changes-requested` / `escalate`. Contract PRs merged here.        |
| **Sprint Planning**                   | First day of sprint, 10:00 | 45 min           | All 6                                 | Committed sprint backlog; every ticket has owner, points, priority, acceptance criteria.            |
| **Mid-Sprint Integration Checkpoint** | Sprint midpoint, 15:00     | 30 min           | All 6                                 | Cross-module seams demoed against real contracts. Catches integration drift while it's still cheap. |
| **Sprint Review (Demo)**              | Last day of sprint, 16:00  | 45 min           | All 6                                 | Working software demoed on `dev`. No slides. Not demoable = not done.                               |
| **Retrospective**                     | Last day of sprint, 17:00  | 20 min           | All 6                                 | Max 2 actions, each with an owner and a due sprint.                                                 |
| **Content Sync**                      | Mon / Thu 14:00            | 20 min           | Vedika, Ramansh, Vishal Bharath, Tino | Item bank / cut score / BARS anchor readiness vs. evaluation needs.                                 |

**Standup format — 3 sentences, no status theatre:**

> "Yesterday I closed S2-VB-11. Today I'm on S2-VB-12, the auto-submit path. I'm blocked on the
> `AttemptSessionDto` field Satheswaran needs — Tino, can we merge that contract at 17:00?"

---

## 4. Board & Workflow

**Columns:** `Backlog` → `Sprint Ready` → `In Progress` → `In Review` → `Verified` → `Done`

| Transition                     | Gate                                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------- |
| `Backlog` → `Sprint Ready`     | Meets Definition of Ready (§5). Owner + points + priority + acceptance criteria present.      |
| `Sprint Ready` → `In Progress` | Branch created. **Max 2 tickets in progress per engineer** — WIP limit is enforced.           |
| `In Progress` → `In Review`    | PR open, CI green, template filled, self-reviewed.                                            |
| `In Review` → `Verified`       | Tino approved + module owner approved (if cross-module) + demoed or screenshot/curl attached. |
| `Verified` → `Done`            | Squash-merged to `dev`, Definition of Done (§6) satisfied.                                    |

**Ticket ID scheme:** `S<sprint>-<initials>-<nn>` — e.g. `S2-RM-19`.
`TN` Tino · `VV` Vishal V · `SV` Satheswaran V · `VB` Vishal Bharath R · `RM` Ramansh · `VG` Vedika G

**Labels:** `P0-blocker` `P1` `P2-droppable` · `area:backend` `area:frontend` `area:ai` `area:data` `area:infra` `area:contracts` · `needs-contract` `needs-content` `blocked` · `sprint-0..5`

---

## 5. Definition of Ready (a ticket may not enter a sprint without all six)

1. One-sentence user-facing statement of value.
2. Named single owner from `TEAM.md`.
3. Acceptance criteria as a checklist, each item objectively verifiable.
4. Contract impact stated: none, or a link to the `@smart/contracts` PR.
5. Estimate in points (1, 2, 3, 5, 8 — an 8 must be split before it enters a sprint).
6. Dependencies listed by ticket ID, and those dependencies are already `Done` or in the same sprint.

## 6. Definition of Done

Full checklist in [`DEFINITION_OF_DONE.md`](./DEFINITION_OF_DONE.md). Summary — all must be true:

- [ ] Acceptance criteria met and demoed on `dev`.
- [ ] Types exported through `@smart/contracts`; no `any` at a module boundary.
- [ ] Unit tests on logic + integration tests on I/O; `pnpm test` green.
- [ ] `pnpm lint && pnpm typecheck && pnpm build` green in CI.
- [ ] Swagger decorators on new endpoints; rate-limit tier and RBAC roles declared.
- [ ] Structured logs with `traceId`; Prometheus metric emitted for the new path.
- [ ] Module `README.md` updated; runbook added if it can page someone.
- [ ] Tino approved. Squash-merged. Ticket moved to `Done` by the author, not the reviewer.

---

## 7. Sprint 0 — Foundation & Contracts (21–23 Aug · 3 days)

**Goal:** all 6 engineers running the full stack locally; contracts v0.1 merged and frozen.
**Nothing else matters this sprint.** A team that isn't unblocked on day 3 loses the release.

| ID       | Ticket                                                                                                                                                      | Owner            | Pts | Pri |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | :-: | :-: |
| S0-TN-01 | Monorepo scaffold, workspace graph, `turbo.json`, shared tsconfig/eslint/prettier                                                                           | Tino             |  5  | P0  |
| S0-TN-02 | `@smart/contracts` v0.1: tier/level/track/role enums, attempt & certificate DTOs, all 8 Kafka event payloads                                                | Tino             |  5  | P0  |
| S0-TN-03 | CODEOWNERS, branch protection, PR/issue templates, CI pipeline (lint → typecheck → test → build)                                                            | Tino             |  3  | P0  |
| S0-TN-04 | ADR-0001…0008 recorded (stack, package manager, contract-first, module boundaries, AI failover, tier authority, migration stewardship, rate-limit strategy) | Tino             |  3  | P1  |
| S0-VV-01 | `infra/docker/docker-compose.yml`: Postgres 17+pgvector, Redis 7, Redpanda, MinIO, Mailpit, Prometheus, Grafana, Loki — all healthchecked                   | Vishal V         |  5  | P0  |
| S0-VV-02 | `apps/api-core` NestJS 11 + Fastify bootstrap: validated config, pino, Swagger at `/api/docs`, `/health` + `/ready`                                         | Vishal V         |  5  | P0  |
| S0-VV-03 | Prisma 7 schema v1 — all 14 tables from `ARCHITECTURE.md` §5 + pgvector column; first migration applied                                                     | Vishal V         |  5  | P0  |
| S0-VV-04 | `scripts/bootstrap.sh` — one command to a working local env; documented in README                                                                           | Vishal V         |  3  | P0  |
| S0-SV-01 | `packages/ui` scaffold: Tailwind 4 tokens, dark theme, `Button`/`Card`/`Badge`/`TierBadge`                                                                  | Satheswaran V    |  5  | P0  |
| S0-SV-02 | Four Next.js 16 apps scaffolded on shared config, consuming `@smart/ui`, rendering a live `/health` probe                                                   | Satheswaran V    |  5  | P0  |
| S0-SV-03 | `packages/api-client`: typed fetch wrapper + TanStack Query provider + 401 silent refresh + 429 backoff                                                     | Satheswaran V    |  3  | P1  |
| S0-VB-01 | `apps/api-core` module skeletons for `assessment`, `certificate`, `webhooks` with owner headers + Swagger tags                                              | Vishal Bharath R |  3  | P0  |
| S0-VB-02 | `web-verify` + `web-admin` routing shells and layouts                                                                                                       | Vishal Bharath R |  3  | P1  |
| S0-RM-01 | `packages/scoring-engine` Effect.ts scaffold: `assignTier`, `deriveAngoffCutScore`, `cohensKappa`, `cronbachAlpha` with unit tests                          | Ramansh          |  5  | P0  |
| S0-RM-02 | `ai-gateway` skeleton: Anthropic + Google clients behind one interface, keys read from validated config, `/ai/health` reports both providers                | Ramansh          |  5  | P0  |
| S0-VG-01 | `tools/content-pipeline` CLI scaffold + item authoring JSON schema + `validate` command wired into CI                                                       | Vedika G         |  5  | P0  |
| S0-VG-02 | Seed all 10 tracks, 50 competencies (Domains A–E), 50 levels; `catalog` read endpoint returns them                                                          | Vedika G         |  5  | P0  |

**Exit criteria (verified live at review, not asserted):** `git clone && ./scripts/bootstrap.sh && pnpm dev`
brings up 4 web apps + API + infra; `GET /api/v1/catalog/tracks` returns 10 tracks; `pnpm test` green;
contracts v0.1 tagged.

---

## 8. Sprint 1 — Platform Core: Identity, Data & AI Gateway (24–28 Aug · 5 days)

**Goal:** a student logs in via SSO, is enrolled on a track, and receives real items through a
rate-limited API; the AI gateway answers and **provably fails over to Gemini**.

| ID       | Ticket                                                                                                              | Owner            | Pts | Pri |
| -------- | ------------------------------------------------------------------------------------------------------------------- | ---------------- | :-: | :-: |
| S1-VV-01 | 15-min access JWT + HttpOnly `SameSite=Strict` refresh rotation with reuse detection                                | Vishal V         |  5  | P0  |
| S1-VV-02 | RBAC guards + decorators: `SUPER_ADMIN`, `INSTITUTION_ADMIN`, `PLACEMENT_STAFF`, `STUDENT`, `PUBLIC`                | Vishal V         |  3  | P0  |
| S1-VV-03 | Supabase OAuth (Google, GitHub) + SAML 2.0/OIDC institutional SSO with domain→institution mapping                   | Vishal V         |  8  | P0  |
| S1-VV-04 | Redis sliding-window + token-bucket Lua guard; `X-RateLimit-*` + `Retry-After`; 429 body per §4.2                   | Vishal V         |  5  | P0  |
| S1-VV-05 | Full endpoint throttle matrix from `ARCHITECTURE.md` §4.4 as declarative config                                     | Vishal V         |  3  | P0  |
| S1-VV-06 | B2B `X-SMART-API-KEY` auth + per-key quota (500/hour) + key issuance admin API                                      | Vishal V         |  5  | P1  |
| S1-VV-07 | Kafka producer/consumer base + outbox pattern + DLQ; all 8 topics registered from contracts                         | Vishal V         |  5  | P0  |
| S1-SV-01 | Student auth flow UI: SSO buttons, institution picker, track enrollment wizard                                      | Satheswaran V    |  5  | P0  |
| S1-SV-02 | Student dashboard shell: level stepper, tier trail, next-action card                                                | Satheswaran V    |  5  | P0  |
| S1-SV-03 | `packages/ui` v1: `TierTrail`, `ConfidenceNote`, `LevelStepper`, `Timer`, `CodeEditor` shell, `AudioRecorder` shell | Satheswaran V    |  8  | P0  |
| S1-VB-01 | `POST /assessment/start` — attempt row + Redis session + level unlock gate (Bronze-or-above)                        | Vishal Bharath R |  5  | P0  |
| S1-VB-02 | `GET /assessment/next-item` from `items:form:*` warm cache, < 50 ms, zero DB hit                                    | Vishal Bharath R |  5  | P0  |
| S1-VB-03 | `POST /assessment/submit-l1` draft write-through to Redis + 5 s batch flush to Postgres                             | Vishal Bharath R |  5  | P0  |
| S1-VB-04 | Admin console: institutions, users, role assignment                                                                 | Vishal Bharath R |  3  | P1  |
| S1-RM-01 | `ai-gateway`: Redis token bucket 200 RPM / 10k TPM + 3 priority queues (P1 reserves 40 %)                           | Ramansh          |  8  | P0  |
| S1-RM-02 | Circuit breaker → Gemini 2.5 on 429/5xx/timeout, with an integration test that forces the failover                  | Ramansh          |  5  | P0  |
| S1-RM-03 | pgvector store + embedding service for competency blueprints, BARS anchors, JD vectors                              | Ramansh          |  5  | P0  |
| S1-RM-04 | `claude_evaluation_audits` write on every call: tokens, model, latency, cost, provider used                         | Ramansh          |  3  | P0  |
| S1-VG-01 | Item banks for the 2 validated-lead tracks (MBA Finance, Business Analytics): 40 items each, weighted               | Vedika G         |  8  | P0  |
| S1-VG-02 | `calibration`: panel CRUD, Angoff estimate capture, cut-score derivation (μ ± σ) and publish                        | Vedika G         |  8  | P0  |
| S1-VG-03 | `catalog` parallel-form selector + exposure tracking + item retirement flag                                         | Vedika G         |  5  | P0  |
| S1-VG-04 | `content-pipeline embed` — pushes BARS anchors and competency text into pgvector                                    | Vedika G         |  3  | P1  |

**Exit criteria:** SSO login works end to end; an L1 attempt starts and serves items under 50 ms;
a flood test returns 429 with correct headers; killing the Anthropic key still returns a graded
result via Gemini; Finance + Business Analytics have published cut scores in the DB.

---

## 9. Sprint 2 — Assessment Delivery & AI Evaluation (29 Aug – 2 Sep · 5 days)

**Goal:** a student completes L1→L5 and receives a calibrated tier per level, BARS-graded, κ tracked.
**This is the highest-risk sprint. Protect it — no scope added after planning.**

| ID       | Ticket                                                                                                       | Owner            | Pts | Pri |
| -------- | ------------------------------------------------------------------------------------------------------------ | ---------------- | :-: | :-: |
| S2-VV-01 | Docker sandbox runner: non-networked, 256 MB / 1 CPU / 5 s, ephemeral, seccomp profile                       | Vishal V         |  8  | P0  |
| S2-VV-02 | SQL executor against a throwaway schema with statement timeout + row cap                                     | Vishal V         |  5  | P0  |
| S2-VV-03 | BullMQ queues + workers entrypoint: `sandbox_execution`, `audio_evaluation`, `pdf_generation` with retry/DLQ | Vishal V         |  5  | P0  |
| S2-VV-04 | Event-driven Redis invalidation on `smart.assessment.submitted` / `smart.track.updated`                      | Vishal V         |  3  | P0  |
| S2-VV-05 | Prometheus metrics + Grafana dashboards: latency, 429s, queue depth, AI token spend                          | Vishal V         |  5  | P1  |
| S2-SV-01 | L1 MCQ player: server-authoritative timer, autosave, resume-after-refresh, auto-submit on expiry             | Satheswaran V    |  8  | P0  |
| S2-SV-02 | L2 code/SQL workspace: editor, run against sandbox, poll `job_id`, render results                            | Satheswaran V    |  8  | P0  |
| S2-SV-03 | L3 recorder: MediaRecorder, VAD indicator, presigned direct-to-R2 upload, retry                              | Satheswaran V    |  5  | P0  |
| S2-SV-04 | L4 defense UI: turn-based chat with the simulation, per-turn timer                                           | Satheswaran V    |  5  | P0  |
| S2-SV-05 | L5 capstone submission: file/repo-URL upload, checklist preview, presentation link                           | Satheswaran V    |  3  | P1  |
| S2-VB-01 | Server-authoritative timer service + auto-submit on expiry (client clock is never trusted)                   | Vishal Bharath R |  5  | P0  |
| S2-VB-02 | `POST /assessment/complete` → emit `smart.assessment.submitted`, close session                               | Vishal Bharath R |  3  | P0  |
| S2-VB-03 | L2/L3/L4/L5 submission handlers routing to the right async queue                                             | Vishal Bharath R |  8  | P0  |
| S2-VB-04 | Integrity event log + `integrity_flag` state machine; flagged attempt blocks certificate issuance            | Vishal Bharath R |  5  | P0  |
| S2-VB-05 | `GET /evaluation/results/:attempt_id` — itemized breakdown, < 80 ms                                          | Vishal Bharath R |  3  | P0  |
| S2-RM-01 | L3 BARS mode-consensus grader: transcript → anchors → structured JSON tier + justification                   | Ramansh          |  8  | P0  |
| S2-RM-02 | L4 interactive defense simulation: stateful multi-turn, follow-up depth probing, P1 queue                    | Ramansh          |  8  | P0  |
| S2-RM-03 | L5 split scoring: 50 % checklist auto-check + 30 % rubric + 20 % presentation                                | Ramansh          |  5  | P0  |
| S2-RM-04 | Cohen's κ monitor vs. human-rated hold-out; **auto-pause automated scoring below κ 0.65**                    | Ramansh          |  5  | P0  |
| S2-RM-05 | `smart.eval.completed` producer with full itemized payload                                                   | Ramansh          |  3  | P0  |
| S2-VG-01 | Item banks for the 5 IT tracks: 30+ items each, Domains A–E weighted                                         | Vedika G         |  8  | P0  |
| S2-VG-02 | Item banks for the 3 newer MBA tracks (Marketing, Operations, HR)                                            | Vedika G         |  5  | P1  |
| S2-VG-03 | BARS anchor sets (Gold/Silver/Bronze) for every L3/L4 competency across 10 tracks                            | Vedika G         |  8  | P0  |
| S2-VG-04 | Golden evaluation set + regression runner so a prompt change proves it didn't degrade grading                | Vedika G         |  5  | P0  |
| S2-VG-05 | Cronbach's α / KR-20 per level per track; auto-downgrade confidence note below 0.70                          | Vedika G         |  5  | P0  |

**Exit criteria:** one candidate walks L1→L5 on a live track and gets 5 tiers with confidence bands;
κ is recorded and the auto-pause has been demonstrated by forcing κ below threshold; the golden
regression suite runs in CI.

---

## 10. Sprint 3 — Placement Overlay, Certificates & Dashboards (3–6 Sep · 4 days)

**Goal:** a TPO uploads a JD, gets a matched shortlist, and sees cohort readiness; a completed
track issues a certificate.

| ID       | Ticket                                                                                              | Owner            | Pts | Pri |
| -------- | --------------------------------------------------------------------------------------------------- | ---------------- | :-: | :-: |
| S3-VV-01 | Kong/edge gateway config, TLS termination, Cloudflare rules, waiting-room mode                      | Vishal V         |  5  | P0  |
| S3-VV-02 | DB index & query optimisation pass on the hot paths (attempts, items, verify)                       | Vishal V         |  5  | P0  |
| S3-VV-03 | Helm chart + K8s manifests for api-core, workers and the 4 web apps                                 | Vishal V         |  5  | P1  |
| S3-VV-04 | Rate-limit override admin API + Redis failure fallback to local leaky bucket                        | Vishal V         |  3  | P1  |
| S3-SV-01 | TPO cohort readiness dashboard: Gold/Silver/Bronze per track, trend, drill-down                     | Satheswaran V    |  8  | P0  |
| S3-SV-02 | Shortlist table: filters, match-score column, explainability drawer, CSV/PDF export                 | Satheswaran V    |  8  | P0  |
| S3-SV-03 | JD upload UI with parse preview and threshold editor                                                | Satheswaran V    |  5  | P0  |
| S3-SV-04 | Student growth portal: itemized gap feedback, competency radar, retest scheduler                    | Satheswaran V    |  5  | P0  |
| S3-VB-01 | Certificate issuance: Tier Trail JSON, headline tier, verification UUID, `smart.certificate.issued` | Vishal Bharath R |  8  | P0  |
| S3-VB-02 | Puppeteer PDF render → R2 via BullMQ; signed SHA-256 dynamic QR                                     | Vishal Bharath R |  5  | P0  |
| S3-VB-03 | Outbound HMAC-SHA256 webhook dispatcher: registry, signing, retry, DLQ, replay                      | Vishal Bharath R |  5  | P0  |
| S3-VB-04 | Admin integrity review queue: approve/deny certificate release on flagged attempts                  | Vishal Bharath R |  3  | P1  |
| S3-RM-01 | JD NLP parse → structured threshold vector (`required_track`, `min_thresholds`)                     | Ramansh          |  8  | P0  |
| S3-RM-02 | pgvector cosine match + rule filters + deterministic ranking                                        | Ramansh          |  8  | P0  |
| S3-RM-03 | Match explainability payload — why this candidate, which threshold, which gap                       | Ramansh          |  3  | P1  |
| S3-RM-04 | Confidence-band + Cronbach's α calculator wired into `certificate` issuance                         | Ramansh          |  5  | P0  |
| S3-VG-01 | Shortlist generation service + CSV/PDF export backend                                               | Vedika G         |  5  | P0  |
| S3-VG-02 | `placement_records` outcome ingestion (interview/offer) + TPO entry UI contract                     | Vedika G         |  5  | P0  |
| S3-VG-03 | Analytics: cohort readiness aggregates, batch gap report, correlation by tier                       | Vedika G         |  8  | P0  |
| S3-VG-04 | Calibration employer credits surfaced for the verification page                                     | Vedika G         |  3  | P1  |

**Exit criteria:** JD in → shortlist out with explainable scores; certificate issued with a real
Tier Trail and a PDF in R2; TPO dashboard shows live cohort numbers.

---

## 11. Sprint 4 — Public Verification & Edge Hardening (7–8 Sep · 2 days)

**Goal:** an employer verifies a certificate publicly in < 80 ms behind the edge gateway, and
everything is integrated into one release candidate. **Code freeze 8 Sep 23:59 IST.**

| ID       | Ticket                                                                                             | Owner            | Pts | Pri |
| -------- | -------------------------------------------------------------------------------------------------- | ---------------- | :-: | :-: |
| S4-VB-01 | `GET /verify/:certificate_id` public endpoint, Redis-cached, IP-throttled 20/min                   | Vishal Bharath R |  5  | P0  |
| S4-VB-02 | `web-verify` page: Tier Trail matrix, confidence note, calibration credits, QR validator, ISR      | Vishal Bharath R |  8  | P0  |
| S4-VB-03 | Certificate PDF download via direct R2 signed URL                                                  | Vishal Bharath R |  3  | P0  |
| S4-VV-01 | Edge gateway rate-limit tuning + Cloudflare DDoS rules + SSL termination verified                  | Vishal V         |  5  | P0  |
| S4-VV-02 | Release candidate assembly: all services wired, one `docker compose -f prod` up, smoke suite green | Vishal V         |  8  | P0  |
| S4-SV-01 | Student certificate share view: link, QR, social preview, privacy toggle                           | Satheswaran V    |  5  | P0  |
| S4-SV-02 | Playwright E2E: auth → L1–L5 → certificate → public verification                                   | Satheswaran V    |  8  | P0  |
| S4-RM-01 | AI cost & quota dashboard; hard monthly spend ceiling with graceful degradation                    | Ramansh          |  3  | P1  |
| S4-VG-01 | Confidence-note copy finalised per track from real α and sample size                               | Vedika G         |  3  | P0  |
| S4-TN-01 | **Code freeze, `release/2026-09-10` cut, changelog, release notes**                                | Tino             |  3  | P0  |

**Exit criteria:** the full E2E Playwright journey passes on the release candidate. Freeze signed
off by Tino. After this point only `fix/` branches targeting `release/2026-09-10` are accepted.

---

## 12. Sprint 5 — Testing, QA, Security & Load ONLY (9–10 Sep · 2 days)

> **HARD MANDATE:** zero feature merges. Every commit in this sprint is a test, a fix for a
> failing test, a performance fix, or a security fix. This is inherited from `ARCHITECTURE.md`
> §15 and enforced by the `no-feature-after-freeze` CI check.

| ID        | Focus                                                                 | Success criterion                                                    | Owner            | Pri |
| --------- | --------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------- | :-: |
| S5-VV-01  | 1M-scale load test (k6/Locust, 50 k concurrent sessions)              | p95 < 200 ms on sync endpoints, zero 5xx                             | Vishal V         | P0  |
| S5-VV-02  | Rate-limiter stress at 100 k req/min                                  | 100 % correct 429s, headers accurate, no Redis OOM                   | Vishal V         | P0  |
| S5-VV-03  | Redis / Kafka / DB failure drills                                     | Documented graceful degradation, no candidate data loss              | Vishal V         | P0  |
| S5-SV-01  | E2E regression across all 4 web apps + a11y audit                     | Playwright suite green, WCAG 2.1 AA on the player                    | Satheswaran V    | P0  |
| S5-SV-02  | Frontend performance                                                  | Lighthouse ≥ 90 on `web-verify` and student dashboard                | Satheswaran V    | P1  |
| S5-VB-01  | OWASP Top 10 audit: SQLi, XSS, CSRF, JWT tampering, IDOR on `/verify` | Zero high/critical findings                                          | Vishal Bharath R | P0  |
| S5-VB-02  | Trust-chain integrity tests                                           | Flagged attempt can never yield a certificate; QR signature verifies | Vishal Bharath R | P0  |
| S5-RM-01  | AI failover & degradation drill                                       | Anthropic 429 + outage → Gemini within SLA, zero lost submissions    | Ramansh          | P0  |
| S5-RM-02  | Scoring determinism & golden regression                               | Same input → same tier; goldens pass; κ ≥ 0.65                       | Ramansh          | P0  |
| S5-VG-01  | Pilot institution UAT (1 cohort, 50 students)                         | Angoff cut scores validated against real performance                 | Vedika G         | P0  |
| S5-VG-02  | Content audit across 10 tracks                                        | No orphan items, no missing anchors, α recorded per track            | Vedika G         | P0  |
| S5-TN-01  | Release readiness review + **GA tag `v1.0.0`**                        | All P0 closed, DoD satisfied, sign-off recorded                      | Tino             | P0  |
| S5-ALL-01 | P1/P2 bug burn-down                                                   | Zero open P0/P1 bugs at 16:00 on 10 Sep                              | All              | P0  |

**GA gate — every line must be true at 16:00 IST on 10 Sep, or we ship a reduced scope, not a broken product:**

- [ ] All `P0-blocker` tickets `Done`.
- [ ] Zero open P0/P1 defects.
- [ ] Load test passed at 50 k concurrency, p95 < 200 ms.
- [ ] OWASP audit: no high/critical.
- [ ] AI failover drill passed.
- [ ] At least 2 tracks with published, panel-validated cut scores and α ≥ 0.70.
- [ ] Public verification live and correct.
- [ ] Runbooks published for every pageable failure mode.
- [ ] Tino's written release sign-off in `docs/delivery/RELEASE_SIGNOFF.md`.

---

## 13. Risk Register (reviewed at every standup, not just at planning)

| #   | Risk                                                  | Impact                 | Owner    | Mitigation                                                                                                              |
| --- | ----------------------------------------------------- | ---------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| R1  | **Item banks late** → nothing to grade in Sprint 2    | Release-blocking       | Vedika G | 2 lead tracks fully done in Sprint 1; remaining 8 tracks parallelised; Ramansh assists on generation with human review. |
| R2  | **Cut scores unvalidated** → tiers not defensible     | Product credibility    | Vedika G | Panels booked during Sprint 0; provisional cut scores allowed only with a downgraded confidence note.                   |
| R3  | **Anthropic rate limits / outage**                    | Assessment stalls      | Ramansh  | Gemini failover proven in Sprint 1 (S1-RM-02), submissions queue in BullMQ, never dropped.                              |
| R4  | **21-day runway is genuinely tight**                  | Scope loss             | Tino     | Ranked P0/P1/P2; P2 dropped without ceremony; scope reduction decided at the Sprint 3 review, not on 9 Sep.             |
| R5  | **Migration collisions** with 5 devs on one schema    | Lost dev hours         | Vishal V | Single schema steward; all migrations via his PR; forward-only.                                                         |
| R6  | **Contract churn** breaking integrations              | Rework we can't afford | Tino     | Contracts frozen per sprint; changes only at the 17:00 board with all consumers notified in the PR.                     |
| R7  | **Sandbox escape / abuse**                            | Security incident      | Vishal V | Non-networked containers, seccomp, hard caps, 10 runs/min throttle, OWASP audit in Sprint 5.                            |
| R8  | **κ below 0.65** → automated scoring unusable         | Feature loss           | Ramansh  | Auto-pause + human-rater fallback path; golden set expanded in Sprint 2.                                                |
| R9  | **Single points of knowledge** (one owner per module) | Bus factor 1           | Tino     | Module READMEs mandatory; Tino reviews everything so at least 2 people understand every module.                         |
| R10 | **Sprint 4/5 are only 2 days each**                   | No slack for surprises | Tino     | P2 pre-emptively cut from Sprint 3 onward; Sprint 3 carries the buffer.                                                 |

---

## 14. Scope Reduction Ladder (decided in advance, applied without debate)

If we are behind at the **Sprint 3 review (6 Sep)**, cut in exactly this order:

1. 3 newer MBA tracks (Marketing, Operations, HR) → ship 7 tracks, not 10.
2. L4 interactive defense → fall back to L3-style recorded defense graded by BARS.
3. B2B API keys and outbound webhooks → institutional ERP integration moves to post-GA.
4. `web-admin` advanced features → keep only user management and integrity review.
5. Match explainability drawer → keep the score, drop the reasoning UI.
6. L5 capstone → defer; certificate headline caps at L4.

**Never cut:** auth, rate limiting, L1/L2/L3 delivery, tier assignment against calibrated cut
scores, certificate issuance, public verification, the confidence note. Those six are the product.

---

_Owner: Tino (System Architect / Release Manager). This plan is reviewed at every sprint review
and is the only authority on sprint scope._
