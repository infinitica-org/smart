# SMART — UI/UX Design Brief

### For Product Designers | Companion to the SMART PRD v1.0

| Field          | Detail                                                                                  |
| -------------- | --------------------------------------------------------------------------------------- |
| Purpose        | Give designers a screen-by-screen map of every feature, state, and flow needed per role |
| Companion docs | `SMART_PRD_v1.md`, architecture/process diagrams, dashboard wireframes already shared   |
| Priority tags  | **[M]** Must-have V1 · **[S]** Should-have V1 · **[V2]** Phase 2 · **[V3]** Phase 3     |

---

## 1. How to Use This Document

This is not a visual style guide — it's the **functional brief**: what has to exist on each screen, what data it shows, what states it must handle, and how a person moves through it. Treat every row in Section 4 as a mini design ticket. Section 6 is a checklist to run against _every_ screen before calling it done, since most of the risk in this product lives in states designers forget to draw (processing, locked, flagged, expired).

---

## 2. Cross-Cutting Design Principles

These apply everywhere, not just on one role's screens — call them out because they're easy to violate one screen at a time without a reviewer noticing the pattern break.

1. **Verification must feel earned, not gatekept.** The same visual language for Verified / Pending / Locked / Expiring must appear identically on the candidate's own profile, the TPO's dashboard, the company's ATS card, and the public profile page. A candidate should never see a badge that reads differently depending on who's looking at it.
2. **Proctoring UX reduces anxiety, it doesn't add to it.** Every permission request (camera, mic, screen) needs a plain-language reason before the browser prompt fires. The pre-check flow should end with a clear, calm confirmation, not a warning.
3. **Interviews and assessments should feel conversational.** Favor a chat or video-call metaphor over a dense exam-form layout — this is explicitly called out in the PRD as "interviews must feel natural, not artificial."
4. **Every AI decision needs a visible "why."** A score alone (81%, Flagged, Locked) is not a complete design — there must always be a one-line explanation surface next to it. This is a mandatory component, not a nice-to-have tooltip.
5. **The company side stays deliberately lean.** No bulk-select, no "export CSV," no searchable raw candidate table. Interactions are profile-card based. This is a product constraint, not a missing feature — don't design around it.
6. **One state language, everywhere.** Verified (green) / In progress (blue) / Pending review (amber) / Locked (red) / Expiring soon (amber outline) — reuse these exact five states and colors across all four roles.

---

## 3. Information Architecture — Navigation per Role

```
SUPER ADMIN              ACADEMIA (TPO)           CANDIDATE                COMPANY
├─ Dashboard             ├─ Dashboard             ├─ Dashboard             ├─ Dashboard
├─ Institutions          ├─ Candidates            ├─ My Applications       ├─ My Openings
├─ Companies             ├─ Placements            ├─ Assessments           ├─ ATS (Kanban)
├─ Taxonomy Manager      ├─ Batches               ├─ Interviews            ├─ Notifications
├─ Pricing & Flags       ├─ Reports [S]           ├─ Profile               └─ Company Settings
├─ Monitoring            ├─ Settings              │   ├─ Basic / Education
├─ Audit Log             └─ Assessment/Interview  │   ├─ Skills
├─ Team & RBAC [S]           Builder [V2]         │   ├─ Projects
└─ Candidate Viewer                                │   └─ Languages
    (read-only, logged)                            ├─ Public Profile
                                                    └─ Jobs Feed [V2]
```

---

## 4. Screen-by-Screen Specification

### 4.1 Super Admin

| Screen                    | Purpose                                          | Key components                                                                      | Critical states                                  | Priority |
| ------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------ | -------- |
| Dashboard                 | Platform-wide operational overview               | Metric cards, verification queue list, audit log feed, plan distribution panel      | Empty queue, loading metrics                     | M        |
| Institutions — list       | Browse/search/filter all academia accounts       | Table/card list, filters (domain, plan, status), "Add institution" CTA              | Empty state, no-results-for-filter               | M        |
| Institution — detail/edit | CRUD a single institution + SSO config           | Profile form, domain mapping selector, SSO connection status, deactivate action     | Unsaved changes warning, SSO connection failed   | M        |
| Companies — list & detail | Mirror of Institutions, for company tenants      | Same pattern as above, plus sector/mode/size fields                                 | Same as above                                    | M        |
| Verification queue        | Review self-onboarded academia/company signups   | Document viewer, applicant summary, Approve/Reject with mandatory reason field      | Pending, approved, rejected, resubmitted         | M        |
| Taxonomy manager          | Curate domains, skill pools, proficiency rubrics | Domain tree editor, skill list per domain, rubric editor (thresholds per level)     | Draft vs published taxonomy version              | M        |
| Pricing & feature flags   | Define plans and toggle features per tenant      | Plan cards (Free/Basic/Pro), feature toggle matrix, per-tenant override view        | Flag conflict warning                            | M        |
| Monitoring & security     | Infra health, uptime, alerts                     | Status strip (uptime/error rate), incident list, severity badges                    | No incidents (clean) vs active incident (urgent) | M        |
| Audit log                 | Searchable log of all sensitive admin actions    | Filterable table, actor/action/timestamp/reason columns                             | Empty search result                              | M        |
| Candidate profile viewer  | Brief read-only view of any candidate            | Reason-code prompt modal _before_ profile loads, summary card, "view logged" notice | Access-denied (no reason given)                  | M        |
| Team & RBAC               | Manage internal admin users and their scopes     | User list, role assignment, invite flow                                             | —                                                | S        |

### 4.2 Academia (TPO)

| Screen                      | Purpose                                                    | Key components                                                                                     | Critical states                                               | Priority |
| --------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | -------- |
| Dashboard                   | Daily operational view (see wireframe already shared)      | Metric cards, skill verification snapshot, placement pipeline bar, batch readiness, skill-gap list | Empty cohort (new institution)                                | M        |
| Candidates — list           | Manage the student roster                                  | Table/card list, filters (batch, verification status, skill), bulk-select for provisioning         | Empty roster, bulk-upload in progress                         | M        |
| Candidate — detail          | Single-student view for TPO                                | Profile summary, verified skills, project verification status, application history                 | Locked skill indicator with cooldown date                     | M        |
| Candidate provisioning      | Bulk-add students                                          | CSV/Excel upload widget, column-mapping step, invite-preview, send-invites confirmation            | Upload error (bad format), partial success (some rows failed) | M        |
| Placements — JD inbox       | See incoming JDs from companies                            | List of JDs with status (New / Matching / Shortlisting / Sent)                                     | New JD unread indicator                                       | M        |
| Placement — JD detail       | Review ranked candidates and shortlist                     | Ranked candidate list with match score, shortlist action, "why this match" panel per candidate     | Matching-in-progress (async), no matches found                | M        |
| Opportunity tracking        | See candidates who opted in and their AI confidence status | List with status (Awaiting opt-in / Interview scheduled / Scored / Sent to company)                | Confidence interview pending vs completed                     | M        |
| Batches — list & detail     | Manage cohorts                                             | Batch list, create/edit form, roster view, batch-level analytics panel                             | Empty batch                                                   | M        |
| Reports / compliance export | Generate placement evidence for accreditation              | Report builder (date range, batch, format), export/download action                                 | Export generating (async), export ready                       | S        |
| Settings                    | Plan status, TPO team, notification prefs                  | Plan badge (with verification status if pending), team member list, notification toggle list       | Plan pending verification banner                              | M        |
| Assessment builder          | Add a drive-specific supplementary round                   | Builder canvas, question bank picker, parameter form                                               | —                                                             | V2       |
| Interview builder           | Add drive-specific interview parameters                    | Parameter form, question set picker                                                                | —                                                             | V2       |

### 4.3 Candidate

This is the largest surface — break it into onboarding, profile, verification, and applications.

**Onboarding wizard (first login)**

| Step                     | Purpose                                                                | Key components                                                                                                                                  | Critical states                                           |
| ------------------------ | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Forced password reset    | Security requirement                                                   | Password form with strength indicator                                                                                                           | Weak password error                                       |
| Resume upload            | Kick off AI pre-fill                                                   | Drag-and-drop upload, parsing progress                                                                                                          | Parsing in progress, parse failed (manual entry fallback) |
| Mandatory profile fields | Location, phone, LinkedIn, education, skills, languages, job interests | Multi-step form, **skill picker scoped to chosen domain** with proficiency selector (Beginner/Intermediate/Advanced), language + fluency picker | Incomplete-field validation, domain not yet selected      |
| Consent screens          | DPDP-aligned consent for assessment/proctoring data                    | Plain-language consent copy, explicit opt-in checkboxes (not pre-checked)                                                                       | Consent declined (blocks progression, explains why)       |
| Completion gate          | Unlock the rest of the platform                                        | Progress summary, "You're all set" confirmation                                                                                                 | —                                                         |

| Screen                                  | Purpose                                                          | Key components                                                                                                                                                      | Critical states                                                                        | Priority |
| --------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------- |
| Dashboard                               | Home view (see wireframe already shared)                         | Metric cards, verified skill chips, application tracker, public profile card                                                                                        | New-user empty state (before verification starts)                                      | M        |
| Profile — basic/education/experience    | Standard profile sections                                        | Standard forms                                                                                                                                                      | Incomplete section indicator                                                           | M        |
| Profile — skills                        | Declare skills + proficiency, view verification status per skill | Skill picker (domain-scoped pool), proficiency selector, **status badge per skill** (Declared / In verification / Verified / Demoted / Locked + cooldown countdown) | Locked-with-cooldown (show exact unlock date), expiring-soon                           | M        |
| Profile — projects                      | Submit projects for verification                                 | Template-driven form (problem/approach/stack/outcome), Loom embed field, optional GitHub link field                                                                 | Submission processing (async — needs visible ETA/spinner state, this can take minutes) | M        |
| Project verification report             | Show the AI's findings on a submitted project                    | Score summary, flag list (plagiarism/tech-age/relevance), plain-language explanation panel                                                                          | Clean / borderline-under-review / rejected-with-appeal-option                          | M        |
| Skill assessment (in-session)           | Timed technical/cognitive test                                   | Question panel, timer, progress indicator, proctoring status strip (always visible, non-intrusive)                                                                  | Auto-submit on timeout, connection-lost mid-test                                       | M        |
| Skill/confidence interview (in-session) | AI-driven structured interview                                   | Video/chat-call layout, question prompts, recording indicator                                                                                                       | Mic/camera check failed pre-session                                                    | M        |
| Proctoring pre-check                    | ID + liveness + environment + mic + network check                | Step-by-step wizard, live camera preview, calibration confirmation per step                                                                                         | Any check failed (clear retry path, not a dead end)                                    | M        |
| Assessments / Interviews inbox          | Upcoming scheduled items                                         | List with type, date, and a "start" action that only enables near the scheduled window                                                                              | Nothing scheduled (empty state)                                                        | M        |
| Cognitive & communication profile       | View own strengths/weaknesses narrative                          | Narrative summary, refresh-due indicator                                                                                                                            | Refreshing (async)                                                                     | M        |
| My Applications                         | Track application status                                         | List with status timeline (mirrors company ATS stage)                                                                                                               | No applications yet                                                                    | M        |
| Public profile                          | Shareable, view-only page                                        | Section visibility toggles (candidate-controlled), embedded project videos, verified badges                                                                         | Nothing shared yet (guides candidate to enable sections)                               | M        |
| Appeal flow                             | Contest a flag or lock                                           | Reason form, evidence upload, status tracker                                                                                                                        | Appeal pending / resolved                                                              | S        |
| Jobs feed                               | Self-serve browse of matched jobs                                | Feed with match-score chips                                                                                                                                         | —                                                                                      | V2       |

### 4.4 Company

| Screen                                | Purpose                                          | Key components                                                                                                                | Critical states                                                 | Priority |
| ------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------- |
| Dashboard                             | Overview (see wireframe already shared)          | Metric cards, pipeline overview bar, recent-matches list                                                                      | No openings posted yet                                          | M        |
| My Openings — list                    | Manage job postings                              | List/card view, status (Draft/Active/Closed), "Post new job" CTA                                                              | Empty state                                                     | M        |
| Job posting form                      | Create/edit a JD                                 | Structured form: domain, required skills **with minimum proficiency**, experience range, location, employment type, headcount | Required-skill validation (must map to taxonomy, not free text) | M        |
| ATS — Kanban board                    | Manage the curated pipeline                      | Columns: New Matches → Shortlisted → AI-Verified → Interviewing → Offer → Hired/Rejected; drag-and-drop card                  | Empty column, new-match unread indicator                        | M        |
| Candidate profile card (drawer/modal) | View a single candidate — read-only              | Verified skill badges, cognitive/comm summary, embedded project videos, confidence score with explanation                     | No "download" or "export" affordance — by design                | M        |
| Filters panel                         | Narrow the ATS view                              | Filter by skill, proficiency, confidence score, institution, location                                                         | No-results state                                                | S        |
| Company settings                      | Profile, sector/mode/domain, verification status | Read display of super-admin-set fields, plan badge                                                                            | Verification pending banner                                     | M        |
| Notifications                         | Alerts on new matches/stage-relevant events      | Notification list/panel                                                                                                       | Empty                                                           | S        |
| Multi-seat team accounts              | Multiple recruiter logins                        | Team member list, invite flow                                                                                                 | —                                                               | V2       |

---

## 5. Shared / Cross-Role Screens

| Screen                      | Applies to        | Notes                                                                                                                                                      |
| --------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login / SSO selection       | All roles         | Academia → Microsoft Entra ID; Company → Google Workspace or Microsoft; Candidate/internal TPO users without SSO → email + password                        |
| Self-onboarding signup      | Academia, Company | Ends in a **"verification pending"** state screen — must clearly explain what happens next and roughly how long it takes, so it doesn't read as a dead end |
| Notification center pattern | All roles         | Same visual pattern (bell icon, unread count, panel list) reused across roles — don't let each role invent its own                                         |

---

## 6. States Checklist — Run This Against Every Screen

| State                     | When it occurs                                                                               | Design requirement                                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Empty                     | No data yet (new user/tenant)                                                                | Should invite action, never look broken                                                                                   |
| Loading (sync)            | Normal data fetch                                                                            | Skeleton, not spinner-only, where layout is predictable                                                                   |
| Processing (async AI job) | Plagiarism check, code-quality read, proctoring analysis, cognitive scoring                  | **Must show visible progress or ETA language** — these can take minutes, not seconds; a silent spinner will read as a bug |
| Pending human review      | Borderline plagiarism/proctoring flag                                                        | Distinct from both "processing" and "rejected" — must say a person is looking at it                                       |
| Locked / cooldown         | Skill locked after failed reattempt                                                          | Must show the exact unlock date, not just "locked"                                                                        |
| Expiring soon             | Verified skill nearing revalidation window                                                   | Amber, actionable (link to re-verify), not alarming                                                                       |
| Error / failed            | Upload fail, connection drop mid-assessment, SSO failure                                     | Always paired with a clear next step, never a dead end                                                                    |
| Access denied / gated     | Candidate before mandatory onboarding complete; Super Admin profile view without reason code | Explain _why_, and what unlocks it                                                                                        |

---

## 7. Recurring Components to Design Once, Reuse Everywhere

- **Verification status badge** — five states (Declared / In progress / Verified / Locked / Expiring), one color system, used on candidate profile, TPO dashboard, company card, and public profile identically.
- **AI explanation panel** — a small, consistent "why" component attached to any score, flag, or match result.
- **Confidence / Integrity score meter** — same visual treatment whether it's a placement confidence score or a proctoring integrity score.
- **Skill proficiency selector** — domain-scoped dropdown/pool picker, reused in onboarding and profile editing.
- **Proctoring pre-check wizard** — one shared step-by-step component for every assessment/interview entry point.
- **Pipeline/funnel stage bar** — same component powers the TPO placement pipeline and the Company ATS overview, just relabeled.
- **Candidate profile card** — the single read-only view used by both TPO and Company, with role-based visibility rules rather than two different components.
