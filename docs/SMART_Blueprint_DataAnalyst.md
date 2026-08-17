# SMART — Role Assessment Blueprint v2: Data Analyst
### Domain → Sub-Domain → Concept, with concept-level weights, mapped level, and format

**Calibration note:** concept-level weights are the calibration panel's first-pass judgment of relative importance, based on frequency/criticality in real current job postings and interview patterns — not a fixed psychometric fact. Weights sum to 100% within each sub-domain.

---

## Level weightage summary

| Level | Composition |
|---|---|
| L1 | 40% general aptitude (stats/data-interpretation weighted) + 25% Domain A + 35% Domain B |
| L2 | 40% Domain A + 35% Domain C + 25% Domain E |
| L3 | 25% inferential reasoning + 35% metric/KPI reasoning + 40% recommendation framing |
| L4 | 35% depth of understanding + 30% honesty about limitations + 35% defense quality |
| L5 | 50% checklist + 30% practitioner judgment + 20% presentation |

---

## Domain A — Data Querying & Manipulation
*Industry justification: SQL is the single most consistently named hard requirement across every fresher data-analyst posting reviewed — zero disagreement across sources.*

**Sub-domain A1: SQL**

| Concept | Weight in A1 | Level | Format |
|---|---|---|---|
| Joins (inner/outer/left/right) | 22% | L1, L2 | MCQ / query task |
| Aggregations (GROUP BY, HAVING) | 18% | L1, L2 | MCQ / query task |
| Window functions | 18% | L2 | Query task |
| Subqueries and CTEs | 17% | L2 | Query task |
| Query optimization basics | 13% | L1 | MCQ |
| Indexing awareness | 12% | L1 | MCQ |

**Sub-domain A2: Python for data (pandas-level)**

| Concept | Weight in A2 | Level | Format |
|---|---|---|---|
| Dataframe operations | 25% | L2 | Coding task |
| Filtering and selection | 20% | L2 | Coding task |
| Merging/reshaping datasets | 20% | L2 | Coding task |
| Handling missing/dirty data | 20% | L2 | Coding task |
| Basic groupby/aggregation in pandas | 15% | L2 | Coding task |

---

## Domain B — Statistics & Interpretation
*Industry justification: the shift from "runs a report" to "AI-augmented analyst" makes statistical judgment — not tool operation — the layer that actually differentiates candidates now.*

**Sub-domain B1: Descriptive statistics**

| Concept | Weight in B1 | Level | Format |
|---|---|---|---|
| Central tendency (mean/median/mode) | 25% | L1 | MCQ/numeric |
| Variance and standard deviation | 25% | L1 | MCQ/numeric |
| Distribution shape | 25% | L1 | MCQ |
| Outlier identification | 25% | L1 | MCQ |

**Sub-domain B2: Inferential basics**

| Concept | Weight in B2 | Level | Format |
|---|---|---|---|
| Correlation vs. causation | 30% | L1, L3 | MCQ / explained in scenario |
| Basic hypothesis-testing intuition | 25% | L1 | MCQ |
| Sample-size and confidence caveats | 25% | L1, L3 | MCQ / explained in scenario |
| Common statistical fallacies | 20% | L1 | MCQ |

---

## Domain C — Visualization & BI Tooling
*Industry justification: Power BI is the most consistently named dashboard tool in fresher postings — the deliverable format most analyst work actually takes.*

**Sub-domain C1: Dashboard construction**

| Concept | Weight in C1 | Level | Format |
|---|---|---|---|
| Building a dashboard that answers a specific business question | 40% | L2 | Tool-based task |
| Avoiding chart types that mislead | 30% | L2 | Tool-based task |
| Dashboard layout/interaction basics | 30% | L2 | Tool-based task |

**Sub-domain C2: Chart-selection judgment**

| Concept | Weight in C2 | Level | Format |
|---|---|---|---|
| Matching visualization type to the data story | 40% | L2 | Tool-based task |
| Avoiding common visual-distortion mistakes | 35% | L2 | Tool-based task |
| Color and scale choices in charts | 25% | L2 | Tool-based task |

---

## Domain D — Business Translation
*Industry justification: the most commonly cited real-world gap for this role isn't technical — it's the inability to turn a number into a decision a stakeholder can act on.*

**Sub-domain D1: Metric and KPI reasoning**

| Concept | Weight in D1 | Level | Format |
|---|---|---|---|
| Defining a metric precisely | 40% | L3, L4 | Recorded response / defense |
| Recognizing when a metric is gamed or misapplied | 35% | L3, L4 | Recorded response / defense |
| Distinguishing leading vs. lagging indicators | 25% | L3 | Recorded response |

**Sub-domain D2: Recommendation framing**

| Concept | Weight in D2 | Level | Format |
|---|---|---|---|
| Structuring a finding into an actionable recommendation | 40% | L3, L4 | Recorded response / defense |
| Naming confounders and limitations honestly | 35% | L4 | Defense |
| Prioritizing recommendations by impact | 25% | L3 | Recorded response |

---

## Domain E — AI-Assisted Analysis
*Industry justification: analysts are now explicitly expected to use AI copilots alongside core tools — a current shift, not a speculative future skill.*

**Sub-domain E1: AI-assisted querying**

| Concept | Weight in E1 | Level | Format |
|---|---|---|---|
| Using an AI assistant to accelerate analysis | 35% | L2 | Applied task |
| Sanity-checking AI-generated output | 40% | L2 | Applied task |
| Knowing when not to trust AI-generated code/queries | 25% | L2 | Applied task |

---

## Level 5 — Capstone
Integrates all domains above into one real dataset analysis with a recommendation deck, evaluated per the L5 weightage table (checklist 50% / practitioner judgment 30% / presentation 20%).
