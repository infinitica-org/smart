# Architect review — SMART PRD v1 + Sprint 3 (Jobs & Placements)

> **Author:** Tino · **Date:** 28 Aug 2026 · **Audience:** Allen + all six engineers  
> **Frozen pack:** [`docs/product/prd-v1/`](../product/prd-v1/README.md)  
> **ADRs:** [0011](../adr/0011-prd-v1-frozen.md) (freeze) · [0012](../adr/0012-mmp-placement-matching.md) (rules matching)

Allen asked for an architect read of the final PRD. Vishal V was asked to own matching and the Jobs & Placements outcome path, and to help Vishal Bharath on skill verification. This note is that review plus the Sprint 3 execution map.

---

## 1. Verdict

**Accept the PRD as V1 MMP product freeze.** It is coherent: colleges engineer verified talent; companies ingest JDs; TPOs mediate; companies never get a scrapeable resume lake.

**Do not treat it as a greenfield rewrite.** CI, auth, contracts, L1–L5 assessment, catalogs, and rate limits already exist. Allen’s xlsx (`INF-01`…`QA-T04`) is a **5-day demo loop** written as if day 1 were empty. Mapping below says what is already done, what is Sprint 2, what is Sprint 3, and what we drop.

**Do not fork a second product.** Certification (5×3 grid, tracks, certificates) is the _trust signal_. PRD Jobs & Placements is the _marketplace outcome_. VEGA ([SPRINT03_PROFILE_CALIBRATION_AND_VEGA.md](./SPRINT03_PROFILE_CALIBRATION_AND_VEGA.md)) is L4’s engine reused as the confidence interview — not a new AI platform.

---

## 2. What the PRD gets right (keep)

1. **No bulk egress** — company APIs are card-shaped and rate-limited. Enforce in RBAC, not CSS.
2. **TPO is the V1 matching UI** — ranked suggestions, human shortlist, then company ATS.
3. **Skill verification is a state machine** — Declared → Verified / Beginner reattempt / Locked + cooldown. Configurable thresholds. Technical failures do not consume a strike.
4. **Async AI** — plagiarism, proctoring analysis, confidence interview are queues.
5. **Honest V1 company surface** — JD + Kanban. No self-serve marketplace (`CO-07`, `CN-02` = V2).
6. **Scope cuts in the xlsx** — SSO stub, proctoring-lite, one domain seed — match a 21-day runway.

---

## 3. Tension with the repo (resolve, don’t ignore)

| Topic                | PRD v1                                       | Repo today                                                    | Architect call                                                                                                                                                                       |
| -------------------- | -------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| North star           | Verified skill % + time-to-shortlist         | Gold vs cohort interview/offer conversion                     | **Both.** Certificate is the profile. Shortlist conversion is the outcome KPI.                                                                                                       |
| Matching             | Rules, TPO-mediated                          | `S3-RM-02` pgvector cosine (Ramansh)                          | **Rules are P0. Cosine is P1 / first cut.** ADR 0012.                                                                                                                                |
| Skill model          | Claimed Beginner/Int/Adv per skill           | Track × level × Gold/Silver/Bronze                            | **VB maps claims → attempts on catalog skills.** Tiers still come from cut scores. Do not invent a parallel score.                                                                   |
| Company app          | Full ATS portal                              | `B2B_PARTNER` + `web-verify`                                  | **V1 company UI can live in `web-tpo` company-mode or a thin `web-admin` slice — not a fifth app before freeze.**                                                                    |
| Ownership            | Allen: VV matching; VB TPO placement tickets | CODEOWNERS: RM `matching/`, VG `placement/`, VB `assessment/` | **Git owners unchanged.** VV lands the rules ranker via PR to `matching` (Ramansh reviews). VG still owns shortlist rows + outcomes. VB owns verification SM + opportunity/ATS APIs. |
| Tino feature tickets | CO-T04 dashboard, CO-T05 sync, INF-02 schema | Tino writes **no** feature code                               | **Reassign CO-T04 → SV, CO-T05 → VV, INF-02 → VV (schema steward).** Tino: contracts, ADRs, demo script, review.                                                                     |

---

## 4. Skill verification — scope for Vishal Bharath

Allen: “engineering talent profiles… ingest JDs & match from our pool.” Vishal V asked: customer UI or what?

**VB owns the verification engine and the trust chain, not the company sales UI.**

| In scope (PRD)                                                                 | Path                                  | Pair                  |
| ------------------------------------------------------------------------------ | ------------------------------------- | --------------------- |
| CN-07 / SE-T01 state machine (2-strike, cooldown, no-strike on technical fail) | `modules/assessment`                  | RM scores the attempt |
| Integrity: flagged attempt never becomes “Verified” (and never a certificate)  | assessment + `web-admin` review queue | existing S3-VB-04     |
| Opportunity opt-in → session that **reuses VEGA/L4**, not a new interviewer    | assessment + RM prompts               | SV player             |
| Company ATS stage → application status events                                  | assessment/placement seam             | VV Kafka              |
| Proctoring-lite events (tab-blur, snapshot) attached to attempt                | assessment integrity log              | SV capture            |

**Out of scope for VB (do not absorb):** rules ranker (VV), JD NLP (RM), item banks (VG), TPO visual design (SV), Entra SSO (VV).

Customer-facing “how do I look to a company?” is **SV** (`web-student` public profile CN-T07). VB supplies the verified badges and integrity truth.

---

## 5. Jobs & Placements — scope for Vishal V

You own the **outcome path**: JD in, rank out, shortlist persisted, ATS stage sync, notifications. You do **not** own LLM prompts or cut scores.

**S3 P0 for you (product), stacked on existing AGILE tickets:**

| ID       | Work                                                                                               | Notes                           |
| -------- | -------------------------------------------------------------------------------------------------- | ------------------------------- |
| SE-T05   | Rules ranker: weights for skill / proficiency / domain / experience / location; explanation string | Pure function + tests. No LLM.  |
| SE-T07   | Notify on shortlist, stage change, verification result                                             | Email + in-app; existing mailer |
| CO-T05   | ATS stage → candidate My Applications (was Tino on xlsx)                                           | Kafka event, idempotent         |
| S3-VV-02 | Indexes on match/shortlist/attempt hot paths                                                       | Keep from AGILE_PLAN            |
| Schema   | `JobOpening`, `Application`, `AtsStage` — **you author the migration**                             | Everyone else files an issue    |

**Drop / slip if Thursday 3 Sep is already overloaded:** S3-VV-01 Kong, S3-VV-03 Helm — they do not make the dating-app demo true. S3-VV-04 rate-limit override is P1.

Ramansh still does S3-RM-01 (JD parse) if there is a PDF. If the company form is **already structured** (CO-T01 taxonomy picks), skip NLP for the demo and parseConfidence=1.0 from the form.

---

## 6. Allen xlsx → reality (do not restart S0)

| Allen ID                                  | Status vs repo                                                                       | Sprint home                  |
| ----------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------- |
| INF-01 repo/CI                            | **Done**                                                                             | —                            |
| INF-02 schema                             | Partial (users, catalog, attempts). Add JD/application/skill-claim tables            | S3 · VV                      |
| INF-03 auth                               | Partial (JWT, roles, onboarding). SSO still stub — matches xlsx cut                  | S1 leftover · VV             |
| INF-04 UI kit                             | Partial (`packages/ui`). Add 5-state verification badge                              | S3 · SV                      |
| INF-05/06 taxonomy + MCQ                  | Lead tracks exist; “15 skills + 100 beginner items” is VG content, not a new service | S2 · VG                      |
| SA-T01–T07 Super Admin                    | Institutions/users exist; verification queue + feature flags + reason-coded viewer   | S3 · VV API + VB `web-admin` |
| AC-T01–T02 batches/provisioning           | Onboard-05/06 in dest                                                                | S1 · done-ish, close gaps    |
| AC-T03–T07 placement UI                   | **S3 heart**                                                                         | SV UI + VB APIs              |
| CN-T01–T05 onboarding/profile             | Partial student auth/enroll                                                          | S2 · SV                      |
| CN-T06–T08 apps/public/projects           | S3                                                                                   | SV + VB + RM                 |
| SE-T01 skill SM                           | S3 · **VB + RM**                                                                     |                              |
| SE-T02–T04 AI interview/project/cognitive | S3 · **RM**; VEGA = L4 reuse                                                         |                              |
| SE-T05 rules match                        | S3 · **VV**                                                                          |                              |
| SE-T06 proctoring-lite                    | S3 · SV capture + VB persist                                                         |                              |
| CO-T01–T03 JD/ATS/card                    | S3 · VB API + SV UI                                                                  |                              |
| CO-T04 dashboard                          | **SV**, not Tino                                                                     |                              |
| QA-T01–T04                                | S3 last day + S5                                                                     | Tino script, VV deploy       |

---

## 7. Sprint 3 — four-day play so nobody blocks anybody

**Sprint goal (replace the slide, keep the AGILE sentence):** a TPO can take a structured JD, see a **rules-ranked** verified pool, shortlist, collect a confidence score, send to company; the candidate sees ATS status; a completed track still issues a certificate.

### Day 1 (Thu 3 Sep) — contracts then vertical slices

Contracts **v0.2.0 are merged** (`JobOpening`, `Application`, `AtsStage`, `SkillClaim`, rules match explanation, `smart.application.stage_changed`). Implement against `@smart/contracts`. Do not wait for another contracts drop. Further contract PRs only if a field is wrong — I merge those at 17:00.

Then in parallel (WIP 2):

| Engineer           | Day 1–2                                                                | Day 3–4                                                                                                                      |
| ------------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Vishal V**       | Migration + rules ranker tests + notify                                | Stage-sync event; indexes; help VB if assessment lock needs Redis TTL                                                        |
| **Vishal Bharath** | Skill SM on attempt complete; opportunity opt-in                       | ATS APIs; integrity queue still S3-VB-04; certificates S3-VB-01 still P0 — **if forced to choose, certificate > ATS chrome** |
| **Ramansh**        | Confidence interview = VEGA/L4 prompt version + schema; no new gateway | JD parse only if CO-T01 is free text; project-verify agent stub if CN-T08 lands                                              |
| **Vedika**         | Taxonomy skills for Software & IT MMP; shortlist persist               | `placement_records` + cohort cards for TPO dashboard                                                                         |
| **Satheswaran**    | Verification badge + TPO ranked list + JD form                         | ATS Kanban + My Applications + public profile toggles                                                                        |
| **Tino**           | Contract merge, 17:00 board, demo script                               | No feature code; reject bulk-export and second matcher                                                                       |

### Seams (integrate Wednesday 15:00 checkpoint)

1. `POST /placement/match` returns rules `matchScore` + `explanation` (VV ranker, RM optional similarity).
2. VB writes `SkillClaim` status the matcher reads — **same enum in contracts**.
3. SV never computes rank in the browser.
4. Company stage change produces one Kafka event; candidate UI polls or sockets later — **poll is enough for V1**.

### Certificate vs dating-app

AGILE_PLAN S3 still has certificate PDF + webhooks as P0. Those are the **proof** companies trust. If the team is drowning: **keep S3-VB-01 issuance + S3-SV-02 shortlist table + SE-T05 ranker.** Cut Helm, cosine, compliance export, project GitHub agent, cognitive narrative.

---

## 8. Demo script (QA-T05 — Tino owns the words)

1. Super Admin: institution + company exist (already).
2. TPO: batch of students with at least one **Verified** skill (VB SM).
3. Company: post JD with required skills from taxonomy (not free text).
4. TPO: ranked list with score + why; shortlist two people.
5. Candidate: opportunity → opt-in → short confidence interview (VEGA).
6. TPO: send scored list to company.
7. Company: drag ATS column → candidate My Applications updates.
8. (If time) Public profile shows verified badges; certificate verify URL still works.

If step 4 has no rank, the sprint failed. If step 8 is missing, the sprint did not fail.

---

## 9. Open questions (do not block S3)

Logged from PRD §13; answers can wait until after the demo:

- Long-term content authorship (ORION vs SME).
- Pricing (per-seat vs institution) — flags only this sprint (`SA-T04`).
- Exact cooldown days — VG + VB pick a default (e.g. 60) in env, not hardcoded.

---

## 10. What I will say at ARB

The PRD is the MMP story. CODEOWNERS stay. Vishal V owns the **rank and the loop**. Vishal Bharath owns **verified truth**. Ramansh owns **LLM**. Vedika owns **records and content**. Satheswaran owns **the four-role UI**. I own contracts and the freeze. We ship a dating app with a human TPO in the middle, not a second assessment product.
