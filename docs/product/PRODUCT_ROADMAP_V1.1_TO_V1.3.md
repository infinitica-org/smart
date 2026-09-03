# SMART — Product roadmap

**v1.1.0 (15 Sep 2026) → v1.2 → v1.3**

| Field    | Value                                                                                                            |
| -------- | ---------------------------------------------------------------------------------------------------------------- |
| Audience | Product Owner + design-partner conversation                                                                      |
| Author   | Tino, from Playbook §2/§11, `SMART_V1_Launch_Roadmap.md`, PRD v1, and what is actually on `dev` as of 3 Sep 2026 |
| Rule     | Product thinking first. A feature ships only if it changes what a recruiter is willing to **believe** or **do**. |

---

## 0. How to read this

V1 (GA 10 Sep) is a **concierge verified pilot**: institutions + students + TPO-mediated shortlists. It is not yet a reason for a recruiter to _replace_ their own screening.

The next three versions exist to close that gap, in order:

1. **v1.1 — make the profile defensible.** A recruiter can ask “how do you know they actually worked there / built that?” and we have an auditable answer.
2. **v1.2 — make the hire cheap to try.** The recruiter spends minutes, not a TPO meeting, to get a ranked, explainable shortlist.
3. **v1.3 — make the hire safer than LinkedIn + a take-home.** We show conversion proof (Gold vs cohort) and close the loop after they interview.

If we invert this order — marketplace UI before work-experience vouchers, or “AI matching” before employer response tracking — we will look like every other campus aggregator.

North-star (unchanged from product core): **interview / offer conversion for Gold vs the institution’s own baseline.** Everything below is in service of that number, not of feature completeness.

---

## 1. Where we actually are (so the roadmap is honest)

What V1 can already show a company, if we run it as concierge:

- A student profile that is **not a resume dump**: onboarding, declared skills, L1 assessment path, project submission, TPO JD → ranked shortlist → confidence interview → ATS stages.
- A **public certificate verify** surface (`web-verify`) — the artefact a sceptical hiring manager can open without logging in.
- Project-verify **heuristics** (duplicate text, tech-age, public-web snippet similarity) and a first **work-experience Phase 1** (student CRUD + proof metadata). That is collection, not trust.

What a recruiter will still object to on 10–14 Sep:

| Objection                           | Why it is fair                                                                                     | Version that answers it |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------- |
| “Anyone can type a company name.”   | Phase 1 stores claims. No employer has confirmed them.                                             | **v1.1**                |
| “Offer letters are not experience.” | Students upload whatever they have. We do not yet classify/reject offer letters as a product rule. | **v1.1**                |
| “You emailed HR and… then what?”    | No 6h reminder, no 48h expiry, no restart, no dashboard of _where the voucher is_.                 | **v1.1**                |
| “Send me a CSV of 200 students.”    | We correctly refuse bulk export. We do not yet give them a **better** motion than CSV.             | **v1.2**                |
| “Why this person #1?”               | Rules ranker exists. Recruiter-facing explanation + self-serve JD is still TPO-shaped.             | **v1.2**                |
| “Prove Gold gets more interviews.”  | Metric is defined. We do not yet publish it per partner.                                           | **v1.3**                |

Playbook sequencing still holds: prove verification against **external fraud incentives** (students over-claiming) before we sell enterprise-embedded mode. That is why v1.1 is almost entirely _trust operations_, not _more AI_.

---

## 2. v1.1.0 — 15 September 2026

**One-liner:** The work-experience voucher becomes a real, restartable workflow — the highest trust-per-engineering-hour in the Playbook — and every shown profile carries at least one human-backed signal plus one assessment-backed signal.

**Theme:** _Stop asking recruiters to take our word for it._

### Why this version, this week

`SMART_V1_Launch_Roadmap.md` already ranked work-experience verification as **build-full, first**. V1 shipped the surrounding shell (assessment, project heuristics, ATS). The missing piece is the one recruiters actually understand without a demo script: **“we asked their manager, on a company domain, and here is what they said — or that they never replied.”**

A 15 Sep date is five days after GA. That is enough for one vertical slice if we do **not** also invent in-house liveness, a marketplace, or a new taxonomy.

### What ships (and why each line exists)

#### 2.1 Work-experience verification, end to end (P0)

Ticket: **S6-VB-01** (Excel + this doc). Owner: Vishal Bharath. Seams: Sathesh (student UI), Vishal V (mail + Redis TTL), Ramansh (OCR/classify via gateway only).

| Capability                                                                                                 | Why it is not chrome                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Collect experience **and** company identity (website + LinkedIn handle mandatory when the company has one) | Recruiter’s first check is “is this a real employer?” A name-only field fails that in 10 seconds.                                                       |
| Proof upload that **rejects offer / joining / appointment letters** as `INVALID_DOCUMENT_TYPE`             | This is the single cheapest honesty signal we can ship. Inflated profiles almost always start with an offer letter.                                     |
| OCR + classify → VALID / INVALID / NEEDS_MANUAL_REVIEW — never auto-fraud                                  | Auto-calling a student a liar on a bad scan destroys institution trust. Review is a feature.                                                            |
| Official-domain verifier email + structured YES / NO / PARTIAL / NEED CLARIFICATION                        | “Did they work here?” is not enough. Recruiters hire for **domain + skills + dates**. The voucher must ask those.                                       |
| Status machine with 6-hour reminders and **48-hour `VERIFICATION_EXPIRED` → restart from step 1**          | Silence is the common case. Infinite nudges look like spam and still do not produce a verified badge. A new `verificationAttemptId` is the audit trail. |
| Ops / TPO dashboard: candidate, company, status, current step, email state, time remaining                 | If we cannot answer “where is this right now?” we cannot run a pilot of 150 students.                                                                   |

**Candidate experience:** slower than “save and done,” but dignified. They see _why_ an offer letter was refused, _who_ we emailed, _when_ the next reminder goes, and _what happens_ at 48 hours. That is the opposite of a black-box “under review” spinner.

**Recruiter experience:** the profile card can say, in one line they can defend to their VP:

> Confirmed by _Priya Shah, Engineering Manager @ ABC Technologies_ on 18 Sep — dates and stack match. Not an offer letter.

Or, equally valuable:

> Employer did not respond in 48h (2 attempts). Not marked verified.

Honesty here is the product. A false Green badge is worse than an empty badge.

#### 2.2 Tighten the “shown to company” bar (P0)

Launch roadmap §2: every company-visible profile has **≥1 `ASSESSMENT_CONFIRMED` skill** plus **≥1 additional verified signal** (work-experience **or** project). v1.1 enforces that in the TPO “send to company” path — not as a lecture, as a hard gate with a human-readable block reason.

**Why:** the first design-partner meeting dies if they open three Gold-looking profiles and two of them are self-asserted.

#### 2.3 Project verify: finish the human-review queue, not a new model (P1)

Heuristics and `project-verify@1` already exist. v1.1 only needs: reviewer resolve (VERIFY / REJECT with reason), and the same “where is this?” row on the dashboard. Automating the interview step stays deferred until ~100 manual reviews (launch roadmap §5).

#### 2.4 What we explicitly do **not** put in v1.1

- Full webcam liveness / face enroll (DPDP + vendor; SE-T06 stays lite).
- Self-serve company marketplace.
- Cosine / LLM matching as the ranker.
- A fifth web app.
- Making the GitHub repo public to dodge Actions billing.

### Recruiter conviction (v1.1)

We are no longer selling “an assessment platform.” We are selling **a shortlist you can audit**. The motion:

1. TPO sends 8–12 people, not 80.
2. Each row has a verification trail (assessment / project / employer).
3. The recruiter can open `web-verify` for the certificate and, for work-ex, see the voucher outcome — not the raw HR email thread (privacy), but the structured confirmation.

That is how we get the **second meeting**. The first meeting is a demo. The second meeting is “send me seven people for this JD.”

**Exit metrics for v1.1**

- Voucher **response rate** (leading indicator — if this is <20%, fix deliverability before v1.2).
- % of company-visible profiles that meet the two-signal bar (target: 100% of what we send).
- Time-to-first-employer-response, and % expired vs verified.

---

## 3. v1.2 — October 2026 (indicative window: ~4 weeks after v1.1)

**One-liner:** The recruiter can request a role and receive an explainable shortlist without a TPO sitting in the call — matching stays rules-based; the TPO becomes a governor, not a bottleneck.

**Theme:** _Make “try SMART” cheaper than “ask the TPO for a spreadsheet.”_

### Why this version only after v1.1

Playbook Phase 2 (marketplace) **after** verification is real. If we open self-serve JD intake on unverified claims, we recreate Naukri with extra steps. v1.1 is the input quality gate. v1.2 is the **distribution** of that quality.

### What ships

#### 3.1 Recruiter workspace that is still not a data dump (P0)

- One opening, structured against the **taxonomy** (already true for TPO JDs).
- Ranked matches from the **existing SE-T05 rules ranker** (skill / proficiency / domain / experience / location) with the one-line explanation **shown to the recruiter**, not only to the TPO.
- Profile card: verified badges, confidence note, project Loom, **no bulk export**. Rate-limited by design.

**Why this convinces:** recruiters do not want another ATS. They want to **skip the resume pile**. The explanation string is the skip: “Gold L2 React + employer-confirmed 8 months Node + project verify 74, routed clean.”

#### 3.2 Candidate opt-in and application tracker as a trust feature (P0)

CN-T06 already polls ATS stages. v1.2 makes **visibility symmetric**: the student sees the same stage the company sees, and can opt out of a live opening. That is how we stay on the right side of “we are not scraping students into a marketplace.”

Recruiter benefit: higher show-up rate. People who opted in after seeing the JD convert better than silent bulk-shares.

#### 3.3 Certificate + shortlist pack (P1)

A single “Verified Talent Snapshot” (launch roadmap §6) as a **shareable view**, not a PDF dump of PII: tier, verification types, one-line trail, Confidence Note (sample size / α / calibration maturity).

This is the artefact that gets forwarded inside the company. If it cannot survive a sceptical engineering manager, it is not done.

#### 3.4 What we still do not do in v1.2

- Self-serve institutional white-label (Playbook Phase 1 — only if a second college is actually signing).
- Embedding inside the company’s HRIS.
- Replacing the rules ranker with an LLM score. LLMs explain poorly under audit.

### Recruiter conviction (v1.2)

The cost of a trial hire-cycle drops from “schedule Tino + TPO + recruiter” to “paste a JD, get 10 named people, open verify links.” We measure **time from JD to first interview booked**. If that number is not strictly better than their campus-drive baseline, v1.2 failed regardless of UI polish.

**Exit metrics for v1.2**

- Design-partner companies with ≥1 opening **they** created (not only TPO-relayed).
- Time-to-shortlist (TPO or recruiter) trending down.
- Interview show-up rate for SMART-shared candidates vs the institution’s last drive.

---

## 4. v1.3 — late 2026 (after two closed partner loops)

**One-liner:** We publish the proof — Gold vs cohort conversion — and productise the feedback loop so a recruiter who interviewed someone last month makes SMART better for the next JD.

**Theme:** _Become the system they justify to finance._

### Why not sooner

Conversion is a **denominator problem**. Publishing “Gold converts 2.1×” on 11 interviews is theatre. v1.3 waits until v1.1 vouchers + v1.2 shortlists have produced a real interview set.

### What ships

#### 4.1 North-star dashboard for the partner (P0)

- Interview and offer rates for Gold / Silver / Bronze vs the college’s own reported baseline.
- Confidence Note on the metric (n, window, how “offer” was recorded).
- This is also how we catch **tier inflation** before a recruiter does.

#### 4.2 Recruiter feedback as a first-class event (P0)

After interview: hired / rejected / no-show, plus 1–2 structured reasons (skills gap, communication, integrity, compensation). That event feeds:

- the next ranker weight review (Playbook change-management, not a silent model tweak);
- the student’s gap narrative (“the last two interviewers said system design, not React”).

**Candidate experience:** the platform finally does what the PRD promised — _tell them what to fix and give a path to re-verify_ — using **market** signal, not only our rubric.

**Recruiter experience:** they see that we are not a fire-and-forget vendor. Their rejects make the next shortlist sharper. That is the lock-in that is ethical.

#### 4.3 Narrow automation of what we have done by hand (P1)

- Project auto-interview only after the 100-review bar.
- Matching stays rules-first; optional vector signal as a **tie-break**, never the headline score (ADR-0012).
- Reminder/deliverability hardening for vouchers (dedicated sending domain — launch roadmap §8).

#### 4.4 Still deferred (Playbook Phases 3–4)

Enterprise-embedded / HRIS, public API marketplace, dedicated VPC, SOC 2. Those are sales motions that require v1.3 proof, not the other way around.

### Recruiter conviction (v1.3)

Finance asks “why do we pay a college platform?” The answer is no longer a demo. It is:

> Last cycle, SMART Gold reached first interview at X% vs Y% for the rest of the batch. Average hours-to-shortlist was Z. We rejected 3 profiles for integrity and the system did not hide it.

That is how we get a **paid** design partner, not another pilot.

**Exit metrics for v1.3**

- Gold vs cohort interview conversion (the north-star).
- Recruiter-reported hours saved per opening.
- Student re-verify rate after a market-tagged gap (locked skill → drill → new evidence).

---

## 5. How the three versions talk to each other

```text
v1.1  evidence exists and can expire
        ↓
v1.2  recruiter can consume evidence without a meeting
        ↓
v1.3  we prove the evidence predicted interviews
```

| Version  | Candidate gets                                          | Recruiter gets                           | Why they hire _through us_                   |
| -------- | ------------------------------------------------------- | ---------------------------------------- | -------------------------------------------- |
| **v1.1** | A fair, restartable work-ex process; no fake “verified” | An auditable trail on every name we send | They can defend the shortlist internally     |
| **v1.2** | Opt-in openings; stage truth                            | Self-serve ranked pack + verify links    | Trying us is cheaper than a campus drive     |
| **v1.3** | Market-honest gap reports                               | Conversion proof + feedback loop         | We beat their last hiring channel on numbers |

---

## 6. Risks the Product Owner should force us to name

1. **Voucher deliverability.** If HR mail lands in spam, v1.1 is a costume. Dedicated domain + bounce watch from day one of v1.1.
2. **48-hour restart fatigue.** Students will rage if we burn them for a silent employer. Product copy must treat expiry as “try another verifier,” not “you failed.”
3. **TPO politics.** v1.2 must keep the TPO as **governor** (they can hold a send). Cutting them out entirely loses the institution.
4. **Honesty vs volume.** A small honest pool beats a large decorated one. If a partner asks for 200 names by Friday, we send 12 and explain. That is a sales skill, not an engineering ticket.
5. **CI on the free GitHub plan.** Hosted Actions stop the moment billing flags a failed payment. v1.1 will miss 15 Sep if `dev` cannot deploy. See `docs/delivery/GITHUB_ACTIONS_FREE.md`.

---

## 7. Suggested narrative for a recruiter conversation

> We will not send you a database. In two weeks you get a shortlist where every row says _who confirmed it, what document type we accepted, and what we still do not know_. Offer letters do not count. Silence after 48 hours does not become a green badge. If that list does not produce interviews faster than your last campus drive, you should stop using us. That is the product.

If that paragraph makes a recruiter lean in, we are building the right versions. If they ask for “more AI” instead, we are in the wrong meeting.

---

## 8. Traceability

| Claim in this doc                                           | Source                               |
| ----------------------------------------------------------- | ------------------------------------ |
| Verification is the product; no self-asserted skills        | Playbook §2.1                        |
| Work-ex voucher is highest trust-per-hour; build full first | `SMART_V1_Launch_Roadmap.md` §3–§4   |
| Two-signal bar before company outreach                      | Launch roadmap §2                    |
| Automate only after ~100 manual project reviews             | Launch roadmap §5                    |
| Company artefact = Verified Talent Snapshot                 | Launch roadmap §6                    |
| Rules ranker, not cosine as P0                              | ADR-0012, AGILE_PLAN                 |
| North-star = Gold vs cohort interview/offer conversion      | Product core / TEAM framing          |
| DPDP before biometric proctoring                            | PRD §4.6, SE-T06 stub                |
| Marketplace after verification quality                      | Playbook §11 Phase 2 after Phase 0–1 |
| Phase 1 work-ex CRUD already on `dev`                       | PR #168 (S3-VB-WE-01)                |
| Remaining WE workflow                                       | Ticket **S6-VB-01** Excel            |
