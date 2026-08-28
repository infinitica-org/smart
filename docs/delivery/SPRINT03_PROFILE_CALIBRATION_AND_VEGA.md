# Sprint 03 — Profile Calibration & VEGA (AI Interview Layer)

> **Status:** Proposal for Architecture Review Board sign-off (Tino). This document does not
> override `docs/delivery/AGILE_PLAN.md` — it is an **addendum** that slots into the existing
> Sprint 2 / Sprint 3 windows and needs the same governance (contract PR + ADR) as any other
> scope change, per `TEAM.md` §4.1 and `AGILE_PLAN.md` §13 (Risk Register, R6).
> **Author context:** dev@infinitica.com · **Written:** 2026-08-28
> **Reconciles with:** `TEAM.md`, `ARCHITECTURE.md`, `docs/delivery/AGILE_PLAN.md`,
> `docs/Smart-Level-Tier.md`, and the uploaded research note
> `SMART_ORION_VEGA_Research_and_Sprint03_Plan.md` (Alignerr + Superset flow research).

---

## 0. Read this first — the one finding that changes everything below

Before designing anything new, I checked what SMART already has, because the worst outcome here
is building a second AI-interview stack next to one that already half-exists.

**SMART already has the core of an AI interviewer. It's called L4.**

Sprint 2 (currently in flight, `S2-RM-02`, owner Ramansh) already builds: *"L4 interactive
defense simulation: stateful multi-turn, follow-up depth probing, P1 queue."* Sprint 2
(`S2-SV-04`, owner Satheswaran) already builds: *"L4 defense UI: turn-based chat with the
simulation, per-turn timer."* The κ-based auto-pause (`COHENS_KAPPA_FLOOR = 0.65`,
`packages/contracts/src/domain/enums.ts`) already routes low-confidence automated scores away
from silent auto-publish. The `LLM_BARS` / `HUMAN_RATER` / `HYBRID` evaluator split already
exists in the `Evaluator` enum.

That is, almost word for word, the Alignerr "Zara" mechanic and the "LLM-as-judge +
human-review-on-low-confidence" pattern the research doc asks for. **VEGA is not a new subsystem.
It is L4's engine, repointed at a different, earlier, broader question — with its own name because
it gets reused in more places than L4 does.** Every module owner below extends a module they
*already own*; nobody is handed a brand-new shared service to build from zero. That is what makes
"no one blocks anyone" true here, not a wish.

---

## 1. The four actors, mapped onto what already exists

| Actor (your naming) | SMART's existing role | Where it lives today | Gap for this sprint |
|---|---|---|---|
| **Super Admin** | `SUPER_ADMIN` (`UserRole` enum) | `web-admin` (Vishal Bharath R) | Needs a VEGA rubric/weight publish step + the Expert Review Queue extended (§7) |
| **Academia** | `INSTITUTION_ADMIN` (TPO) + `PLACEMENT_STAFF` | `web-tpo` (Satheswaran V) | Needs cohort-level VEGA coverage + anomaly-flag visibility (§7) |
| **Candidate** | `STUDENT` | `web-student` (Satheswaran V) | Needs the VEGA interview player + "what changed" explainer (§7) |
| **Company** | **Does not fully exist yet** — today: `B2B_PARTNER` (API key) + unauthenticated `PUBLIC` on `verify.smart.com` | `web-verify` (Vishal Bharath R), `matching` (Ramansh) | This is the one real gap. See §6. |

**Important, and worth saying plainly to the team:** three of your four actors are not new — they
are RBAC roles that already exist and already have an owner and a home app. Only "Company" needs
new surface area, and even that reuses `matching` + `web-verify` rather than a new app. This alone
is why a module-wise, non-blocking Sprint 03 is realistic in 7 days — most of the "modules" are
extensions to code someone already owns and already ships against.

---

## 2. L1–L5, stated once, clearly, as they exist in this codebase today

(Source: `ARCHITECTURE.md` §6, `docs/Smart-Level-Tier.md`, `packages/contracts/src/domain/enums.ts`.
This is not the abstract "ORION 5-level" framing from the research note — this is the literal
`LevelFormat` enum your API ships today: `MCQ | SANDBOX | AUDIO_BARS | DEFENSE | CAPSTONE`.)

| Level | Name | Tests | Format today | Scored by | Unlock gate |
|---|---|---|---|---|---|
| **L1** | Foundation Knowledge | Do you know the right concept/number | `MCQ` — MCQ/numeric-entry, item-bank | `AUTO_MCQ` / `AUTO_NUMERIC`, weighted by competency | none — entry level |
| **L2** | Applied / Programming | Can you apply it in a realistic scenario | `SANDBOX` — Docker code exec, SQL exec | `SANDBOX_CHECK` + rubric | L1 ≥ Bronze |
| **L3** | Communication & Domain Intelligence | Can you articulate and reason about the domain | `AUDIO_BARS` — **one recorded spoken answer**, graded by BARS mode-consensus | `LLM_BARS` (Claude 5 Sonnet), κ-monitored | L2 ≥ Bronze |
| **L4** | Verification Defense | Can you defend and own *your specific submitted work* | `DEFENSE` — live/simulated multi-turn chat, follow-up depth probing | `LLM_BARS` (Claude 5 Sonnet), P1 real-time queue, κ-monitored | — |
| **L5** | Project Execution | Can you produce the actual deliverable | `CAPSTONE` — upload + checklist | 50% checklist / 30% rubric / 20% presentation | — |

**Tier** (Gold/Silver/Bronze/Below-Bronze) is always relative to a calibrated cut score *for that
specific level*, never a raw percentage (`docs/Smart-Level-Tier.md` §3). This doesn't change in
this proposal — nothing below touches L1, L2, tier math, or certificate issuance logic. Per
`AGILE_PLAN.md` §14 ("Never cut: ... L1/L2/L3 delivery, tier assignment ... certificate issuance"),
this proposal is additive to L3, not a replacement of the level system.

**The one honest gap today:** L3 is a *single take, single recording, single grade*. There is no
live back-and-forth, no adaptivity to what the candidate just said, and no mechanism to steer
toward a candidate's weak spots before spending an expensive LLM call grading them. That gap is
exactly what Alignerr's Zara interview and Superset's "Voice Assessment" step are evidence you
should close — and it's the actual question you asked.

---

## 3. The answer: hybrid, not either/or — and here's precisely why

**Recommendation: L3 becomes two sequential sub-stages. Neither replaces an assessment; together
they replace the single-shot recording.**

```
Candidate reaches L3 (L2 cleared ≥ Bronze)
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ L3-A · Micro-Calibration Check  (NEW, cheap, ~5–8 min)       │
│   • 5–8 adaptive items, pulled from existing item-bank infra │
│     tagged narrowly to this track's Domain E competencies    │
│   • Reuses `catalog` + `assessment` delivery — no new infra  │
│   • Purpose: calibrate depth, flag bluffing/guessing patterns,│
│     and tell VEGA which competencies to probe harder         │
└───────────────────────────┬───────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ L3-B · VEGA AI Interview  (NEW `AI_INTERVIEW` LevelFormat)   │
│   • Multi-turn, adaptive, branches on L3-A weak spots         │
│     AND on the candidate's own live answers                  │
│   • Same engine class as L4's interactive defense simulation │
│     (Ramansh, `evaluation` module) — different prompt set,    │
│     broader competency coverage, not ownership-of-work        │
│   • Scored: LLM_BARS against expert-vetted rubrics            │
│   • κ < 0.65 on this item → routes to Expert Review Queue,    │
│     exactly like today's automated-scoring auto-pause         │
└───────────────────────────┬───────────────────────────────────┘
                            ▼
              Structured Interview Evidence Record
     (transcript + per-competency score + confidence + reviewer notes)
                            │
                ┌───────────┴────────────┐
                ▼                        ▼
     L3 tier → Profile Calibration   L4 Evidence Verification
     (feeds certificate Tier Trail)  (this record IS evidence)
```

### Why not interview-only
Loses the fast, cheap, cross-cohort-comparable signal that Academia's Phase-1 benchmark reports
need, and burns an expensive live LLM turn on candidates who are obviously unprepared — exactly
the cost problem Alignerr's own funnel (screening → assessment → interview, in that order, not
interview-first) is solving for.

### Why not assessment-only
A recorded single answer cannot follow up, cannot catch a rehearsed non-answer, and is not what
convinces a hiring manager — this is the actual gap Superset's employers are already closing with
their own "Voice Assessment" + "Business Discussion" stages for Wipro, and it's the reason
Alignerr's funnel has *technical interviews* as its final, highest-trust gate, not its MCQ stage.

### Why this doesn't conflict with the "L1/2/3 never cut" rule
Nothing about L1 or L2 changes. L3 doesn't stop being an assessment — it becomes a *better*
assessment: a short calibration test that makes an interview efficient, feeding into an interview
that makes the calibration meaningful. This is additive engineering on a level the plan already
protects, not new scope competing with protected scope.

### The distinction that keeps L3 and L4 from overlapping (important — write this into the rubric docs)
- **L3 (VEGA):** *"Do you understand this domain, in general, well enough to reason about it out
  loud?"* — broad, competency-driven, can run before any specific work exists.
- **L4 (Defense):** *"Did you actually do the work you submitted, and do you understand your own
  choices in it?"* — narrow, artifact-driven, always about a specific L2/L5 submission.

They share an engine. They never share a question bank or a purpose. Keep that line in the
`packages/prompts` README so nobody blurs it six months from now.

---

## 4. VEGA — naming and reuse (confirming and finalizing the research note's recommendation)

**Name: VEGA.** Keeping the research note's rationale because it's the right one: Vega is the
bright star visually paired with Orion — clean paired-branding logic with SMART's own ORION
concept (ORION defines what the market needs; VEGA proves who can deliver it), short, easy to say
in a pitch, easy to trademark. Reject "ARIA" (reads as a support bot, not an evaluator) and
"SIRIUS" (strong story, weaker as a standalone product name candidates and companies will repeat).

**One-line pitch, reusable in a company deck:** *"We didn't just show you her profile — VEGA
interviewed her specifically against your job's requirements."*

**Where VEGA is invoked (same engine, different prompt/context, never a different product):**

| Context | Trigger | Question source | Result goes to |
|---|---|---|---|
| **L3 Profile-Building Interview** | Candidate reaches L3 with L2 ≥ Bronze | Generic domain competency bank (`catalog`) | L3 tier → certificate Tier Trail |
| **L3 Opportunity Re-Interview** | Company posts a role and a required competency has no confident L3 evidence (§6) | Role-specific competencies from the live JD parse (`matching`) | Sent to the Company with the profile, as fresh role-targeted proof |
| **Drill completion re-check** (post-MMP) | Candidate completes a targeted remediation Drill | The single weak competency the Drill targeted | Recalibrates that one competency, not the whole L3 score |
| **L4 Defense** | Not VEGA by name — same underlying engine class, different prompt family, kept namespaced separately (§3) | The candidate's own submitted artifact | L4 tier |

---

## 5. Company actor — closing the one real gap (Alignerr's Zara rule, applied)

Today, `web-verify` is public and unauthenticated; `B2B_PARTNER` gets API-key access; there is no
logged-in "Company" experience. Building a full Company portal (auth, RBAC role, dashboards) in a
7-day MMP window is the wrong bet — it's exactly the kind of net-new authenticated surface that
creates the most integration risk this late in a fixed-date release. So this proposal is
deliberately two-speed:

**MMP (ships by Sept 5) — link-based, zero new auth:**
1. A Company uploads a JD through the existing JD-upload flow (`S3-SV-03`, owner Satheswaran) —
   this already exists in Sprint 3 scope, unchanged.
2. `matching` (Ramansh, `S3-RM-01`/`S3-RM-02`, unchanged) parses it into a threshold vector and
   ranks candidates — unchanged.
3. **New rule, in `matching`/`placement`:** for each shortlisted candidate, for each *required*
   competency in the JD's threshold vector, check whether that candidate has a `CLEAN`,
   sufficiently-confident (κ-passed) L3 evidence record for it. If not → enqueue a VEGA
   Opportunity Re-Interview request (`smart.vega.interview_requested`, mirroring the existing
   `smart.eval.requested` pattern) before that candidate appears on the *final* shortlist.
4. The shortlist/verification surface the Company already reaches — a **signed, expiring link**
   off the existing `verify.smart.com` infra (Vishal Bharath owns `web-verify`) — shows the
   profile, tier trail, and (once complete) the VEGA transcript/score package. No password, no
   new role, no new app. This is the same trust model `verify.smart.com/cert/<uuid>` already uses,
   extended with a signed token instead of a public UUID for the pre-offer role-fit view.

**Phase 2 (post-MMP bug-fix/feature sprint) — a real `COMPANY` role:**
Add `COMPANY` to `UserRole`/`UserRole` enum (contracts PR, Tino), a lightweight authenticated
portal (could live inside `web-admin`'s app shell as a scoped role rather than a fifth Next.js
app — cheaper to ship, consistent with "vertical slices only"), self-serve JD management, and a
dashboard over multiple hiring drives. Do not build this before Sept 5 — it is exactly the kind of
scope `AGILE_PLAN.md` §14's reduction ladder exists to protect against.

---

## 6. Profile Calibration — module map, assigned to the real team, contract-first

**Design principle (unchanged from the research note, now made concrete):** every module below is
an **extension of a module someone already owns** in `TEAM.md` §3. Nobody is asked to build a new
shared service from zero, and no two people ever write to the same table. Cross-module
communication is Kafka events only, exactly as `TEAM.md` §4.4 already mandates for every other
seam in this codebase.

| # | Module (extends existing ownership) | Owner | What's genuinely new | Publishes | Consumes |
|---|---|---|---|---|---|
| A | `catalog` — competency targeting for L3-A/L3-B | **Vedika G** | Tag Domain-E competencies as "micro-calibration eligible"; expose `getInterviewCompetencyMap(trackId)` | — | — |
| B | `evaluation` — VEGA Interview Engine | **Ramansh** | `vega-interview.service.ts`, forked from the existing L4 defense simulation pattern; new prompt family in `packages/prompts` (`vega-interview-v1`) | `smart.vega.interview_requested`, `smart.vega.interview_completed` | `smart.assessment.submitted` (L3-A result) |
| C | `calibration` + `scoring-engine` — tier math | **Vedika G** (calibration) / **Ramansh** (scoring-engine) | Accept VEGA's per-competency score as an evidence input alongside the existing L3 assessment score; no change to Angoff cut-score mechanics | `calibration.completed` (reuses existing `smart.track.updated` pattern) | `smart.vega.interview_completed` |
| D | `certificate` — Profile Store / Tier Trail | **Vishal Bharath R** | Extend `tier_trail_json` read model to link the VEGA evidence record id per level; add `GET /profile/:id/calibration-history` (versioned) | — | `calibration.completed` |
| E | `web-student` — Candidate Calibration View | **Satheswaran V** | VEGA interview entry point + chat UI (shared component, see below) + "what changed and why" explainer on the existing growth portal (`S3-SV-04`) | — | Module D read API |
| F | `web-tpo` — Academia Cohort Dashboard | **Satheswaran V** (UI) / **Vedika G** (aggregation) | Add VEGA-coverage and confidence-flag columns to the existing cohort readiness dashboard (`S3-SV-01`) | — | Module D + `analytics` |
| G | `web-verify` + `matching` — Company Role-Fit link | **Vishal Bharath R** (surface) / **Ramansh** (matching rule + explainability) | Signed-link role-fit view (§5); the "required competency has no evidence → trigger VEGA" rule in `matching` | reuses `smart.placement.matched` | Module D + `matching` explainability (`S3-RM-03`) |
| H | `web-admin` — Super Admin Console | **Vishal Bharath R** (UI) | VEGA rubric/prompt-version publish control (activates a version from `packages/prompts`, never hand-edits a prompt in place) | `weight_config.updated` | `packages/prompts` versions (Ramansh) |
| I | Expert Review Queue | **Vishal Bharath R** (UI, extends existing `S3-VB-04` integrity queue) / **Ramansh** (produces the flag) | Route κ<0.65 VEGA scores into the *same* review queue UI, tagged `VEGA_LOW_CONFIDENCE` distinct from `INTEGRITY_FLAG` | `override.applied` | `smart.vega.interview_completed` (low-confidence flag) |

**Why this can't deadlock:** every row's owner already owns the file paths involved per
`TEAM.md` §3. Nobody needs review-and-merge access into someone else's module — the only shared
surface is `packages/contracts` (new enum member, two new Kafka payloads, one new DTO), which goes
through the existing contract-first flow (`TEAM.md` §4.1): open the PR day 1, Tino merges same day
at the 17:00 board, everyone implements in parallel against the merged type.

**Net-new schema (Vishal V, schema steward, single migration):**
```
LevelFormat enum  += AI_INTERVIEW

model VegaInterviewSession {
  id               String   @id @default(uuid())
  attemptId        String   // FK -> Attempt (the L3 attempt this belongs to)
  context          String   // 'PROFILE_BUILDING' | 'OPPORTUNITY_REINTERVIEW' | 'DRILL_RECHECK'
  jdId             String?  // set only for OPPORTUNITY_REINTERVIEW
  transcriptJson   Json     // full turn-by-turn transcript
  perCompetencyJson Json    // { competencyId: { tier, score, confidence, justification } }
  overallConfidence Float
  reviewStatus     String   // 'AUTO_PUBLISHED' | 'PENDING_REVIEW' | 'REVIEWED'
  createdAt        DateTime @default(now())
}
```
This is one new table, owned by the module that writes it (`evaluation`, Ramansh), read by
`certificate` (Vishal Bharath) and `analytics` (Vedika) — same pattern as every other table in
`ARCHITECTURE.md` §5.

---

## 7. Actor flows for Profile Calibration (what each person actually sees)

**Candidate**
1. Clears L2 ≥ Bronze → L3-A Micro-Calibration unlocks (5–8 items, ~5 min).
2. L3-A completes → L3-B VEGA Interview unlocks, questions steered by L3-A's weak points.
3. VEGA interview completes → candidate sees updated tier + a plain-language "what changed"
   explainer (reuses the existing growth-portal gap-report pattern, `S3-SV-04`).
4. If flagged low-confidence → candidate sees "under review," not a wrong score, until an expert
   clears it (mirrors the existing integrity-review UX already planned for `web-admin`).
5. Post-MMP: candidate can trigger a Drill re-check on one weak competency without redoing all of
   L3.

**Academia (TPO / Placement Staff)**
1. Sees cohort-level VEGA completion rate and tier distribution — no ability to edit an individual
   score (matches the existing "no admin-console tier overrides outside the review queue"
   posture).
2. Can flag an anomaly for Super Admin review; feeds the Phase-1 benchmark report revenue line
   already described in `ARCHITECTURE.md` §14.

**Company**
1. Posts a JD (existing flow, unchanged).
2. Gets a shortlist (existing flow, unchanged) where every candidate's required-but-unevidenced
   competencies have already been through a VEGA Opportunity Re-Interview before the Company ever
   sees the name.
3. Opens a signed role-fit link: profile + tier trail + VEGA transcript/score package. Never a
   bare resume — this is the entire Alignerr insight, applied.

**Super Admin**
1. Publishes/activates VEGA rubric and prompt versions (never hand-edits a live prompt —
   versioned, immutable, exactly as `packages/prompts` already mandates).
2. Runs the Expert Review Queue for anything the κ monitor flagged — human overrides are logged
   events (`override.applied`), never silent overwrites, preserving score history integrity for
   any Company that already saw an earlier version.

---

## 8. Sprint 03 — 7-day plan, module-wise, no blocking

### 8.1 Calendar reconciliation (read before objecting to the dates)

`AGILE_PLAN.md` currently has Sprint 2 ending **Sep 2** and Sprint 3 running **Sep 3 – Sep 6** (4
days). Your ask — a 7-day sprint from **Aug 30 to Sep 5** delivering the MMP, then opening a
bug-fix/feature sprint — compresses official Sprint 3 by one day (Sep 6 → folds into the new
post-MMP sprint, which also absorbs the start of the already-planned Sprint 4 verification work).
**This is a real calendar change and needs Tino's sign-off at the next Architecture Review Board,
same as any other scope change (`AGILE_PLAN.md` §13, R6).** The plan below assumes that sign-off;
if it's not granted, everything in this section still works unmodified inside the existing
Sep 3–6 Sprint 3 window — it just runs 4 days instead of 7, with the Micro-Calibration + VEGA
Interview Engine (rows A–D) prioritized as P0 and rows E–I treated as P1.

### 8.2 Day-by-day (Aug 30 → Sep 5, IST ceremonies unchanged: standup 09:30, board 17:00)

| Day | Vishal V | Satheswaran V | Vishal Bharath R | Ramansh | Vedika G |
|---|---|---|---|---|---|
| **Day 1 — Aug 30** | Reviews + merges the contract PR (new `AI_INTERVIEW` format, `VegaInterviewSession` schema, 2 Kafka payloads) alongside Tino; drafts the migration | Scaffolds VEGA chat UI as a shared `packages/ui` component (`InterviewChat`), forked from the L4 chat UI already in progress | Scaffolds the signed-link role-fit route on `web-verify`; stubs `GET /profile/:id/calibration-history` against a mock | Opens the contract PR; scaffolds `vega-interview.service.ts` against the mocked contract; drafts `vega-interview-v1` prompt | Tags Domain-E competencies as interview-eligible in `catalog`; drafts the L3-A micro-calibration item set (5–8 items × 10 tracks) |
| **Day 2 — Aug 31** | Applies the migration; runs it against every engineer's local stack | Wires `InterviewChat` into `web-student`'s L3 flow (mocked responses) | Wires the role-fit view to mocked profile+match data | Implements the multi-turn VEGA engine logic against real prompt v1; unit tests | Finishes micro-calibration item sets; starts VEGA-aware calibration weighting in `calibration` |
| **Day 3 — Sep 1** | DB index pass on the new `VegaInterviewSession` table's hot read paths | Adds "what changed" explainer + low-confidence "under review" state to `web-student` | Builds the Expert Review Queue's `VEGA_LOW_CONFIDENCE` tab (extends existing `S3-VB-04` queue UI) | Wires `smart.vega.interview_requested` / `completed`; connects κ-monitor auto-pause to the new queue tag | Wires `calibration.completed` → certificate Tier Trail link (Module D groundwork with Vishal Bharath) |
| **Day 4 — Sep 2** *(official Sprint 2 close)* | Infra/observability pass: Grafana panel for VEGA queue depth + AI cost | Connects `web-tpo` cohort dashboard to real VEGA-coverage aggregate (removes mock) | Connects `certificate` profile read API to real data (removes mock) | Implements the `matching` "required competency has no evidence → trigger VEGA" rule (`S3-RM-01`/`02` extension) | Implements cohort VEGA-coverage aggregation query in `analytics` |
| **Day 5 — Sep 3** *(official Sprint 3 opens)* | Edge/rate-limit tuning for the new signed-link role-fit endpoint | Connects `web-student` VEGA player to the real engine end-to-end (removes mock) | Connects Company role-fit link to real `matching` explainability payload (removes mock) | Match explainability payload includes VEGA evidence status per competency (`S3-RM-03`) | Analytics dashboard shows VEGA tier-correlation-by-outcome groundwork for future `CorrelationRecord` use |
| **Day 6 — Sep 4** | Integration pass across the full pipeline with one live track | Full E2E pass: L2 → L3-A → L3-B → tier update, on `dev` | Full E2E pass: JD → shortlist → VEGA trigger → signed link → Company view | Golden-set regression check for VEGA prompts (reuses `S2-VG-04` regression runner, Vedika co-owns) | Confirms Cronbach's α / κ reporting includes VEGA-sourced evidence correctly |
| **Day 7 — Sep 5 (MMP freeze)** | Smoke test, fix P0s only | Demo-ready | Demo-ready, full Expert Review Queue audit trail visible | Demo-ready | Demo-ready |

**Because every track builds against the Day-1 contract, "connect to real data, remove mocks" from
Day 4 onward is a swap, not a rebuild — the same mechanism that already prevents merge pile-ups
elsewhere in this repo (`docs/delivery/AGILE_PLAN.md` §1, point 3).**

### 8.3 What's explicitly out of scope for the Sept 5 MMP (goes to the post-MMP sprint)

- Voice/audio for the VEGA interview (text-first for MMP; audio fingerprinting/VAD integrity work
  mirrors what L3's existing `AUDIO_BARS` already has, so it's a fast follow, not new research).
- A dedicated authenticated `COMPANY` role and portal (§5 — link-based MVP ships now).
- Drill-triggered VEGA re-check (needs the Drill feature itself, which is not in this sprint).
- Academia-side mock-interview/coaching mode (explicitly deferred in the research note too).
- IRT-based adaptive L3-A delivery (needs multi-cohort data, same reasoning as `Smart-Level-Tier.md` §9's IRT deferral for L1).

---

## 9. Open questions carried over (needs a product decision before it's locked)

- [ ] VEGA modality for MVP: confirmed **text-first** in this proposal for the 7-day window — confirm this trade-off is acceptable, given Superset's Wipro example suggests voice is more convincing to companies long-term.
- [ ] Exact rubric authoring format for VEGA per competency — must reuse the same BARS anchor-writing process the calibration panel already uses for L3/L4 (`S2-VG-03`), not a new format.
- [ ] Retake/anti-cheating policy specific to a *conversational* interview (different failure modes than a single recording) — proctoring tier should match L3/L4's existing stakes-based approach (`ARCHITECTURE.md` §13).
- [ ] Data retention/consent for VEGA transcripts shared with Companies via the signed link — needs the same legal review as certificate PDF sharing already gets.
- [ ] Cost/latency modeling for running a multi-turn LLM interview at volume — sizing input for the Expert Review Queue's expected load, and for whether VEGA needs its own AI-gateway priority lane distinct from L4's existing P1 reservation.
- [ ] Formal Architecture Review Board sign-off on the calendar compression in §8.1.

---

*This document extends, and does not replace, `AGILE_PLAN.md`, `TEAM.md`, `ARCHITECTURE.md`, and
`docs/Smart-Level-Tier.md`. Any contract change referenced above still requires a
`@smart/contracts` PR reviewed and merged by Tino, per `TEAM.md` §4.1.*
