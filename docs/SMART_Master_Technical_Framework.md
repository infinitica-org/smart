# SMART — Technical Architecture & Feasibility Framework

> **Last Updated:** Today
> **Objective:** Define the complete technical feasibility, data pipelines, and evaluation architecture of the SMART framework. This document serves as the master blueprint for the engineering team to build a system that scales to 1 million users, verifies candidate knowledge, and guarantees the ultimate outcome: **Placement.**

---

## 1. Executive Summary & Core Philosophy

SMART is a **placement infrastructure layer** that sits between what academia teaches and what industry actually hires for. It certifies a student as Gold, Silver, or Bronze **for one specific role track** based on real competencies that role needs — not a generic aptitude score.

### 1.1 The Three Core Values
*   **Precision over breadth:** One role track done rigorously beats five done shallowly. Certificates are issued per specialization, not as one generic score.
*   **Transparency over authority:** Scoring methodology and cutoffs are visible, not a locked black box. A skeptical recruiter can click into how a tier was decided.
*   **Honesty over inflation:** Every report carries a confidence note stating the real sample size and calibration status behind it.

### 1.2 Claiming User Knowledge & The Outcome
We do not guess aptitude. We prove capability through a multi-method battery of tests (L1 to L5). The ultimate outcome is **Placement**, achieved by tracking whether certified students actually convert to better offers, feeding that evidence back to the institution, and performing direct data-matching with company requirements.

---

## 2. Objective 1: The SMART Framework & Scalability (1 Million Data Pipeline)

To handle 1 million candidates seamlessly, the technical architecture must be distributed, verifiable, and highly resilient.

### 2.1 Data Architecture for Scale
*   **Ingestion Layer:** High-throughput event streaming (Apache Kafka / AWS Kinesis) to capture granular assessment data (clicks, code compilation, time spent).
*   **Processing Engine:** 
    *   *Synchronous:* Real-time scoring for L1 using weighted item-response and eventually Item Response Theory (IRT).
    *   *Asynchronous:* Queuing system (SQS/RabbitMQ) for evaluating L2 sandboxed code execution and processing L3/L4 audio/video responses via LLM-assisted rubric grading.
*   **Storage Layer (Data Lake/Warehouse):** 
    *   *Relational DB (PostgreSQL):* For user profiles, cohort mappings, and final certificate data.
    *   *Data Lake (S3/GCS):* For storing L5 artifacts (codebases, financial models) and L3/L4 recorded defenses.

### 2.2 Core Data Model (Schema)
The relational schema required to power the SMART verification and tracking system:
```sql
Track             (track_id, name, foundation_weight)
Competency        (competency_id, track_id, name, real_world_source_weight)
Level             (level_id, track_id, level_number, format_type)
Item              (item_id, level_id, competency_id, item_type, difficulty_tag, active_flag)
CalibrationPanel  (panel_id, track_id, level_id, panelist_id, role_title, employer_name)
CutScoreEstimate  (estimate_id, panel_id, level_id, tier, estimated_value)
CutScore          (level_id, tier, mean_value, sd_value) -- derived from CutScoreEstimate
Student           (student_id, institution_id, cohort_id)
Attempt           (attempt_id, student_id, level_id, timestamp, integrity_flag)
Response          (response_id, attempt_id, item_id, raw_answer, score, rater_id)
LevelResult       (result_id, attempt_id, level_id, raw_score, tier_awarded, confidence_band)
Certificate       (certificate_id, student_id, track_id, highest_level, tier_trail_json, issued_date, verification_url)
CorrelationRecord (record_id, track_id, cohort_id, tier, placement_cycle, interview_rate, offer_rate)
```

### 2.3 Public Verification Pipeline
*   **Public URL:** `verify.smart.com/cert/<UUID>`
*   This page displays the candidate's **Tier Trail** (e.g., L1: Gold, L2: Silver, L3: Gold), the specific domains tested, the calibration panel's employer names, and the "Confidence Note" detailing the statistical validity of the score. This verified URL guarantees the authenticity of the knowledge claimed.

---

## 3. Objective 2: The Outcome — Placement & Company Overlay

The product's ultimate metric is the placement conversion rate. This requires a **Data Matching Pipeline** that overlays company requirements onto candidate profiles.

### 3.1 Company Overlay Engine
*   **Ingesting Job Descriptions (JDs):** NLP is used to parse unstructured JDs from hiring companies.
*   **Competency Mapping:** The JD is mapped to the SMART taxonomy (e.g., a JD asking for "React and Node.js" maps to *Full Stack Domain A & B*).
*   **Company Vectors:** The employer sets a threshold (e.g., "We need L2 Applied at Silver tier or above").

### 3.2 Candidate Matching Pipeline
*   **Matching Algorithm:** Candidate profiles (vectors of L1–L5 scores across domains) are matched against Company Vectors using cosine similarity and rule-based filtering.
*   **Auto-Shortlisting:** The placement office dashboard automatically generates filtered lists ("Show me all Gold Cloud/DevOps candidates") that can be handed directly to recruiters.
*   **Correlation Tracking:** Interview and offer conversion rates are fed back into the `CorrelationRecord` to validate the predictive power of the Gold rating.

---

## 4. The Level × Tier Architecture

A single MCQ score is insufficient evidence. Based on the Schmidt & Hunter evidence hierarchy, combining cognitive tests with structured interviews and work samples provides the highest predictive validity for job performance. SMART implements this via 5 levels.

### 4.1 The 5 Levels of Evaluation
| Level | Name | What it Measures | Assessment Format |
| :--- | :--- | :--- | :--- |
| **L1** | **Foundation (Aptitude & Fundamentals)** | *Knowledge.* Do you know the right concept? | MCQ, Numeric entry (Automated scoring, Item Response Theory). |
| **L2** | **Applied / Programming** | *Doing.* Can you apply it under realistic constraints? | Sandboxed coding tasks, SQL queries, applied case scenarios. Rubric-based. |
| **L3** | **Communication / Domain Knowledge** | *Explaining.* Can you communicate trade-offs? | Recorded structured spoken response (AI-assisted BARS grading). |
| **L4** | **Verification** | *Defending.* Can you defend your decisions? | 1:1 Live/AI simulation defense (Depth of understanding). |
| **L5** | **Capstone Project** | *Integration.* Can you produce a real day-one deliverable? | Real brief + Artifact upload + Short presentation (Checklist + Practitioner scored). |

*Progression Rule:* A student must clear L1 at Bronze or above to unlock L2, and L2 at Bronze or above to unlock L3. 

### 4.2 The Tiers (Gold / Silver / Bronze)
Tiers are assigned *per level* based on criterion-referenced scoring (Angoff method), not percentile ranks.
*   **Gold:** Ready now. Knows the domain cold, applies concepts with minimal guidance, produces deliverables usable with minor revision.
*   **Silver:** Directionally correct but needs supervised ramp-up. Solid knowledge with identifiable gaps.
*   **Bronze:** Core knowledge present, but not fully fluent. Attempts are structurally right but shallow.
*   *(Below Bronze is internally tracked as a gap report, never publicly labeled a "fail".)*

### 4.3 Scoring Engine Mechanics
*   **Level 1 (Weighted Item-Response):** Score = Σ (item_correct * competency_weight) / Σ (competency_weight).
*   **Confidence Band:** Cut_Gold = mean(panelist_estimates) ± SD(panelist_estimates). Displayed on the certificate.
*   **Level 2/3 (Mode-based Consensus BARS):** Scored using a Behaviorally Anchored Rating Scale (BARS).
*   **Level 5 (Split Scoring):** 50% objective checklist, 30% practitioner judgment rubric, 20% presentation.

---

## 5. Stakeholder Features & Business Model

### 5.1 Value-Driven Features
| Stakeholder | Key Features |
| :--- | :--- |
| **Placement Office** | Cohort readiness dashboard, Employer-ready shortlists, Gap report (identifies batch weaknesses), Placement-cycle correlation report. |
| **Student** | Confidence note, Shareable certificate (QR/Link), Specific skill gap feedback, Retest pathway for Silver/Bronze. |
| **Employer** | Public verification page, Named calibration employer credit (social proof). |

### 5.2 The "Standing Asset" Mechanism (Why they return)
*   Correlation reports are republished every placement cycle.
*   Gap reports change every batch.
*   Retest/growth pathways keep students engaged within a single season.

### 5.3 Revenue Model
*   **Institution Pays:** Priced per-cohort-per-cycle.
*   **Optional Student Add-on:** Nominal fee for deeper diagnostic reports (growth tool).

---

## 6. The 5-Week Build Plan (v1 vs Phase 2)

### 6.1 Realistic 5-Week Execution (v1)
| Week | Focus | Deliverable |
| :--- | :--- | :--- |
| **1** | Define roles precisely; recruit calibration panelists. | Locked competency list, panel scheduled. |
| **2** | Build item bank tagged by competency; run Angoff calibration. | Draft cut scores for Gold/Silver/Bronze. |
| **3** | Build assessment delivery and scoring engine (confidence logic). | Working assessment flow for 1 track. |
| **4** | Build verification page, student cert view, cohort dashboard. | Full v1 flow: assess → certify → verify → dashboard. |
| **5** | Pilot with one section/institution; instrument tracking mechanism. | Live pilot results. |

### 6.2 What is Technically Possible vs. Not Possible
*   **Possible in v1:** 3-tier criterion-referenced certification, published conversion-rate metric, recurring engagement loop, 2 validated lead tracks (e.g., Finance, Analytics).
*   **Possible in Phase 2:** True CFA-style L1/L2/L3 ladder, "Advanced" tier for Gold students, full statistical validation, IRT-based adaptive delivery, LLM-assisted L2/L3 scoring at scale.
*   **Not Possible (Do Not Pitch):** Guaranteeing a specific salary number tied to a tier. A black-box score with no visible methodology. Treating Bronze/Silver students as dead ends.

---

## 7. Role Blueprints & Domain Mapping

The taxonomy maps each role's key concepts to L1-L5. The major focus is on **IT Roles**, but MBA tracks are also fully architected.

### 7.1 IT Roles (Major Focus)

#### Role 1: Full Stack Developer
| Domain | Sub-Domain | Mapped Level | Format |
| :--- | :--- | :--- | :--- |
| **A. Frontend** | Component architecture, state management, CSS, responsive design. | L1 (know) → L2 (apply) | MCQ / Sandbox |
| **B. Backend** | REST APIs, Middleware, Async logic, Auth. | L1 (know) → L2 (apply) | MCQ / Sandbox |
| **C. Data** | Relational data (SQL), Document-based (MongoDB). | L1 (know) → L2 (apply) | MCQ / Sandbox |
| **D. Practice** | Version control, PRs, System design fundamentals. | L2 → L4 (defend) | Scenario / Defense |
| **E. Comm** | Explaining trade-offs, debugging aloud, justifying tech choice. | L3, L4 | Recorded / Defense |
| **Capstone** | End-to-end full-stack feature build against a scoped brief. | L5 | Deliverable + Pres. |

#### Role 2: AI/ML Engineer
| Domain | Sub-Domain | Mapped Level | Format |
| :--- | :--- | :--- | :--- |
| **A. Programming**| Core Python, Data manipulation (pandas). | L1 → L2 | MCQ / Sandbox |
| **B. ML Found.** | Supervised learning, model evaluation, overfitting. | L1 → L2 | MCQ / Sandbox |
| **C. GenAI** | Prompt engineering, RAG pipelines, model limitations. | L2 → L3/L4 | Sandbox / Spoken |
| **D. MLOps** | Model serving basics, monitoring (model drift). | L1 → L2 | MCQ / Scenario |
| **E. Judgment** | Communicating model behavior, framing uncertainty/bias. | L3, L4 | Recorded / Defense |
| **Capstone** | Build and evaluate a small end-to-end ML/GenAI feature. | L5 | Deliverable + Pres. |

#### Role 3: Cloud / DevOps Engineer
| Domain | Sub-Domain | Mapped Level | Format |
| :--- | :--- | :--- | :--- |
| **A. Systems** | Linux fundamentals, TCP/IP, bash scripting. | L1 → L2 | MCQ / Sandbox |
| **B. Cloud** | Core compute/storage (AWS/GCP/Azure), IAM basics. | L1 → L2 | MCQ / Sandbox |
| **C. Containers** | Docker, Kubernetes fundamentals (Pods, Deployments). | L1 → L2 | MCQ / Sandbox |
| **D. CI/CD** | Pipeline design, Infrastructure as Code (Terraform). | L1 → L2 | MCQ / Sandbox |
| **E. Reliability**| Monitoring/logging, Troubleshooting root-cause, incident comms. | L2 → L4 | Sandbox / Defense |
| **Capstone** | Deploy application with a working CI/CD pipeline. | L5 | Deliverable + Pres. |

#### Role 4: Cybersecurity Analyst
| Domain | Sub-Domain | Mapped Level | Format |
| :--- | :--- | :--- | :--- |
| **A. Networking** | TCP/IP, Firewall logic, OS hardening basics. | L1 | MCQ |
| **B. Threats** | Phishing, Malware, Injection attacks, CVEs, OWASP Top 10. | L1 | MCQ |
| **C. Detection** | Log analysis, SIEM-tool fundamentals. | L1 → L2 | MCQ / Sandbox |
| **D. Incident** | Triage and severity, Documentation, Containment logic. | L2 → L4 | Sandbox / Defense |
| **E. Awareness** | Offensive vs Defensive basics, Cloud security basics. | L1 | MCQ |
| **Capstone** | Triage and respond to a simulated incident end-to-end. | L5 | Deliverable + Pres. |

#### Role 5: Data Analyst
| Domain | Sub-Domain | Mapped Level | Format |
| :--- | :--- | :--- | :--- |
| **A. Querying** | SQL (Joins, Window functions), Python for data (pandas). | L1 → L2 | MCQ / Sandbox |
| **B. Statistics** | Descriptive stats, Inferential basics (Correlation vs Causation). | L1 → L3 | MCQ / Spoken |
| **C. Visuals** | Dashboard construction (PowerBI/Tableau), chart selection. | L2 | Sandbox |
| **D. Translation**| Metric/KPI reasoning, Recommendation framing. | L3, L4 | Recorded / Defense |
| **E. AI-Assisted**| AI-assisted querying, sanity-checking AI output. | L2 | Sandbox |
| **Capstone** | Analyze dataset end-to-end and produce recommendation deck. | L5 | Deliverable + Pres. |

### 7.2 MBA Roles (Secondary Scaling Tracks)

*   **Business Analytics:** Data querying (SQL/Excel), Statistical reasoning, BI Dashboarding, Recommendation framing, Data storytelling.
*   **Finance:** Financial statement analysis, Valuation & Capital budgeting (DCF, NPV), Applied financial modeling (3-statement model), Risk & Working capital management.
*   **Human Resources:** Recruitment & Talent judgment, Employee relations (conflict/grievance), HR metrics literacy (attrition, engagement), Org & culture reasoning.
*   **Marketing:** Market sizing & segmentation, Campaign & positioning judgment, Marketing metrics (CAC, LTV, ROMI), Consumer behavior reasoning.
*   **Operations:** Process & supply chain problem solving, Quantitative operations (EOQ, safety stock), Quality improvement (Six Sigma, DMAIC), Negotiation & Vendor judgment.

*(All MBA roles culminate in an L5 Capstone involving a real, anonymized business case, scored via checklist and practitioner presentation).*

---
**Conclusion for Engineering (Ramansh Team):**
This master document consolidates all strategic, taxonomic, and technical requirements into a single framework. The immediate priority is standing up the asynchronous data ingestion pipeline and the company matching overlay, allowing SMART to process 1 million candidates and automatically place them into roles based on verified, granular knowledge proofs.
