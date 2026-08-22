# SMART — Role Assessment Blueprint v2: Cybersecurity Analyst

### Domain → Sub-Domain → Concept, with concept-level weights, mapped level, and format

**Calibration note:** concept-level weights are the calibration panel's first-pass judgment of relative importance, based on frequency/criticality in real current job postings and interview patterns — not a fixed psychometric fact. Weights sum to 100% within each sub-domain.

---

## Level weightage summary

| Level | Composition                                                                             |
| ----- | --------------------------------------------------------------------------------------- |
| L1    | 40% general aptitude (networking weighted) + 25% Domain A + 20% Domain B + 15% Domain E |
| L2    | 55% Domain C + 45% Domain D                                                             |
| L3    | 60% business-impact explanation + 40% incident-report communication                     |
| L4    | 35% depth of understanding + 30% documentation quality + 35% defense quality            |
| L5    | 50% checklist + 30% practitioner judgment + 20% presentation                            |

---

## Domain A — Networking & Systems Foundations

_Industry justification: named as the universal starting point across every source — nothing else in this role is teachable without this layer first._

**Sub-domain A1: Networking fundamentals**

| Concept                                | Weight in A1 | Level | Format |
| -------------------------------------- | ------------ | ----- | ------ |
| TCP/IP fundamentals                    | 30%          | L1    | MCQ    |
| Common protocols (HTTP/HTTPS/DNS/SMTP) | 25%          | L1    | MCQ    |
| Firewall logic                         | 25%          | L1    | MCQ    |
| Basic packet-flow reasoning            | 20%          | L1    | MCQ    |

**Sub-domain A2: Linux and OS security basics**

| Concept                            | Weight in A2 | Level | Format |
| ---------------------------------- | ------------ | ----- | ------ |
| File permissions                   | 25%          | L1    | MCQ    |
| User and privilege management      | 30%          | L1    | MCQ    |
| Common OS-level hardening concepts | 25%          | L1    | MCQ    |
| Basic system logging locations     | 20%          | L1    | MCQ    |

---

## Domain B — Threat Landscape

_Industry justification: real SOC L1 hiring explicitly tests pattern recognition of known attack types before anything more advanced — the entry-level knowledge floor._

**Sub-domain B1: Common attack patterns**

| Concept                                             | Weight in B1 | Level | Format |
| --------------------------------------------------- | ------------ | ----- | ------ |
| Phishing techniques                                 | 30%          | L1    | MCQ    |
| Malware categories (virus/worm/ransomware/trojan)   | 25%          | L1    | MCQ    |
| Injection-style attacks (SQL injection, XSS basics) | 25%          | L1    | MCQ    |
| Social engineering basics                           | 20%          | L1    | MCQ    |

**Sub-domain B2: Vulnerability concepts**

| Concept                                                | Weight in B2 | Level | Format |
| ------------------------------------------------------ | ------------ | ----- | ------ |
| What a CVE is and how severity is judged (CVSS basics) | 40%          | L1    | MCQ    |
| Baseline awareness of the OWASP Top 10 class of issues | 35%          | L1    | MCQ    |
| Patch management basics                                | 25%          | L1    | MCQ    |

---

## Domain C — Detection & Analysis

_Industry justification: this is the actual daily task of a SOC L1 analyst — the fresher entry point named consistently across sources, so it carries the deepest applied testing._

**Sub-domain C1: Log analysis**

| Concept                               | Weight in C1 | Level | Format                  |
| ------------------------------------- | ------------ | ----- | ----------------------- |
| Reading and correlating logs          | 40%          | L2    | Sandboxed analysis task |
| Distinguishing signal from noise      | 35%          | L2    | Sandboxed analysis task |
| Timeline reconstruction from log data | 25%          | L2    | Sandboxed analysis task |

**Sub-domain C2: SIEM-tool fundamentals**

| Concept                                                        | Weight in C2 | Level  | Format             |
| -------------------------------------------------------------- | ------------ | ------ | ------------------ |
| Conceptual fluency with how a SIEM aggregates and flags events | 40%          | L1     | MCQ                |
| Basic alert-tuning awareness                                   | 30%          | L2     | Applied task       |
| False-positive vs. true-positive reasoning                     | 30%          | L1, L2 | MCQ / applied task |

---

## Domain D — Incident Response

_Industry justification: the ability to triage, not just detect, is what separates a certified candidate from an actually deployable one._

**Sub-domain D1: Triage and severity**

| Concept                              | Weight in D1 | Level  | Format                            |
| ------------------------------------ | ------------ | ------ | --------------------------------- |
| Classifying an incident's severity   | 35%          | L2, L3 | Applied task / spoken walkthrough |
| Identifying the likely cause quickly | 35%          | L2     | Applied task                      |
| Immediate containment-step reasoning | 30%          | L2, L4 | Applied task / defense            |

**Sub-domain D2: Documentation**

| Concept                                                      | Weight in D2 | Level  | Format                      |
| ------------------------------------------------------------ | ------------ | ------ | --------------------------- |
| Writing a clear, structured incident report                  | 40%          | L3, L4 | Recorded response / defense |
| Communicating business impact to a non-technical stakeholder | 40%          | L3, L4 | Recorded response / defense |
| Composure when explaining an unresolved problem              | 20%          | L4     | Defense                     |

---

## Domain E — Specialization Awareness

_Industry justification: the role has a well-defined branch point (offensive vs. defensive) — testing directional awareness at fresher level mirrors how the real career ladder works, without forcing premature specialization._

**Sub-domain E1: Offensive security basics**

| Concept                                        | Weight in E1 | Level | Format |
| ---------------------------------------------- | ------------ | ----- | ------ |
| Penetration-testing concepts                   | 45%          | L1    | MCQ    |
| Directional awareness of the OSCP career track | 30%          | L1    | MCQ    |
| Basic reconnaissance concepts                  | 25%          | L1    | MCQ    |

**Sub-domain E2: Defensive/cloud security basics**

| Concept                                           | Weight in E2 | Level | Format |
| ------------------------------------------------- | ------------ | ----- | ------ |
| Cloud-security fundamentals                       | 40%          | L1    | MCQ    |
| Directional awareness of that specialization path | 30%          | L1    | MCQ    |
| Shared-responsibility-model basics                | 30%          | L1    | MCQ    |

---

## Level 5 — Capstone

Integrates all domains above into one simulated security incident triaged and responded to end-to-end, evaluated per the L5 weightage table (checklist 50% / practitioner judgment 30% / presentation 20%).
