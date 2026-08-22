# Smart — Level × Tier Technical Design

**How "Level" and "Gold/Silver/Bronze" combine into one system, engineered specifically to produce evidence a company will actually act on.**

---

## 0. The core idea, stated precisely

Most assessment platforms have one axis: a score, turned into a badge. Smart needs **two axes, and they measure two different things**:

- **Level = what kind of thinking was tested.** Not "harder questions" — a genuinely different cognitive task. Level 1 tests whether you _know_ the right concept. Level 2 tests whether you can _apply_ it to a realistic scenario. Level 3 tests whether you can _produce_ the actual work output a professional produces, under judgment and ambiguity.
- **Tier (Gold/Silver/Bronze) = how well you performed within that kind of thinking.** Tier is always relative to a Level — "Gold at Level 1" and "Gold at Level 3" are not the same claim, and the certificate must never blur that.

This isn't an arbitrary design choice — it's built directly from the strongest available research on what actually predicts job performance, and therefore what evidence actually moves a hiring manager. That research is the foundation of this whole document, so it comes first.

---

## 1. The research that decides the design — what actually convinces a company

Recruiters aren't convinced by a score. They're convinced by **evidence that has been shown, independently and repeatedly, to predict who performs well on the job.** This has been studied more thoroughly than almost anything else in hiring, and the findings are consistent enough to build a product on.

### 1.1 The evidence hierarchy (Schmidt & Hunter, 1998; updated by Sackett et al., 2022)

The most cited body of research in personnel selection <cite index="25-1">analyzed decades of hiring studies and found that the strongest predictors of job performance are cognitive ability, work sample tests, personality measures, and structured interviews</cite>. Critically, <cite index="25-1">combining a cognitive ability measure with a structured interview produces meaningfully higher predictive accuracy than either alone</cite> — no single method, used alone, is enough. A later, more conservative re-analysis <cite index="29-1">confirmed the same ranking held up: general mental ability, structured interviews, and work samples remain at the top, while unstructured interviews, years of experience, and educational credentials sit near the bottom</cite>.

**What this means for Smart, directly:** a single MCQ score, however well-designed, is exactly the kind of single-method evidence that research says is _not_ enough on its own. A certificate built on one test format will always be weaker evidence than a certificate built on a **combination of methods** — which is precisely why Level 1/2/3 shouldn't be "the same test, harder." Each Level should deliberately be a **different method from the validated hierarchy**, so the final certificate is a structured, multi-method battery — the single strongest evidence design that exists in this field.

### 1.2 Where "work samples" fit — and why Level 3 has to produce a real artifact, not another question

<cite index="27-1">Work sample or job sample tests have consistently shown meaningful predictive validity for job performance</cite>, and the research specifically shows they are most reliable when they mirror **actual output the job requires** rather than a proxy for it. This is the direct justification for making Level 3 a real deliverable — an actual financial model file, an actual SQL query against a real dataset, an actual HR case memo — not a harder multiple-choice question. A hiring manager can look at that artifact and evaluate it the same way they'd evaluate a new hire's first deliverable.

### 1.3 Where structured judgment tasks (SJTs) fit — and why they need rubric discipline

Structured judgment scenarios are well-studied and <cite index="36-1">have been shown to reliably measure competencies like professional judgment and decision-making, correlating with real on-the-job behaviors</cite> — but only when scored correctly. Research on SJT scoring specifically found that <cite index="35-1">the most commonly used scoring method (simple raw consensus scoring) actually produces the weakest validity, while methods like mode-based consensus scoring perform meaningfully better</cite>. This is a direct, technical instruction for how Level 2/3 judgment items must be scored (Section 4.3) — not a detail to leave to intuition later.

### 1.4 The one-sentence translation of all this research into Smart's architecture

> **A certificate is convincing to a company in direct proportion to how many independently-validated methods it combines, how closely its hardest component mirrors real job output, and how disciplined its scoring rubric is.** Level 1/2/3 exists to force exactly that combination into one certificate.

---

## 2. The Level definitions — full technical spec

|                                          | **Level 1 — Foundation**                                                                        | **Level 2 — Applied**                                                                                          | **Level 3 — Judgment / Work Sample**                                                                                              |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **What it tests**                        | Do you know the right concept, framework, or number                                             | Can you apply it correctly inside a realistic scenario                                                         | Can you produce the actual deliverable a professional on day one would produce                                                    |
| **Nearest validated method (Section 1)** | Job-knowledge / cognitive-ability-style testing                                                 | Situational judgment testing (SJT)                                                                             | Work sample testing                                                                                                               |
| **Item format**                          | Single-best-answer MCQ, numeric-entry, short calculation                                        | Scenario/vignette with a structured multi-part response (short constructed-response, not MCQ)                  | A real task: build the model, write the query, draft the memo, run the analysis — open-ended, tool-based                          |
| **Example (Finance track)**              | "Which of these correctly identifies a company's operating cash flow driver?"                   | "Given this 1-page company scenario, identify the 3 biggest valuation risks and justify each in 2–3 sentences" | "Here is a real (anonymized) company's 3 years of financials. Build a working 3-statement model and recommend a valuation range." |
| **Time**                                 | 45–60 min                                                                                       | 60–90 min                                                                                                      | 2–4 hours (can be split across a window, not necessarily proctored in one sitting)                                                |
| **Scoring method**                       | Automated, right/wrong, item-weighted (Section 4.1)                                             | Rubric-anchored human or trained-model scoring against model answers (Section 4.3)                             | Rubric-anchored expert scoring against a graded deliverable checklist (Section 4.4)                                               |
| **Reusable across cohorts?**             | Yes, from a rotating item bank (Section 6)                                                      | Partially — scenarios rotate, rubric is fixed                                                                  | No — task briefs must rotate every cohort to prevent solutions circulating                                                        |
| **What a company reads this as**         | "This person has the baseline knowledge — same as passing a licensing exam's knowledge section" | "This person can reason under realistic constraints, not just recall facts"                                    | "This is what their actual work output looks like — treat it the way you'd treat a work sample in your own hiring process"        |

**Progression rule:** a student must clear **Level 1 at Bronze or above** before Level 2 unlocks, and **Level 2 at Bronze or above** before Level 3 unlocks. This isn't arbitrary gatekeeping — it mirrors the CFA-style progressive structure <cite index="17-1">where candidates move through a structured progression from knowledge to application and finally to judgement</cite>, and it also protects the integrity of Level 3: nobody should be attempting an unsupervised work-sample task before they've demonstrated the underlying knowledge exists.

---

## 3. The Tier definitions — what Gold/Silver/Bronze means, precisely, at each Level

Tier is never a raw percentage. It's a **band relative to the calibrated cut score for that specific Level**, because the meaning of "excellent" is different at each Level.

| Tier                                                                                                                  | Level 1 meaning                                                                                                                | Level 2 meaning                                                                                                                                             | Level 3 meaning                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Gold**                                                                                                              | Knows the domain cold — at or above the "ready now" cut score set by the practitioner panel, with a low error margin (see 4.2) | Applies concepts correctly under realistic constraints with minimal guidance — matches how the panel described a "would perform well in week one" candidate | Produced a deliverable that a panel practitioner rated as **usable with only minor revision** — the closest a pre-hire signal can get to "we could hand them a real task tomorrow" |
| **Silver**                                                                                                            | Solid knowledge with identifiable, specific gaps                                                                               | Applies concepts correctly most of the time, but reasoning breaks down under ambiguity or edge cases                                                        | Produced a deliverable that is **directionally correct but needs real supervision** — hireable into a role with structured onboarding, not a fully autonomous one                  |
| **Bronze**                                                                                                            | Meets the minimum bar — core knowledge present, but not yet fluent                                                             | Attempts are structurally right but frequently incomplete or shallow                                                                                        | Deliverable shows genuine effort and partial competence but would need to be substantially redone by a supervisor                                                                  |
| **Below Bronze** (not a certified tier — internally tracked, shown only as a gap report, never a public "fail" label) | Below the minimum cut                                                                                                          | Below the minimum cut                                                                                                                                       | Below the minimum cut                                                                                                                                                              |

**Why there's no public "Fail" tier:** this is a product decision, not just a soft one — an institution cannot present a system to an academic council that publicly labels students "failed" (see the institutional-adoption analysis in the companion strategy document). Below-Bronze performance is fed back as a private, itemized gap report to the student and an aggregate to the institution, never displayed as a public certificate tier.

---

## 4. The scoring engine — exact mechanics

### 4.1 Level 1 scoring: weighted item-response scoring

Each item is tagged to exactly one competency and carries a weight reflecting how often that competency shows up in real job postings for the role (the competency-mapping process in the companion strategy document, Section 6). Raw score is:

```
Level1_Score = Σ (item_correct[i] × competency_weight[i]) / Σ (competency_weight[i])
```

For v1, this is enough — a classical weighted-percentage model, fully explainable to a non-technical academic council in one sentence ("each question counts more or less depending on how important that skill is to the real job").

**Phase 2 upgrade (not v1):** move Level 1 to a proper **Item Response Theory (IRT) 2-parameter model**, where each item has a calibrated difficulty and discrimination value learned from response data across cohorts. This unlocks:

- **Adaptive testing** (each student gets a test tailored to their ability level — shorter, more precise, harder to "brute-force" by memorizing a fixed item bank)
- **True ability estimates with a formal standard error**, not just a raw percentage
  This requires a real item-response dataset (multiple cohorts) to calibrate correctly — attempting it before that data exists produces unstable, untrustworthy difficulty estimates, so it must wait until Phase 2.

### 4.2 Cut-score calculation with a confidence band (the "confidence note," made technical)

The Angoff panel process (companion document, Section 1.2) doesn't produce one number — it produces a **distribution** of cut-score estimates from each panelist. The Level's Gold/Silver/Bronze boundaries are the **mean of panelist estimates**, and the **standard deviation of those estimates becomes the visible confidence band** on every certificate:

```
Cut_Gold   = mean(panelist_estimates_gold) ± SD(panelist_estimates_gold)
Cut_Silver = mean(panelist_estimates_silver) ± SD(panelist_estimates_silver)
```

If a student's score falls inside a cut-score's uncertainty band (e.g., scored 74 when the Gold cut is 75 ± 4), the certificate must say so explicitly: _"borderline Gold/Silver — cut-score confidence band overlaps this result."_ This single mechanic is what makes the "confidence note" from the strategy document a real statistical object instead of a marketing phrase, and it's exactly the kind of visible-methodology detail that survives scrutiny from a skeptical recruiter or academic council.

**Reliability reporting:** alongside every published cohort result, Smart computes and publishes **Cronbach's alpha (or KR-20 for right/wrong items)** per Level per track — the standard reliability statistic for "if this student retook a similar test tomorrow, how consistent would the result be." Below a reliability threshold (commonly 0.70 as an academic minimum), the track is flagged internally as "not yet stable" and the confidence note downgrades automatically — this is what keeps the "honesty over inflation" value enforced by the system itself, not by discipline.

### 4.3 Level 2 scoring: rubric-anchored constructed response

Because research shows **raw consensus scoring is the weakest SJT scoring method and mode-based consensus scoring performs meaningfully better** (Section 1.3), Level 2 scoring must use a **Behaviorally Anchored Rating Scale (BARS)** built the same way the panel builds cut scores:

1. For each scenario, the calibration panel independently writes what a Gold-level, Silver-level, and Bronze-level response would actually contain (specific reasoning points, not vague quality descriptors).
2. Panel responses are reconciled into a **mode-consensus rubric** — the most commonly agreed-upon anchor points, not an average, matching the scoring method research found most valid.
3. Every student response is scored against this fixed rubric — either by a second trained human rater, or by a calibrated LLM-assisted rater **validated against human raters on a held-out sample first**, with inter-rater agreement (Cohen's Kappa) tracked and published internally. If agreement drops below an acceptable threshold (commonly κ ≥ 0.6, "substantial agreement"), automated scoring is paused for that item until re-calibrated.

### 4.4 Level 3 scoring: deliverable checklist + practitioner review

Level 3 is scored two ways, combined:

- **Objective checklist (60% of score):** did the deliverable meet non-negotiable technical requirements (e.g., "model balances," "SQL query returns correct row count," "memo addresses all 3 required risk categories"). This part is auto-checkable in most cases (a financial model that doesn't balance, a query that errors out) and removes subjectivity from the pass/fail floor.
- **Practitioner rubric review (40% of score):** a calibration-panel practitioner (or a rotating pool of trained reviewers using the same BARS-style anchors from 4.3) scores the deliverable's judgment quality — is the valuation range defensible, is the recommendation actionable, would a manager accept this with only light editing.

This split is deliberate: it keeps Level 3 defensible even before enough practitioner-review capacity exists at scale (the checklist alone gives a floor), while still keeping the qualitative judgment signal that's the entire point of Level 3.

---

## 5. The Level × Tier certificate architecture — what actually gets issued

### 5.1 The "current standing" model (not 9 separate certificates)

A student doesn't collect 9 disconnected badges. Smart issues **one live certificate per track** that shows:

- **Highest Level cleared** (this is the headline — "cleared Level 3")
- **Tier achieved at that Level** ("Gold")
- **Tier trail at every Level below it** (so a company can see the full shape of the candidate, not just the peak — e.g., "L1: Gold · L2: Gold · L3: Silver" tells a very different story than "L1: Silver · L2: Bronze · L3: Silver" even if both show "Level 3 reached")

This trail is itself evidence: research shows combining multiple methods predicts better than any single method (Section 1.1), so a company reading a full Level 1→2→3 trail is reading a small multi-method battery, not a single test score — which is exactly the design goal.

### 5.2 Reading the matrix — what each of the realistic combinations tells a hiring manager

| Combination                             | What it signals to a company                                                                                                                                                                                                                                   |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **L3 Gold** (with L1/L2 Gold or Silver) | Ready now — deliverable-quality output validated by a practitioner rubric. This is the "shortlist immediately" signal.                                                                                                                                         |
| **L3 Silver, L2 Gold**                  | Strong reasoning, but needs supervised ramp-up before fully autonomous output — a legitimate, common, and honestly-labeled hire profile, not a rejection.                                                                                                      |
| **L2 Gold, L3 not yet attempted**       | Strong applied reasoning, hasn't yet been tested on a real deliverable — useful for roles that are more analysis-heavy than production-heavy, and an honest "we haven't measured this yet" for roles that need production output.                              |
| **L1 Gold only**                        | Knows the domain well but hasn't demonstrated applied or judgment-level skill yet — equivalent to "strong foundation, unproven in practice." This is intentionally NOT hidden or padded — a company seeing this knows exactly what has and hasn't been tested. |

### 5.3 Why this design directly answers "how do we convince a company"

A hiring manager evaluating a resume claim has no way to check it. A hiring manager evaluating a Smart trail is looking at: **a knowledge check (like a licensing exam), a judgment check (like a structured interview transcript), and a real work sample — three of the four strongest predictors in the entire personnel-selection research base**, each independently calibrated by real practitioners, each with a visible confidence band, each traceable to a named competency. That combination — not the Gold label by itself — is the actual evidence. The Gold/Silver/Bronze label is simply the compressed, human-readable summary of a multi-method battery that already meets the evidentiary bar research says predicts job performance.

---

## 6. Integrity architecture — because none of the above matters if it can be gamed

An employer will trust this system exactly as much as they trust that a Gold certificate wasn't gamed. This has to be engineered, not assumed.

- **Level 1 item bank rotation:** items are grouped into parallel forms; no two students in the same cohort window see an identical form; exposed items (flagged via anomaly detection on response-time and answer patterns) are retired each cycle.
- **Level 2 scenario rotation:** new scenarios written each cohort cycle by the calibration panel's ongoing involvement (not just a one-time session) — this also keeps the panel relationship active, reinforcing the "standing asset" mechanism described in the companion strategy document.
- **Level 3 task brief rotation + anonymized real data:** every cohort gets a structurally similar but numerically different dataset/company scenario, so a solved model from a prior cohort can't be copy-pasted.
- **Proctoring tier matched to stakes:** Level 1 can be lower-friction (browser lockdown + basic webcam check); Level 3, being the highest-stakes signal, should have identity verification and a plagiarism/similarity check run against prior submissions before a Gold tier is finalized.
- **Anomaly flag on the certificate record (internal only):** any integrity flag on an attempt suspends certificate issuance pending review — this is a private trust-and-safety flow, never shown publicly, but it has to exist before the first employer views a verification page, not retrofitted after a scandal.

---

## 7. Data model — the technical schema this requires

At minimum, v1 needs these entities (simplified, relational):

```
Track            (track_id, name, foundation_weight)
Competency       (competency_id, track_id, name, real_world_source_weight)
Level            (level_id, track_id, level_number, format_type)
Item             (item_id, level_id, competency_id, item_type, difficulty_tag, active_flag)
CalibrationPanel (panel_id, track_id, level_id, panelist_id, role_title, employer_name)
CutScoreEstimate (estimate_id, panel_id, level_id, tier, estimated_value)
CutScore         (level_id, tier, mean_value, sd_value)          -- derived from CutScoreEstimate
Student          (student_id, institution_id, cohort_id)
Attempt          (attempt_id, student_id, level_id, timestamp, integrity_flag)
Response         (response_id, attempt_id, item_id, raw_answer, score, rater_id)
LevelResult      (result_id, attempt_id, level_id, raw_score, tier_awarded, confidence_band)
Certificate      (certificate_id, student_id, track_id, highest_level, tier_trail_json, issued_date, verification_url)
CorrelationRecord (record_id, track_id, cohort_id, tier, placement_cycle, interview_rate, offer_rate)
```

`CorrelationRecord` is the table that powers the published, cycle-over-cycle conversion-rate report — the single most important piece of long-run evidence described in the companion strategy document, and it only becomes meaningful once 2+ cycles of data exist in it.

---

## 8. Worked example — one student, end to end (Finance track)

1. **Level 1 (Foundation, Finance):** Ankita scores 78% weighted. Panel-derived cut scores: Gold 80±3, Silver 65±4, Bronze 50±5. Her score (78) sits inside the Gold band's lower edge — certificate shows **"L1: Gold (borderline — within cut-score confidence band)."**
2. **Level 2 unlocks** (cleared Bronze+ at L1). She completes 4 scenario items; mode-consensus rubric scoring rates her responses as matching the Gold-anchor reasoning on 3 of 4, Silver-anchor on 1. Weighted result → **L2: Gold.**
3. **Level 3 unlocks.** She's given an anonymized 3-year financial dataset, builds a 3-statement model. Objective checklist: model balances, formulas correctly linked (passes 5/6 automated checks — one formatting issue). Practitioner review: valuation range judged reasonable but the risk write-up is thin. Combined score lands in the **Silver** band for L3.
4. **Certificate issued:** `MBA–Finance — L1: Gold (borderline) · L2: Gold · L3: Silver — Verification: smart.cert/xk29a`
5. **What the employer sees on the verification page:** the tier trail above, the specific competencies tested at each level, the calibration panel's employer names for Finance, the confidence bands, and — once available — the published correlation report showing how L3-Silver-or-above Finance candidates from this institution have converted in past placement cycles.

This is a materially different, and more convincing, artifact than "Ankita — Gold — 82%."

---

## 9. What's in the 5-week v1 vs. what's engineered but deferred

**Built in v1 (Finance + Business Analytics only):**

- Level 1 (weighted scoring) and Level 2 (rubric/BARS scoring) fully live
- Angoff-style cut scores with visible confidence bands
- Certificate with tier trail (even if only L1+L2 exist at launch)
- Verification page with methodology + calibration panel credit
- Core data model above, minus IRT and adaptive delivery

**Engineered in the design, deferred to Phase 2 once cohort data exists:**

- Level 3 work-sample track (needs practitioner reviewer capacity — realistic to pilot with a small batch, not scale immediately)
- IRT-based adaptive Level 1 delivery (needs multi-cohort response data to calibrate safely)
- LLM-assisted Level 2/3 scoring at scale (needs a human-rated validation sample first, per Section 4.3's inter-rater threshold)
- CorrelationRecord-powered public dashboard (needs 2+ real placement cycles to be non-trivial)

This sequencing matters: shipping Level 3 or adaptive scoring before the underlying calibration data exists would produce a system that _looks_ more advanced but is actually less defensible — exactly the failure mode Section 1 warns against.

---

## 10. The one-paragraph summary

**Level measures what kind of thinking was tested — knowledge, applied reasoning, or real work output — because research on hiring shows that combining different validated assessment methods predicts job performance far better than any single method alone. Tier measures how well a student performed within that specific kind of thinking, calibrated by real practitioners with a visible statistical confidence band, not a guessed percentage. Put together, a Smart certificate isn't a badge — it's a compressed, evidence-backed summary of a multi-method assessment battery built from the same methods research shows hiring managers should already be using, which is exactly why it should convince one.**
