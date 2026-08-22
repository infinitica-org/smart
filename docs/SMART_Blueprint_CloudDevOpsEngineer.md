# SMART — Role Assessment Blueprint v2: Cloud / DevOps Engineer

### Domain → Sub-Domain → Concept, with concept-level weights, mapped level, and format

**Calibration note:** concept-level weights are the calibration panel's first-pass judgment of relative importance, based on frequency/criticality in real current job postings and interview patterns — not a fixed psychometric fact. Weights sum to 100% within each sub-domain.

---

## Level weightage summary

| Level | Composition                                                                                |
| ----- | ------------------------------------------------------------------------------------------ |
| L1    | 40% general aptitude (OS/networking weighted) + 25% Domain A + 20% Domain B + 15% Domain C |
| L2    | 15% Domain A + 20% Domain B + 30% Domain C + 35% Domain D                                  |
| L3    | 40% infrastructure-decision explanation + 60% outage-diagnosis walkthrough                 |
| L4    | 30% depth of understanding + 30% ownership mindset + 40% defense quality                   |
| L5    | 50% checklist + 30% practitioner judgment + 20% presentation                               |

---

## Domain A — Systems Foundations

_Industry justification: Linux and networking fundamentals are named as the universal starting point across every source reviewed — the prerequisite layer beneath any cloud-specific skill._

**Sub-domain A1: Linux fundamentals**

| Concept                        | Weight in A1 | Level  | Format           |
| ------------------------------ | ------------ | ------ | ---------------- |
| File system structure          | 18%          | L1     | MCQ              |
| File permissions (chmod/chown) | 20%          | L1, L2 | MCQ / shell task |
| Shell scripting basics         | 25%          | L2     | Shell task       |
| Process management             | 20%          | L1     | MCQ              |
| Package management basics      | 17%          | L1     | MCQ              |

**Sub-domain A2: Networking basics**

| Concept                       | Weight in A2 | Level | Format |
| ----------------------------- | ------------ | ----- | ------ |
| TCP/IP fundamentals           | 30%          | L1    | MCQ    |
| DNS resolution                | 25%          | L1    | MCQ    |
| Basic load-balancing concepts | 25%          | L1    | MCQ    |
| Ports and protocols           | 20%          | L1    | MCQ    |

---

## Domain B — Cloud Platform Fundamentals

_Industry justification: hiring data consistently rewards depth in one platform over shallow familiarity with several — deliberately scoped to one platform (AWS/Azure/GCP), chosen at cohort level._

**Sub-domain B1: Core services**

| Concept                                                        | Weight in B1 | Level  | Format              |
| -------------------------------------------------------------- | ------------ | ------ | ------------------- |
| Compute service basics (VMs/instances)                         | 35%          | L1, L2 | MCQ / platform task |
| Storage service basics (object/block)                          | 30%          | L1, L2 | MCQ / platform task |
| Networking basics on the chosen platform (VPC/subnet concepts) | 35%          | L1, L2 | MCQ / platform task |

**Sub-domain B2: Identity and access basics**

| Concept                             | Weight in B2 | Level | Format |
| ----------------------------------- | ------------ | ----- | ------ |
| IAM fundamentals                    | 35%          | L1    | MCQ    |
| Principle of least privilege        | 25%          | L1    | MCQ    |
| Security-group/firewall rule basics | 25%          | L1    | MCQ    |
| Role-based access concepts          | 15%          | L1    | MCQ    |

---

## Domain C — Containerization & Orchestration

_Industry justification: Docker is now a baseline expectation, and Kubernetes fundamentals are increasingly named even at fresher level as the role matures._

**Sub-domain C1: Docker**

| Concept                     | Weight in C1 | Level  | Format               |
| --------------------------- | ------------ | ------ | -------------------- |
| Images vs. containers       | 25%          | L1, L2 | MCQ / sandboxed task |
| Dockerfile authoring        | 30%          | L2     | Sandboxed task       |
| Container networking basics | 25%          | L2     | Sandboxed task       |
| Volume/persistence basics   | 20%          | L2     | Sandboxed task       |

**Sub-domain C2: Kubernetes fundamentals**

| Concept                | Weight in C2 | Level | Format |
| ---------------------- | ------------ | ----- | ------ |
| Pods                   | 30%          | L1    | MCQ    |
| Deployments            | 30%          | L1    | MCQ    |
| Services               | 25%          | L1    | MCQ    |
| Basic scaling concepts | 15%          | L1    | MCQ    |

---

## Domain D — CI/CD & Automation

_Industry justification: infrastructure-as-code and pipeline tooling now appear as named, distinct requirements rather than stretch goals — this is where the role's actual daily output lives._

**Sub-domain D1: Pipeline design**

| Concept                           | Weight in D1 | Level | Format         |
| --------------------------------- | ------------ | ----- | -------------- |
| Build-test-deploy stage structure | 40%          | L2    | Sandboxed task |
| Pipeline failure diagnosis        | 35%          | L2    | Sandboxed task |
| Basic rollback concepts           | 25%          | L1    | MCQ            |

**Sub-domain D2: Infrastructure as code**

| Concept                                                 | Weight in D2 | Level | Format         |
| ------------------------------------------------------- | ------------ | ----- | -------------- |
| Declarative configuration basics (Terraform-equivalent) | 45%          | L2    | Sandboxed task |
| Why IaC exists vs. manual console changes               | 25%          | L1    | MCQ            |
| State management basics                                 | 30%          | L2    | Sandboxed task |

---

## Domain E — Reliability & Incident Response

_Industry justification: troubleshooting and root-cause reasoning under pressure is what this role actually does day to day — arguably the most job-relevant domain in the whole framework._

**Sub-domain E1: Monitoring and logging**

| Concept                            | Weight in E1 | Level  | Format                            |
| ---------------------------------- | ------------ | ------ | --------------------------------- |
| What to monitor and why            | 35%          | L2     | Applied task                      |
| Reading logs to localize a problem | 40%          | L2, L3 | Applied task / spoken walkthrough |
| Basic alerting concepts            | 25%          | L1     | MCQ                               |

**Sub-domain E2: Troubleshooting methodology**

| Concept                                       | Weight in E2 | Level  | Format                      |
| --------------------------------------------- | ------------ | ------ | --------------------------- |
| Structured root-cause reasoning               | 40%          | L3, L4 | Recorded response / defense |
| Communicating an in-progress incident clearly | 35%          | L3, L4 | Recorded response / defense |
| Prioritizing what to check first              | 25%          | L3     | Recorded response           |

---

## Level 5 — Capstone

Integrates all domains above into one real application deployment with a working CI/CD pipeline, evaluated per the L5 weightage table (checklist 50% / practitioner judgment 30% / presentation 20%).
