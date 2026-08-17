# SMART — Role Assessment Blueprint v2: AI/ML Engineer
### Domain → Sub-Domain → Concept, with concept-level weights, mapped level, and format

**Calibration note:** concept-level weights are the calibration panel's first-pass judgment of relative importance, based on frequency/criticality in real current job postings and interview patterns — not a fixed psychometric fact. Weights sum to 100% within each sub-domain.

---

## Level weightage summary

| Level | Composition |
|---|---|
| L1 | 40% general aptitude (stats/probability weighted) + 15% Domain A + 25% Domain B + 20% Domain D |
| L2 | 20% Domain A + 30% Domain B + 35% Domain C + 15% Domain D |
| L3 | 100% Domain E (35% failure-mode explanation / 30% confidence framing / 35% bias awareness) |
| L4 | 35% depth of understanding + 25% ownership + 40% defense quality |
| L5 | 50% checklist + 30% practitioner judgment + 20% presentation |

---

## Domain A — Programming & Data Handling
*Industry justification: Python appears in almost every AI job description reviewed — the one universal prerequisite across every sub-specialization.*

**Sub-domain A1: Core Python**

| Concept | Weight in A1 | Level | Format |
|---|---|---|---|
| Data structures (lists, dicts, sets, tuples) | 22% | L1 | MCQ |
| Control flow | 15% | L1 | MCQ |
| Functions and scope | 18% | L1 | MCQ |
| Basic OOP (classes, inheritance) | 20% | L1 | MCQ |
| Exception handling | 15% | L1 | MCQ |
| List/dict comprehensions | 10% | L1 | MCQ |

**Sub-domain A2: Data manipulation**

| Concept | Weight in A2 | Level | Format |
|---|---|---|---|
| Dataframe filtering and selection | 20% | L2 | Coding task |
| Grouping and aggregation | 20% | L2 | Coding task |
| Merging/joining datasets | 18% | L2 | Coding task |
| Handling missing data | 22% | L2 | Coding task |
| Basic feature engineering | 20% | L2 | Coding task |

---

## Domain B — Machine Learning Foundations
*Industry justification: this layer separates "uses AI tools" from "can build and evaluate a model" — the exact distinction NASSCOM's 3:1 demand-supply gap is describing.*

**Sub-domain B1: Supervised learning**

| Concept | Weight in B1 | Level | Format |
|---|---|---|---|
| Regression vs. classification | 20% | L1, L2 | MCQ / build task |
| Common model families (linear, tree-based, basic neural nets) | 25% | L1, L2 | MCQ / build task |
| When each model family applies | 20% | L1 | MCQ |
| Bias-variance intuition | 20% | L1 | MCQ |
| Feature scaling/preprocessing relevance to model choice | 15% | L2 | Applied task |

**Sub-domain B2: Model evaluation**

| Concept | Weight in B2 | Level | Format |
|---|---|---|---|
| Train/validation/test splits | 18% | L1, L2 | MCQ / evaluate task |
| Precision, recall, F1 and when each matters | 25% | L1, L2 | MCQ / evaluate task |
| Confusion matrix interpretation | 17% | L1, L2 | MCQ / evaluate task |
| Overfitting and underfitting | 22% | L1 | MCQ |
| Regularization basics | 18% | L1 | MCQ |

---

## Domain C — Applied GenAI & LLMs
*Industry justification: prompt design, RAG, and vector-database fluency now appear as named, explicit requirements in real 2026 postings — a baseline expectation, not a specialization.*

**Sub-domain C1: Prompt engineering**

| Concept | Weight in C1 | Level | Format |
|---|---|---|---|
| Prompt design patterns | 30% | L2 | Applied task |
| Zero-shot vs. few-shot approaches | 25% | L2 | Applied task |
| Structured output prompting | 25% | L2 | Applied task |
| Prompt iteration and debugging | 20% | L2 | Applied task |

**Sub-domain C2: Retrieval-augmented generation**

| Concept | Weight in C2 | Level | Format |
|---|---|---|---|
| Embeddings basics | 20% | L2 | Applied task |
| Vector database fundamentals | 25% | L2 | Applied task |
| Retrieval pipeline construction | 25% | L2 | Applied (build RAG pipeline) |
| Chunking strategy trade-offs | 20% | L2 | Applied task |
| Re-ranking basics | 10% | L2 | Applied task |

**Sub-domain C3: Model limitations**

| Concept | Weight in C3 | Level | Format |
|---|---|---|---|
| Hallucination and its causes | 30% | L2, L3/L4 | Applied task + spoken explanation |
| Context-window constraints | 25% | L2 | Applied task |
| When output should not be trusted without verification | 30% | L3, L4 | Recorded response / defense |
| Prompt injection awareness | 15% | L1 | MCQ |

---

## Domain D — MLOps & Deployment Basics
*Industry justification: a model that only runs in a notebook isn't a hireable output — every real AI role expects awareness of what happens after training.*

**Sub-domain D1: Model serving fundamentals**

| Concept | Weight in D1 | Level | Format |
|---|---|---|---|
| How a trained model gets exposed for use | 40% | L2 | Applied scenario |
| Basic API wrapping of a model | 35% | L2 | Applied scenario |
| Versioning models and data | 25% | L1 | MCQ |

**Sub-domain D2: Monitoring basics**

| Concept | Weight in D2 | Level | Format |
|---|---|---|---|
| What "model drift" means | 40% | L1 | MCQ |
| Why deployed models need ongoing evaluation | 35% | L1 | MCQ |
| Basic logging of model predictions | 25% | L1 | MCQ |

---

## Domain E — Applied Judgment & Responsible AI
*Industry justification: explaining a model's real-world limitations to a non-technical stakeholder is the specific, defensible skill this framework's L3/L4 design exists to surface.*

**Sub-domain E1: Communicating model behavior**

| Concept | Weight in E1 | Level | Format |
|---|---|---|---|
| Explaining failure modes in plain language | 30% | L3, L4 | Recorded response / defense |
| Framing confidence and uncertainty honestly | 25% | L3, L4 | Recorded response / defense |
| Basic fairness/bias awareness in outputs | 25% | L3 | Recorded response |
| Explaining a metric choice to a non-technical stakeholder | 20% | L3 | Recorded response |

---

## Level 5 — Capstone
Integrates all domains above into one small, end-to-end ML/GenAI feature build against a realistic dataset, evaluated per the L5 weightage table (checklist 50% / practitioner judgment 30% / presentation 20%).
