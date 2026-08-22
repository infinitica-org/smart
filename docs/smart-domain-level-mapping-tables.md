# SMART — Domain-to-Level Mapping (Table Format)

### Each role's taxonomy mapped directly to L1–L5

**How to read every table below:**

- **L1 (Aptitude/Fundamentals)** tests the _knowledge_ layer of a domain — can they recall and reason about the concept correctly.
- **L2 (Applied/Programming)** tests the _doing_ layer — can they use the concept to build or solve something real.
- **L3 (Communication/Domain)** and **L4 (Verification)** draw specifically from each role's Domain E — the _explain-and-defend_ layer.
- **L5 (Capstone)** is integrative by design — it pulls from every domain at once inside one real deliverable, so it isn't listed as a separate row per domain, it sits underneath all of them.

---

## Role 1: Full Stack Developer

| Domain                         | Sub-Domain                      | Key Concepts                                              | Mapped Level                  | Assessment Format                          |
| ------------------------------ | ------------------------------- | --------------------------------------------------------- | ----------------------------- | ------------------------------------------ |
| A. Frontend Engineering        | Component architecture & state  | Lifecycle, props/state, hooks, conditional/list rendering | L1 (knowledge) → L2 (applied) | L1: MCQ · L2: sandboxed coding task        |
| A. Frontend Engineering        | Styling & responsive behavior   | Box model, flexbox/grid, breakpoints                      | L2                            | Sandboxed coding task                      |
| B. Backend Engineering         | API design                      | REST principles, HTTP methods/status, auth basics         | L1 (knowledge) → L2 (applied) | L1: MCQ · L2: build an endpoint            |
| B. Backend Engineering         | Server-side logic               | Middleware, error handling, async patterns                | L2                            | Sandboxed coding task                      |
| C. Data & Persistence          | Relational data                 | Schema design, joins, normalization, indexing             | L1 (knowledge) → L2 (applied) | L1: MCQ · L2: query task                   |
| C. Data & Persistence          | Document-based data             | Schema-less design, CRUD, aggregation                     | L2                            | Sandboxed task                             |
| D. Engineering Practice        | Version control & collaboration | Branching, PR review, conflict resolution                 | L2                            | Applied scenario question                  |
| D. Engineering Practice        | System design fundamentals      | Client-server model, caching, scalability trade-offs      | L2 → L4 (defended)            | Written justification · Oral defense       |
| **E. Technical Communication** | Trade-off articulation          | Explaining "why this approach," defending a decision      | **L3, L4**                    | Recorded structured response · 1:1 defense |
| _(All domains, integrated)_    | —                               | Build a scoped full-stack feature end-to-end              | **L5**                        | Real brief + deliverable + presentation    |

---

## Role 2: AI/ML Engineer

| Domain                                   | Sub-Domain                     | Key Concepts                                                  | Mapped Level                           | Assessment Format                          |
| ---------------------------------------- | ------------------------------ | ------------------------------------------------------------- | -------------------------------------- | ------------------------------------------ |
| A. Programming & Data Handling           | Core Python                    | Data structures, control flow, functions, basic OOP           | L1                                     | MCQ/numeric                                |
| A. Programming & Data Handling           | Data manipulation              | Filtering, grouping, merging, handling missing data           | L2                                     | Sandboxed coding task                      |
| B. ML Foundations                        | Supervised learning            | Regression vs. classification, model families                 | L1 (knowledge) → L2 (applied)          | L1: MCQ · L2: build & train a model        |
| B. ML Foundations                        | Model evaluation               | Splits, precision/recall/F1, overfitting/regularization       | L1 (knowledge) → L2 (applied)          | L1: MCQ · L2: evaluate model output        |
| C. Applied GenAI & LLMs                  | Prompt engineering             | Prompt patterns, zero-shot vs. few-shot                       | L2                                     | Applied task (design a prompt)             |
| C. Applied GenAI & LLMs                  | Retrieval-augmented generation | Embeddings, vector DB, chunking strategy                      | L2                                     | Build a basic RAG pipeline                 |
| C. Applied GenAI & LLMs                  | Model limitations              | Hallucination, context window, trust boundaries               | L2 (knowledge) → **L3/L4 (explained)** | Applied task + spoken explanation          |
| D. MLOps & Deployment                    | Model serving basics           | Exposing a trained model, versioning                          | L2                                     | Applied scenario question                  |
| D. MLOps & Deployment                    | Monitoring basics              | Model drift, ongoing evaluation                               | L1 (knowledge)                         | MCQ                                        |
| **E. Applied Judgment & Responsible AI** | Communicating model behavior   | Explaining failure modes, framing uncertainty, bias awareness | **L3, L4**                             | Recorded structured response · 1:1 defense |
| _(All domains, integrated)_              | —                              | Build and evaluate a small end-to-end ML/GenAI feature        | **L5**                                 | Real brief + deliverable + presentation    |

---

## Role 3: Data Analyst

| Domain                          | Sub-Domain               | Key Concepts                                                | Mapped Level                                | Assessment Format                       |
| ------------------------------- | ------------------------ | ----------------------------------------------------------- | ------------------------------------------- | --------------------------------------- |
| A. Data Querying & Manipulation | SQL                      | Joins, aggregations, window functions, subqueries           | L1 (knowledge) → L2 (applied)               | L1: MCQ · L2: live query task           |
| A. Data Querying & Manipulation | Python for data          | Dataframe operations, cleaning, merging                     | L2                                          | Sandboxed coding task                   |
| B. Statistics & Interpretation  | Descriptive statistics   | Central tendency, variance, distribution, outliers          | L1                                          | MCQ/numeric                             |
| B. Statistics & Interpretation  | Inferential basics       | Correlation vs. causation, hypothesis-testing intuition     | L1 (knowledge) → **L3 (applied reasoning)** | MCQ + explained in stakeholder scenario |
| C. Visualization & BI Tooling   | Dashboard construction   | Building a dashboard that answers a real question           | L2                                          | Tool-based task                         |
| C. Visualization & BI Tooling   | Chart-selection judgment | Matching chart type to data story                           | L2                                          | Tool-based task                         |
| **D. Business Translation**     | Metric and KPI reasoning | Defining a metric precisely, spotting gamed metrics         | **L3, L4**                                  | Recorded structured response            |
| **D. Business Translation**     | Recommendation framing   | Structuring a finding into an action, naming limitations    | **L3, L4**                                  | Recorded response · 1:1 defense         |
| E. AI-Assisted Analysis         | AI-assisted querying     | Using AI copilots, sanity-checking AI output                | L2                                          | Applied task                            |
| _(All domains, integrated)_     | —                        | Analyze a real dataset end-to-end, produce a recommendation | **L5**                                      | Real brief + deliverable + presentation |

---

## Role 4: Cloud/DevOps Engineer

| Domain                                 | Sub-Domain                  | Key Concepts                                              | Mapped Level                  | Assessment Format                       |
| -------------------------------------- | --------------------------- | --------------------------------------------------------- | ----------------------------- | --------------------------------------- |
| A. Systems Foundations                 | Linux fundamentals          | File system/permissions, shell scripting, processes       | L1 (knowledge) → L2 (applied) | L1: MCQ · L2: shell task                |
| A. Systems Foundations                 | Networking basics           | TCP/IP, DNS, load-balancing concepts                      | L1                            | MCQ                                     |
| B. Cloud Platform Fundamentals         | Core services               | Compute, storage, networking on chosen platform           | L1 (knowledge) → L2 (applied) | L1: MCQ · L2: platform task             |
| B. Cloud Platform Fundamentals         | Identity and access basics  | IAM fundamentals, least-privilege, firewall concepts      | L1                            | MCQ                                     |
| C. Containerization & Orchestration    | Docker                      | Images vs. containers, Dockerfile authoring               | L2                            | Sandboxed task                          |
| C. Containerization & Orchestration    | Kubernetes fundamentals     | Pods, deployments, services                               | L1 (conceptual)               | MCQ                                     |
| D. CI/CD & Automation                  | Pipeline design             | Build-test-deploy stages, failure diagnosis               | L2                            | Sandboxed task                          |
| D. CI/CD & Automation                  | Infrastructure as code      | Declarative config basics, IaC vs. manual changes         | L2                            | Sandboxed task                          |
| **E. Reliability & Incident Response** | Monitoring and logging      | What to monitor, reading logs to localize a problem       | **L2 → L3/L4**                | Applied task + spoken walkthrough       |
| **E. Reliability & Incident Response** | Troubleshooting methodology | Root-cause reasoning, communicating in-progress incidents | **L3, L4**                    | Recorded response · 1:1 defense         |
| _(All domains, integrated)_            | —                           | Deploy a real application with a working CI/CD pipeline   | **L5**                        | Real brief + deliverable + presentation |

---

## Role 5: Cybersecurity Analyst

| Domain                              | Sub-Domain                      | Key Concepts                                          | Mapped Level                   | Assessment Format                       |
| ----------------------------------- | ------------------------------- | ----------------------------------------------------- | ------------------------------ | --------------------------------------- |
| A. Networking & Systems Foundations | Networking fundamentals         | TCP/IP, protocols, firewall logic                     | L1                             | MCQ                                     |
| A. Networking & Systems Foundations | Linux and OS security basics    | Permissions, privilege management, hardening          | L1                             | MCQ                                     |
| B. Threat Landscape                 | Common attack patterns          | Phishing, malware categories, injection attacks       | L1                             | MCQ                                     |
| B. Threat Landscape                 | Vulnerability concepts          | CVE severity, OWASP Top 10 awareness                  | L1                             | MCQ                                     |
| C. Detection & Analysis             | Log analysis                    | Reading/correlating logs, signal vs. noise            | L2                             | Sandboxed analysis task                 |
| C. Detection & Analysis             | SIEM-tool fundamentals          | Conceptual fluency with event aggregation/flagging    | L1 (conceptual) → L2 (applied) | MCQ + applied task                      |
| **D. Incident Response**            | Triage and severity             | Classifying severity, identifying likely cause        | **L2 → L3/L4**                 | Applied task + spoken walkthrough       |
| **D. Incident Response**            | Documentation                   | Structured incident-report writing                    | **L3, L4**                     | Recorded response · 1:1 defense         |
| E. Specialization Awareness         | Offensive security basics       | Pen-testing concepts, OSCP-track awareness            | L1 (conceptual)                | MCQ                                     |
| E. Specialization Awareness         | Defensive/cloud security basics | Cloud-security fundamentals, directional awareness    | L1 (conceptual)                | MCQ                                     |
| _(All domains, integrated)_         | —                               | Triage and respond to a simulated incident end-to-end | **L5**                         | Real brief + deliverable + presentation |

---

## The pattern worth noticing across all five roles

In every table, **Domain A/B concepts skew toward L1 knowledge with an L2 applied layer**, **Domain C/D concepts skew toward L2 applied work**, and **exactly one domain per role — always labeled E, or D for Data Analyst and Cybersecurity — is the one that carries L3 and L4.** That's not a coincidence of formatting; it's the structural proof that every role has one clearly identified "communicate and defend" domain, not a vague soft-skills add-on bolted onto a technical test. L5 never appears as its own row because it isn't a domain — it's the place where every domain in the table above gets used together, under real conditions, in one sitting.
