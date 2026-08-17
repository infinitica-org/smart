# SMART — Role Assessment Blueprint: Full Stack Developer
### Domain → Sub-Domain → Concepts, with Level Weightages and Assessment Format

**Calibration note:** weightages are set at domain/sub-domain resolution and are an initial, data-informed starting allocation — to be validated and adjusted by the calibration panel each cohort cycle, the same Angoff-style process used throughout SMART. They are not fixed forever, and they should never be read as more precise than a first-pass allocation.

---

## Level 1 — Aptitude / Fundamentals (100 minutes → weighted 100%)

| Component | Weight in L1 |
|---|---|
| General Aptitude (quant, verbal, logical — role-agnostic) | 40% |
| Domain A — Frontend Engineering (knowledge layer) | 15% |
| Domain B — Backend Engineering (knowledge layer) | 15% |
| Domain C — Data & Persistence (knowledge layer) | 15% |
| Domain D — Engineering Practice (conceptual layer) | 15% |

Format: MCQ / numeric entry, automated scoring.

---

## Level 2 — Applied / Programming (weighted 100%)

| Domain | Weight in L2 |
|---|---|
| Domain A — Frontend Engineering | 25% |
| Domain B — Backend Engineering | 30% |
| Domain C — Data & Persistence | 25% |
| Domain D — Engineering Practice | 20% |

Format: sandboxed coding tasks + applied scenario questions, hybrid automated/rubric scoring.

---

## Level 3 — Communication / Domain (weighted 100%, drawn entirely from Domain E)

| Sub-Domain / Prompt Type | Weight in L3 |
|---|---|
| Explaining "why this approach" (trade-off rationale) | 30% |
| Articulating a debugging process aloud | 25% |
| Responding to a challenge to a design decision | 25% |
| Justifying a technology choice | 20% |

Format: recorded structured spoken response, BARS-anchored rubric.

---

## Level 4 — Verification (weighted 100%, defense of submitted work)

| Rubric Dimension | Weight in L4 |
|---|---|
| Depth of understanding | 35% |
| Ownership / originality of contribution | 30% |
| Quality of defense under follow-up questioning | 35% |

Format: 10–15 minute one-on-one recorded/live defense, universal reasoning rubric.

---

## Level 5 — Capstone (weighted 100%, integrates every domain above)

| Component | Weight in L5 |
|---|---|
| Checklist — functional/technical requirements met | 50% |
| Practitioner judgment — quality and defensibility of approach | 30% |
| Presentation and defense quality | 20% |

Format: real project brief, 5–7 day window, working deliverable + short presentation.

---

## Full Domain / Sub-Domain / Concept Table

| Domain | Sub-Domain | All Concepts | Mapped Level(s) | Assessment Format |
|---|---|---|---|---|
| A. Frontend Engineering | Component architecture & state management | Component lifecycle · props vs. state · useState · useEffect and dependency arrays · conditional rendering patterns · list rendering and key props · lifting state up · basic Context API usage · event handling in components · controlled vs. uncontrolled form inputs | L1 (knowledge), L2 (applied) | L1: MCQ · L2: sandboxed coding task |
| A. Frontend Engineering | Styling & responsive design | CSS box model · flexbox layout · CSS grid layout · responsive breakpoints/media queries · component-scoped styling (CSS modules/styled-components) · mobile-first design principles | L2 | Sandboxed coding task |
| B. Backend Engineering | API design | REST principles · HTTP methods (GET/POST/PUT/DELETE/PATCH) · HTTP status codes · request/response lifecycle · session-based authentication · JWT-based authentication · input validation and sanitization · API versioning basics | L1 (knowledge), L2 (applied) | L1: MCQ · L2: build an endpoint |
| B. Backend Engineering | Server-side logic | Middleware pattern · centralized error handling · async/await and promise handling · rate-limiting basics · environment configuration management · logging basics | L2 | Sandboxed coding task |
| C. Data & Persistence | Relational data | Schema design · primary/foreign keys · joins (inner/outer/left/right) · normalization (1NF–3NF) · indexing fundamentals · query optimization basics | L1 (knowledge), L2 (applied) | L1: MCQ · L2: query task |
| C. Data & Persistence | Document-based data | Schema-less design trade-offs · CRUD operations in MongoDB · basic aggregation pipeline · embedding vs. referencing documents · indexing in NoSQL | L2 | Sandboxed task |
| D. Engineering Practice | Version control & collaboration | Git branching strategy · pull request workflow · merge conflict resolution · commit message hygiene · code review etiquette · rebase vs. merge basics | L1 (conceptual), L2 (applied) | L1: MCQ · L2: applied scenario question |
| D. Engineering Practice | System design fundamentals | Client-server model · basic caching concepts · load balancing basics · horizontal vs. vertical scaling · API gateway concept · consistency-vs-availability trade-off reasoning | L2, L4 (defended) | Written justification · oral defense |
| E. Technical Communication | Trade-off articulation | Explaining architectural choice rationale · articulating a debugging process aloud · responding to design challenges · explaining code to a non-author · justifying a technology choice | L3, L4 | Recorded structured response · 1:1 defense |
| *(Integrated, all domains)* | — | End-to-end full-stack feature build against a real, scoped brief | L5 | Real brief + deliverable + presentation |
