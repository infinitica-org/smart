import type { DomainCode, TrackCategory, TrackCode, TrackLaunchStatus } from './enums.js';

/**
 * The 10 SMART role tracks and their competency domains A–E.
 *
 * This registry is the shared reference used by:
 *   - Vedika G  — seeding `tracks` / `competencies` and authoring item banks
 *   - Ramansh   — building RAG context and BARS prompts per competency
 *   - Satheswaran V / Vishal Bharath R — track pickers, dashboards, certificates
 *
 * Domain names are quoted verbatim from the role blueprints in `docs/` — they
 * appear on certificates and in gap reports, so they must not be paraphrased.
 *
 * Weights are the default `real_world_weight` per domain and MUST sum to 1.0
 * per track. `content-pipeline validate` asserts this in CI.
 *
 * Source: ARCHITECTURE.md §8–9, docs/SMART_Blueprint_*.md
 */

export interface DomainDefinition {
  readonly code: DomainCode;
  readonly name: string;
  /** Sub-competencies assessed within this domain. */
  readonly topics: readonly string[];
  /** Default contribution of this domain to the track score. Sums to 1.0. */
  readonly weight: number;
  /** Levels at which this domain is primarily assessed. */
  readonly assessedAtLevels: readonly (1 | 2 | 3 | 4 | 5)[];
}

export interface TrackDefinition {
  readonly code: TrackCode;
  readonly name: string;
  readonly category: TrackCategory;
  readonly launchStatus: TrackLaunchStatus;
  /** Weight of the shared MBA foundation layer; 0 for TECH tracks. */
  readonly foundationWeight: number;
  readonly domains: readonly DomainDefinition[];
  /**
   * The "communicate and defend" domain that drives L3 spoken BARS grading and
   * the L4 defense. It is domain E for most tracks, but **domain D for
   * Cybersecurity Analyst (Incident Response) and Data Analyst (Business
   * Translation)** — those two tracks defend their operational domain rather
   * than a separate communication domain.
   *
   * Ramansh reads this when selecting BARS anchor sets, so getting it wrong
   * means grading a candidate against the wrong rubric.
   */
  readonly communicationDomain: DomainCode;
  readonly capstone: string;
}

/**
 * Shared MBA foundation layer (~25–30% of an MBA track score). Taken once by
 * every MBA student regardless of specialisation.
 */
export const MBA_FOUNDATION_COMPETENCIES = [
  'Business Communication',
  'Quantitative & Data Interpretation',
  'Case-Based Business Judgment',
  'Stakeholder & Ethical Reasoning',
] as const;

export const TRACK_DEFINITIONS: readonly TrackDefinition[] = [
  /* ----------------------------- IT TRACKS (5) ---------------------------- */
  {
    code: 'TECH_FULLSTACK',
    name: 'Full Stack Developer',
    category: 'TECH',
    launchStatus: 'AVAILABLE_NEW',
    foundationWeight: 0,
    communicationDomain: 'E',
    capstone: 'Full stack web app feature deliverable with a live demo walkthrough',
    domains: [
      {
        code: 'A',
        name: 'Frontend Engineering',
        topics: ['React', 'Next.js', 'State management', 'Responsive CSS'],
        weight: 0.22,
        assessedAtLevels: [1, 2],
      },
      {
        code: 'B',
        name: 'Backend Engineering',
        topics: ['REST API design', 'Async Node/NestJS', 'Middleware', 'Auth'],
        weight: 0.24,
        assessedAtLevels: [1, 2],
      },
      {
        code: 'C',
        name: 'Data & Persistence',
        topics: ['PostgreSQL queries', 'Indexing', 'MongoDB CRUD', 'Transactions'],
        weight: 0.22,
        assessedAtLevels: [1, 2],
      },
      {
        code: 'D',
        name: 'Engineering Practice',
        topics: ['Git workflows', 'PR review', 'System design fundamentals'],
        weight: 0.16,
        assessedAtLevels: [2, 4],
      },
      {
        code: 'E',
        name: 'Technical Communication',
        topics: ['Justifying technical choices', 'Debugging aloud', 'Trade-off articulation'],
        weight: 0.16,
        assessedAtLevels: [3, 4],
      },
    ],
  },
  {
    code: 'TECH_AIML',
    name: 'AI / ML Engineer',
    category: 'TECH',
    launchStatus: 'AVAILABLE_NEW',
    foundationWeight: 0,
    communicationDomain: 'E',
    capstone: 'End-to-end ML/GenAI pipeline build with an evaluation notebook',
    domains: [
      {
        code: 'A',
        name: 'Programming & Data Handling',
        topics: ['Core Python', 'Pandas dataframe manipulation', 'Vectorised operations'],
        weight: 0.2,
        assessedAtLevels: [1, 2],
      },
      {
        code: 'B',
        name: 'ML Foundations',
        topics: ['Supervised learning', 'Evaluation metrics (F1, recall)', 'Overfitting'],
        weight: 0.22,
        assessedAtLevels: [1, 2],
      },
      {
        code: 'C',
        name: 'Applied GenAI & LLMs',
        topics: ['Prompt engineering patterns', 'RAG pipelines', 'Vector databases', 'Model limits'],
        weight: 0.24,
        assessedAtLevels: [2, 3],
      },
      {
        code: 'D',
        name: 'MLOps & Deployment',
        topics: ['Model serving APIs', 'Drift monitoring', 'Reproducibility'],
        weight: 0.16,
        assessedAtLevels: [1, 2],
      },
      {
        code: 'E',
        name: 'Applied Judgment & Responsible AI',
        topics: ['Communicating uncertainty', 'Failure modes', 'Bias and fairness'],
        weight: 0.18,
        assessedAtLevels: [3, 4],
      },
    ],
  },
  {
    code: 'TECH_CLOUD_DEVOPS',
    name: 'Cloud / DevOps Engineer',
    category: 'TECH',
    launchStatus: 'AVAILABLE_NEW',
    foundationWeight: 0,
    communicationDomain: 'E',
    capstone: 'Containerised app deployment with automated CI/CD and monitoring',
    domains: [
      {
        code: 'A',
        name: 'Systems Foundations',
        topics: ['Linux bash scripting', 'Permissions', 'TCP/IP networking'],
        weight: 0.2,
        assessedAtLevels: [1, 2],
      },
      {
        code: 'B',
        name: 'Cloud Platform Fundamentals',
        topics: ['Compute', 'Object storage', 'IAM access control'],
        weight: 0.22,
        assessedAtLevels: [1, 2],
      },
      {
        code: 'C',
        name: 'Containerization & Orchestration',
        topics: ['Dockerfile authoring', 'Kubernetes pods and deployments'],
        weight: 0.22,
        assessedAtLevels: [1, 2],
      },
      {
        code: 'D',
        name: 'CI/CD & Automation',
        topics: ['GitHub Actions pipelines', 'Terraform IaC'],
        weight: 0.18,
        assessedAtLevels: [2],
      },
      {
        code: 'E',
        name: 'Reliability & Incident Response',
        topics: ['Root cause analysis', 'Log triage', 'Incident communication'],
        weight: 0.18,
        assessedAtLevels: [3, 4],
      },
    ],
  },
  {
    code: 'TECH_CYBERSECURITY',
    name: 'Cybersecurity Analyst',
    category: 'TECH',
    launchStatus: 'AVAILABLE_NEW',
    foundationWeight: 0,
    communicationDomain: 'D',
    capstone: 'Incident triage and defense documentation package',
    domains: [
      {
        code: 'A',
        name: 'Networking & Systems Foundations',
        topics: ['Network protocols', 'OS hardening', 'Firewall rules'],
        weight: 0.2,
        assessedAtLevels: [1],
      },
      {
        code: 'B',
        name: 'Threat Landscape',
        topics: ['Phishing', 'OWASP Top 10', 'CVE severity classification'],
        weight: 0.2,
        assessedAtLevels: [1],
      },
      {
        code: 'C',
        name: 'Detection & Analysis',
        topics: ['Log correlation', 'SIEM query basics'],
        weight: 0.22,
        assessedAtLevels: [1, 2],
      },
      {
        code: 'D',
        name: 'Incident Response',
        topics: ['Severity triage', 'Incident documentation', 'Containment logic'],
        weight: 0.24,
        assessedAtLevels: [2, 3, 4],
      },
      {
        code: 'E',
        name: 'Specialization Awareness',
        topics: ['Cloud security basics', 'Offensive vs defensive posture'],
        weight: 0.14,
        assessedAtLevels: [1],
      },
    ],
  },
  {
    code: 'TECH_DATA_ANALYST',
    name: 'Data Analyst',
    category: 'TECH',
    launchStatus: 'AVAILABLE_NEW',
    foundationWeight: 0,
    communicationDomain: 'D',
    capstone: 'End-to-end dataset analysis and recommendation deck',
    domains: [
      {
        code: 'A',
        name: 'Data Querying & Manipulation',
        topics: ['Complex SQL joins', 'Window functions', 'Python pandas'],
        weight: 0.24,
        assessedAtLevels: [1, 2],
      },
      {
        code: 'B',
        name: 'Statistics & Interpretation',
        topics: ['Descriptive statistics', 'Correlation vs causation', 'Hypothesis intuition'],
        weight: 0.22,
        assessedAtLevels: [1, 3],
      },
      {
        code: 'C',
        name: 'Visualization & BI Tooling',
        topics: ['Dashboard design', 'Chart selection', 'Power BI / Tableau'],
        weight: 0.18,
        assessedAtLevels: [2],
      },
      {
        code: 'D',
        name: 'Business Translation',
        topics: ['Metric reasoning', 'Converting findings into decisions'],
        weight: 0.22,
        assessedAtLevels: [3, 4],
      },
      {
        code: 'E',
        name: 'AI-Assisted Analysis',
        topics: ['AI copilot querying', 'Output verification'],
        weight: 0.14,
        assessedAtLevels: [2],
      },
    ],
  },

  /* ---------------------------- MBA TRACKS (5) ---------------------------- */
  {
    code: 'MBA_FINANCE',
    name: 'MBA — Finance',
    category: 'MBA',
    launchStatus: 'VALIDATED_LEAD',
    foundationWeight: 0.27,
    communicationDomain: 'E',
    capstone: 'Applied valuation and financial model with a defended recommendation',
    domains: [
      {
        code: 'A',
        name: 'Financial Statement Analysis',
        topics: ['Ratio analysis', 'Cash flow quality', 'Accrual reasoning'],
        weight: 0.22,
        assessedAtLevels: [1, 2],
      },
      {
        code: 'B',
        name: 'Valuation & Capital Budgeting',
        topics: ['DCF', 'Comparables', 'NPV / IRR'],
        weight: 0.24,
        assessedAtLevels: [1, 2],
      },
      {
        code: 'C',
        name: 'Applied Financial Modeling',
        topics: ['Three-statement modeling', 'Scenario and sensitivity analysis'],
        weight: 0.22,
        assessedAtLevels: [2],
      },
      {
        code: 'D',
        name: 'Risk & Working Capital Reasoning',
        topics: ['Working capital cycles', 'Liquidity risk', 'Leverage judgment'],
        weight: 0.16,
        assessedAtLevels: [1, 2],
      },
      {
        code: 'E',
        name: 'Financial Communication & Judgment',
        topics: ['Defending an assumption set', 'Explaining a recommendation to a non-finance stakeholder'],
        weight: 0.16,
        assessedAtLevels: [3, 4],
      },
    ],
  },
  {
    code: 'MBA_BUSINESS_ANALYTICS',
    name: 'MBA — Business Analytics',
    category: 'MBA',
    launchStatus: 'VALIDATED_LEAD',
    foundationWeight: 0.27,
    communicationDomain: 'E',
    capstone: 'Dataset to recommendation case with a defended insight narrative',
    domains: [
      {
        code: 'A',
        name: 'Data Querying & Manipulation',
        topics: ['SQL aggregation and joins', 'Spreadsheet modelling'],
        weight: 0.24,
        assessedAtLevels: [1, 2],
      },
      {
        code: 'B',
        name: 'Statistical Reasoning & Interpretation',
        topics: ['Distributions', 'Significance intuition', 'Confounders'],
        weight: 0.22,
        assessedAtLevels: [1, 2],
      },
      {
        code: 'C',
        name: 'Business Intelligence & Visualization',
        topics: ['Dashboard design', 'Metric definition', 'Chart honesty'],
        weight: 0.18,
        assessedAtLevels: [2],
      },
      {
        code: 'D',
        name: 'Applied Case: Dataset to Recommendation',
        topics: ['Framing', 'Prioritisation', 'Decision framing under ambiguity'],
        weight: 0.2,
        assessedAtLevels: [2, 3],
      },
      {
        code: 'E',
        name: 'Data Storytelling & Defense',
        topics: ['Narrative structure', 'Defending an inference', 'Stating limitations'],
        weight: 0.16,
        assessedAtLevels: [3, 4],
      },
    ],
  },
  {
    code: 'MBA_MARKETING',
    name: 'MBA — Marketing',
    category: 'MBA',
    launchStatus: 'AVAILABLE_NEW',
    foundationWeight: 0.27,
    communicationDomain: 'E',
    capstone: 'Go-to-market plan with defended positioning and metric targets',
    domains: [
      {
        code: 'A',
        name: 'Market Sizing & Segmentation',
        topics: ['TAM/SAM/SOM', 'Segment definition', 'Sizing assumptions'],
        weight: 0.22,
        assessedAtLevels: [1, 2],
      },
      {
        code: 'B',
        name: 'Campaign & Positioning Judgment',
        topics: ['Positioning statements', 'Channel selection', 'Message testing'],
        weight: 0.22,
        assessedAtLevels: [2],
      },
      {
        code: 'C',
        name: 'Marketing Metrics Literacy',
        topics: ['CAC', 'LTV', 'ROMI', 'Funnel conversion'],
        weight: 0.22,
        assessedAtLevels: [1, 2],
      },
      {
        code: 'D',
        name: 'Consumer Behavior Reasoning',
        topics: ['Decision journeys', 'Willingness to pay', 'Behavioural drivers'],
        weight: 0.18,
        assessedAtLevels: [1, 2],
      },
      {
        code: 'E',
        name: 'Marketing Communication & Defense',
        topics: ['Pitching a campaign', 'Defending a spend allocation'],
        weight: 0.16,
        assessedAtLevels: [3, 4],
      },
    ],
  },
  {
    code: 'MBA_OPERATIONS',
    name: 'MBA — Operations',
    category: 'MBA',
    launchStatus: 'AVAILABLE_NEW',
    foundationWeight: 0.27,
    communicationDomain: 'E',
    capstone: 'Process improvement case with quantified operational recommendation',
    domains: [
      {
        code: 'A',
        name: 'Process & Supply Chain Problem Solving',
        topics: ['Bottleneck analysis', 'Flow and throughput', 'Supply chain mapping'],
        weight: 0.24,
        assessedAtLevels: [1, 2],
      },
      {
        code: 'B',
        name: 'Quantitative Operations',
        topics: ['EOQ', 'Safety stock', 'Queueing intuition'],
        weight: 0.22,
        assessedAtLevels: [1, 2],
      },
      {
        code: 'C',
        name: 'Quality & Process Improvement',
        topics: ['DMAIC', 'Six Sigma basics', 'Root cause tooling'],
        weight: 0.2,
        assessedAtLevels: [1, 2],
      },
      {
        code: 'D',
        name: 'Negotiation & Vendor Judgment',
        topics: ['Vendor evaluation', 'Contract trade-offs', 'Make vs buy'],
        weight: 0.18,
        assessedAtLevels: [2],
      },
      {
        code: 'E',
        name: 'Operations Communication & Defense',
        topics: ['Explaining a trade-off to a plant manager', 'Defending a prioritisation'],
        weight: 0.16,
        assessedAtLevels: [3, 4],
      },
    ],
  },
  {
    code: 'MBA_HR',
    name: 'MBA — Human Resources',
    category: 'MBA',
    launchStatus: 'AVAILABLE_NEW',
    foundationWeight: 0.27,
    communicationDomain: 'E',
    capstone: 'Talent or employee-relations case with a defended policy recommendation',
    domains: [
      {
        code: 'A',
        name: 'Recruitment & Talent Judgment',
        topics: ['Role scoping', 'Structured interviewing', 'Selection validity'],
        weight: 0.24,
        assessedAtLevels: [1, 2],
      },
      {
        code: 'B',
        name: 'Employee Relations',
        topics: ['Grievance handling', 'Performance conversations', 'Conflict resolution'],
        weight: 0.22,
        assessedAtLevels: [2],
      },
      {
        code: 'C',
        name: 'HR Metrics Literacy',
        topics: ['Attrition', 'Engagement', 'Time to hire', 'Cost per hire'],
        weight: 0.2,
        assessedAtLevels: [1, 2],
      },
      {
        code: 'D',
        name: 'Organizational & Culture Reasoning',
        topics: ['Change management', 'Policy and compliance judgment'],
        weight: 0.18,
        assessedAtLevels: [1, 2],
      },
      {
        code: 'E',
        name: 'HR Communication & Defense',
        topics: ['Communicating a difficult decision', 'Defending a policy position'],
        weight: 0.16,
        assessedAtLevels: [3, 4],
      },
    ],
  },
] as const;

export function getTrackDefinition(code: TrackCode): TrackDefinition {
  const found = TRACK_DEFINITIONS.find((track) => track.code === code);
  if (!found) {
    throw new Error(`Unknown SMART track code: ${code}`);
  }
  return found;
}

/**
 * The domain whose BARS anchors are used for L3 spoken grading and the L4
 * defense on this track. Domain E for most tracks, domain D for Cybersecurity
 * Analyst and Data Analyst.
 */
export function getCommunicationDomain(code: TrackCode): DomainDefinition {
  const track = getTrackDefinition(code);
  const domain = track.domains.find((d) => d.code === track.communicationDomain);
  if (!domain) {
    throw new Error(
      `Track ${code} declares communicationDomain "${track.communicationDomain}" but has no such domain.`,
    );
  }
  return domain;
}

export function getTracksByCategory(category: TrackCategory): readonly TrackDefinition[] {
  return TRACK_DEFINITIONS.filter((track) => track.category === category);
}

/** Tracks with a recorded practitioner panel and verified reliability. */
export function getValidatedLeadTracks(): readonly TrackDefinition[] {
  return TRACK_DEFINITIONS.filter((track) => track.launchStatus === 'VALIDATED_LEAD');
}

/**
 * Guard used by `content-pipeline validate` in CI: domain weights must sum to
 * 1.0 (within float tolerance) or scoring is silently wrong.
 */
export function assertDomainWeightsSumToOne(track: TrackDefinition): void {
  const total = track.domains.reduce((sum, domain) => sum + domain.weight, 0);
  if (Math.abs(total - 1) > 1e-6) {
    throw new Error(
      `Track ${track.code}: domain weights sum to ${total.toFixed(4)}, expected 1.0. ` +
        `Fix the weights in packages/contracts/src/domain/tracks.ts.`,
    );
  }
}
