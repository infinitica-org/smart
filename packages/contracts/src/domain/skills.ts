/**
 * INF-05 — Software & IT skill taxonomy with proficiency thresholds, per
 * SMART_Software_IT_Skills_Verification_Framework v3.
 *
 * v3 model (§2, §5, §6): verification is banded by METHOD, not by a steadily
 * escalating scale.
 *   - BEGINNER / INTERMEDIATE — assessment only, no interview, differ by
 *     difficulty tier.
 *   - ADVANCED / PROFESSIONAL — assessment + autonomous AI interview.
 *     PROFESSIONAL additionally requires a defended, real project as
 *     mandatory evidence (not just opportunistic).
 *
 * Structure (§3–§6): a student selects one stream within the Software & IT
 * domain, is verified against the Universal Core matrix (7 skills, loads for
 * every stream) and then against that stream's Role Depth matrix. This file
 * covers the Universal Core plus the three Role Depth streams in scope for
 * INF-05: Software Development, Data Science & Analytics (Data
 * Engineering), and AI/ML Engineering.
 *
 * Per-level `questionCounts` define the PATTERN only (type-mix and totals
 * per level) — question content itself is generated and seeded in a
 * follow-up ticket. No DB dependency: mapped to INF-02 tables once
 * Vishal's schema lands.
 *
 * Owner: Vedika G (INF-05)
 */

export type SkillStream =
  'UNIVERSAL' | 'SOFTWARE_DEVELOPMENT' | 'DATA_SCIENCE_ANALYTICS' | 'AI_ML_ENGINEERING';

export type ProficiencyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PROFESSIONAL';
export type QuestionType = 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'LONG_ANSWER' | 'CODING';

export interface QuestionCounts {
  readonly MCQ: number;
  readonly TRUE_FALSE: number;
  readonly SHORT_ANSWER: number;
  readonly LONG_ANSWER: number;
  readonly CODING: number;
}

export interface LevelThreshold {
  /** Percentage of total score required to pass (0–100). */
  readonly passMark: number;
  /** Time allowed for the full assessment in minutes. */
  readonly timeMinutes: number;
  /** Question-type pattern for this level. Totals: 20/20/30/30 across B/I/A/P. */
  readonly questionCounts: QuestionCounts;
  /** Whether this level's verification includes the autonomous AI interview. */
  readonly interviewRequired: boolean;
  /** PROFESSIONAL only — a defended, real project is mandatory evidence. */
  readonly projectRequired: boolean;
  /** Verbatim competency bar text for this skill at this level (v3 §5/§6). */
  readonly competencyBar: string;
}

export interface SkillDefinition {
  readonly code: string;
  readonly name: string;
  readonly domain: 'SOFTWARE_IT';
  readonly stream: SkillStream;
  readonly levels: Readonly<Record<ProficiencyLevel, LevelThreshold>>;
}

/** Expected question-type totals per level — the pattern shared by every skill. */
export const LEVEL_QUESTION_TOTALS: Record<ProficiencyLevel, number> = {
  BEGINNER: 20,
  INTERMEDIATE: 20,
  ADVANCED: 30,
  PROFESSIONAL: 30,
};

/** Verification-method gate per level (v3 §2) — shared across every skill. */
export const LEVEL_VERIFICATION_METHOD: Record<
  ProficiencyLevel,
  { interviewRequired: boolean; projectRequired: boolean }
> = {
  BEGINNER: { interviewRequired: false, projectRequired: false },
  INTERMEDIATE: { interviewRequired: false, projectRequired: false },
  ADVANCED: { interviewRequired: true, projectRequired: false },
  PROFESSIONAL: { interviewRequired: true, projectRequired: true },
};

function levels(
  bars: Record<ProficiencyLevel, string>,
): Readonly<Record<ProficiencyLevel, LevelThreshold>> {
  return {
    BEGINNER: {
      passMark: 60,
      timeMinutes: 30,
      questionCounts: { MCQ: 10, TRUE_FALSE: 6, SHORT_ANSWER: 2, LONG_ANSWER: 2, CODING: 0 },
      interviewRequired: false,
      projectRequired: false,
      competencyBar: bars.BEGINNER,
    },
    INTERMEDIATE: {
      passMark: 65,
      timeMinutes: 45,
      questionCounts: { MCQ: 8, TRUE_FALSE: 5, SHORT_ANSWER: 3, LONG_ANSWER: 2, CODING: 2 },
      interviewRequired: false,
      projectRequired: false,
      competencyBar: bars.INTERMEDIATE,
    },
    ADVANCED: {
      passMark: 70,
      timeMinutes: 60,
      questionCounts: { MCQ: 10, TRUE_FALSE: 6, SHORT_ANSWER: 6, LONG_ANSWER: 4, CODING: 4 },
      interviewRequired: true,
      projectRequired: false,
      competencyBar: bars.ADVANCED,
    },
    PROFESSIONAL: {
      passMark: 75,
      timeMinutes: 75,
      questionCounts: { MCQ: 8, TRUE_FALSE: 5, SHORT_ANSWER: 6, LONG_ANSWER: 5, CODING: 6 },
      interviewRequired: true,
      projectRequired: true,
      competencyBar: bars.PROFESSIONAL,
    },
  };
}

/* ------------------------- 5. Universal Core (7 skills) ------------------------- */

const UNIVERSAL_CORE: SkillDefinition[] = [
  {
    code: 'PROGRAMMING_FUNDAMENTALS_LOGIC',
    name: 'Programming fundamentals & logic',
    domain: 'SOFTWARE_IT',
    stream: 'UNIVERSAL',
    levels: levels({
      BEGINNER: 'Writes correct syntax; solves basic loops/conditionals with guidance.',
      INTERMEDIATE: 'Solves multi-step problems; writes clean, reusable functions independently.',
      ADVANCED: 'Designs efficient, edge-case-aware solutions across paradigms.',
      PROFESSIONAL: 'Architects solution logic others build on; sets coding standards.',
    }),
  },
  {
    code: 'DATA_STRUCTURES_ALGORITHMS',
    name: 'Data structures & algorithms',
    domain: 'SOFTWARE_IT',
    stream: 'UNIVERSAL',
    levels: levels({
      BEGINNER: 'Knows arrays, lists, basic sort/search; explains complexity generally.',
      INTERMEDIATE: 'Applies stacks, trees, hashing, recursion within time limits.',
      ADVANCED: 'Solves graph/DP problems; optimises for time and space.',
      PROFESSIONAL: 'Designs algorithmic approach for production systems under real constraints.',
    }),
  },
  {
    code: 'OBJECT_ORIENTED_PROGRAMMING',
    name: 'Object-oriented programming',
    domain: 'SOFTWARE_IT',
    stream: 'UNIVERSAL',
    levels: levels({
      BEGINNER: 'Explains classes, objects, encapsulation with simple examples.',
      INTERMEDIATE: 'Applies inheritance, polymorphism to design multi-class programs.',
      ADVANCED: 'Applies design patterns and SOLID principles on real codebases.',
      PROFESSIONAL: "Defines OOP architecture standards; reviews others' design choices.",
    }),
  },
  {
    code: 'DATABASE_FUNDAMENTALS',
    name: 'Database fundamentals (SQL/DBMS)',
    domain: 'SOFTWARE_IT',
    stream: 'UNIVERSAL',
    levels: levels({
      BEGINNER: 'Writes basic SELECT/INSERT/UPDATE/DELETE queries; explains tables and keys.',
      INTERMEDIATE: 'Writes joins, subqueries, aggregations; models a normalized schema.',
      ADVANCED: 'Optimises queries and indexes; reasons about scaling trade-offs.',
      PROFESSIONAL: 'Designs database architecture for high-traffic production systems.',
    }),
  },
  {
    code: 'OPERATING_SYSTEMS_CONCEPTS',
    name: 'Operating systems concepts',
    domain: 'SOFTWARE_IT',
    stream: 'UNIVERSAL',
    levels: levels({
      BEGINNER: 'Explains processes vs threads, memory, and file systems conceptually.',
      INTERMEDIATE:
        'Reasons about concurrency, scheduling, and synchronization for realistic scenarios.',
      ADVANCED: 'Diagnoses deadlocks/race conditions and proposes fixes.',
      PROFESSIONAL: 'Owns OS-level performance and reliability standards for a team.',
    }),
  },
  {
    code: 'COMPUTER_NETWORKS_BASICS',
    name: 'Computer networks basics',
    domain: 'SOFTWARE_IT',
    stream: 'UNIVERSAL',
    levels: levels({
      BEGINNER: 'Explains client-server model, HTTP, and IP addressing.',
      INTERMEDIATE:
        'Explains and applies TCP/UDP, DNS, REST principles; troubleshoots connectivity.',
      ADVANCED: 'Reasons about latency, load balancing, and security at the network layer.',
      PROFESSIONAL: 'Architects network design decisions for distributed systems.',
    }),
  },
  {
    code: 'GIT_VERSION_CONTROL',
    name: 'Git & version control',
    domain: 'SOFTWARE_IT',
    stream: 'UNIVERSAL',
    levels: levels({
      BEGINNER: 'Performs clone, commit, push, pull, basic branching.',
      INTERMEDIATE: 'Manages branches, merges, resolves conflicts in a team workflow.',
      ADVANCED: 'Structures branching strategy and release process for a project.',
      PROFESSIONAL: 'Owns repository governance and release strategy across teams.',
    }),
  },
];

/* ---------------- 6.1 Software Development — Role Depth (5 skills) ---------------- */

const SOFTWARE_DEVELOPMENT: SkillDefinition[] = [
  {
    code: 'LANGUAGE_PROFICIENCY',
    name: 'Language proficiency (Java/Python/JS/C++)',
    domain: 'SOFTWARE_IT',
    stream: 'SOFTWARE_DEVELOPMENT',
    levels: levels({
      BEGINNER: 'Writes working programs using core syntax and standard libraries.',
      INTERMEDIATE: 'Builds multi-file apps using language idioms and error handling.',
      ADVANCED: 'Writes production-grade code; profiles performance-critical sections.',
      PROFESSIONAL: 'Sets language and coding standards; mentors others in the codebase.',
    }),
  },
  {
    code: 'FRONTEND_BACKEND_FRAMEWORK',
    name: 'Frontend/backend framework (React/Node/Spring)',
    domain: 'SOFTWARE_IT',
    stream: 'SOFTWARE_DEVELOPMENT',
    levels: levels({
      BEGINNER: 'Builds a static page or a single API endpoint.',
      INTERMEDIATE: 'Builds component-based UI or authenticated multi-endpoint APIs.',
      ADVANCED: 'Architects scalable frontend state or backend service boundaries.',
      PROFESSIONAL: 'Owns framework architecture decisions across a full product.',
    }),
  },
  {
    code: 'SYSTEM_DESIGN_ARCHITECTURE',
    name: 'System design & architecture',
    domain: 'SOFTWARE_IT',
    stream: 'SOFTWARE_DEVELOPMENT',
    levels: levels({
      BEGINNER: 'Explains client-server and basic three-tier architecture.',
      INTERMEDIATE: 'Designs a small system covering components and data flow.',
      ADVANCED: 'Designs for scale: load balancing, caching, fault tolerance.',
      PROFESSIONAL:
        'Architects multi-service systems; leads design reviews under real constraints.',
    }),
  },
  {
    code: 'TESTING_DEBUGGING',
    name: 'Testing & debugging',
    domain: 'SOFTWARE_IT',
    stream: 'SOFTWARE_DEVELOPMENT',
    levels: levels({
      BEGINNER: 'Writes basic unit tests; uses a debugger to find issues.',
      INTERMEDIATE: 'Writes unit/integration tests with mocking; isolates root causes.',
      ADVANCED: 'Establishes a testing strategy across unit, integration, and e2e.',
      PROFESSIONAL: 'Owns quality strategy; debugs complex production incidents.',
    }),
  },
  {
    code: 'DEPLOYMENT_CICD_BASICS',
    name: 'Deployment & CI/CD basics',
    domain: 'SOFTWARE_IT',
    stream: 'SOFTWARE_DEVELOPMENT',
    levels: levels({
      BEGINNER: 'Explains what CI/CD and containers are.',
      INTERMEDIATE: 'Sets up a basic pipeline; containerises an application.',
      ADVANCED: 'Designs multi-environment pipelines with test gates and rollback.',
      PROFESSIONAL: 'Owns release engineering and deployment strategy at scale.',
    }),
  },
];

/* -------------- 6.2 Data Science & Analytics — Role Depth (9 skills) -------------- */

const DATA_SCIENCE_ANALYTICS: SkillDefinition[] = [
  {
    code: 'STATISTICS_PROBABILITY',
    name: 'Statistics & probability',
    domain: 'SOFTWARE_IT',
    stream: 'DATA_SCIENCE_ANALYTICS',
    levels: levels({
      BEGINNER: 'Explains mean/median/variance and common distributions.',
      INTERMEDIATE: 'Applies hypothesis testing, correlation, regression; interprets results.',
      ADVANCED: 'Selects and defends the right method for ambiguous problems.',
      PROFESSIONAL: 'Designs experimentation and measurement frameworks used org-wide.',
    }),
  },
  {
    code: 'PYTHON_R_DATA_ANALYSIS',
    name: 'Python/R for data analysis',
    domain: 'SOFTWARE_IT',
    stream: 'DATA_SCIENCE_ANALYTICS',
    levels: levels({
      BEGINNER: 'Loads data and performs basic filtering and grouping.',
      INTERMEDIATE: 'Cleans messy data; automates a repeatable analysis workflow.',
      ADVANCED: 'Builds scalable, production-quality analysis pipelines.',
      PROFESSIONAL: 'Owns the analytics codebase standard others build on.',
    }),
  },
  {
    code: 'ADVANCED_SQL_ANALYTICAL_QUERYING',
    name: 'Advanced SQL & analytical querying',
    domain: 'SOFTWARE_IT',
    stream: 'DATA_SCIENCE_ANALYTICS',
    levels: levels({
      BEGINNER: 'Writes basic SELECT/GROUP BY queries on a single table.',
      INTERMEDIATE: 'Writes multi-table joins, window functions, and CTEs.',
      ADVANCED: 'Optimises complex analytical queries against large datasets.',
      PROFESSIONAL: 'Designs analytical schemas and query standards for a team.',
    }),
  },
  {
    code: 'DATA_WRANGLING',
    name: 'Data wrangling',
    domain: 'SOFTWARE_IT',
    stream: 'DATA_SCIENCE_ANALYTICS',
    levels: levels({
      BEGINNER: 'Handles missing values and basic transformations.',
      INTERMEDIATE: 'Builds an ETL workflow across multiple sources.',
      ADVANCED: 'Designs fault-tolerant, scalable pipelines with quality checks.',
      PROFESSIONAL: 'Owns data pipeline architecture and governance.',
    }),
  },
  {
    code: 'DATA_VISUALIZATION_STORYTELLING',
    name: 'Data visualization & storytelling',
    domain: 'SOFTWARE_IT',
    stream: 'DATA_SCIENCE_ANALYTICS',
    levels: levels({
      BEGINNER: 'Builds basic charts to represent a dataset.',
      INTERMEDIATE: 'Builds an interactive dashboard suited to the audience.',
      ADVANCED: 'Constructs a data narrative that pre-empts stakeholder questions.',
      PROFESSIONAL: 'Shapes how an organisation communicates data-driven decisions.',
    }),
  },
  {
    code: 'MACHINE_LEARNING_FUNDAMENTALS',
    name: 'Machine learning fundamentals',
    domain: 'SOFTWARE_IT',
    stream: 'DATA_SCIENCE_ANALYTICS',
    levels: levels({
      BEGINNER: 'Explains supervised vs unsupervised learning; trains a basic model.',
      INTERMEDIATE: 'Selects, trains, and validates models for a given problem.',
      ADVANCED: 'Tunes multiple model families; handles overfitting and interpretability.',
      PROFESSIONAL: 'Sets modelling standards; reviews model choices for a team.',
    }),
  },
  {
    code: 'ML_MODEL_DEPLOYMENT',
    name: 'ML model deployment',
    domain: 'SOFTWARE_IT',
    stream: 'DATA_SCIENCE_ANALYTICS',
    levels: levels({
      BEGINNER: 'Explains what deploying a model means.',
      INTERMEDIATE: 'Deploys a trained model behind a simple API.',
      ADVANCED: 'Designs a monitored deployment with versioning and drift detection.',
      PROFESSIONAL: 'Owns ML infrastructure and production model reliability.',
    }),
  },
  {
    code: 'BUSINESS_DOMAIN_INTERPRETATION',
    name: 'Business & domain interpretation',
    domain: 'SOFTWARE_IT',
    stream: 'DATA_SCIENCE_ANALYTICS',
    levels: levels({
      BEGINNER: 'Summarises what a result means in plain terms.',
      INTERMEDIATE: 'Connects analysis to a specific business question.',
      ADVANCED: 'Frames ambiguous business problems into analysable questions.',
      PROFESSIONAL: 'Advises leadership on strategy using data-driven judgment.',
    }),
  },
  {
    code: 'DATA_ENGINEERING_PIPELINES',
    name: 'Data engineering pipelines',
    domain: 'SOFTWARE_IT',
    stream: 'DATA_SCIENCE_ANALYTICS',
    levels: levels({
      BEGINNER: 'Explains what an ETL/ELT pipeline is; runs a pre-built ingestion job.',
      INTERMEDIATE:
        'Builds a batch pipeline that ingests, transforms, and loads data on a schedule.',
      ADVANCED: 'Designs fault-tolerant, scalable batch/stream pipelines with monitoring.',
      PROFESSIONAL: 'Owns data platform architecture and reliability across an organisation.',
    }),
  },
];

/* ------------------- 6.8 AI/ML Engineering — Role Depth (7 skills) ------------------- */

const AI_ML_ENGINEERING: SkillDefinition[] = [
  {
    code: 'PYTHON_FOR_ML_ENGINEERING',
    name: 'Python for ML engineering',
    domain: 'SOFTWARE_IT',
    stream: 'AI_ML_ENGINEERING',
    levels: levels({
      BEGINNER: 'Writes correct syntax and uses core libraries.',
      INTERMEDIATE: 'Builds multi-file ML workflows independently.',
      ADVANCED: 'Writes optimised, reusable pipeline code.',
      PROFESSIONAL: 'Sets Python engineering standards across an ML team.',
    }),
  },
  {
    code: 'STATISTICS_LINEAR_ALGEBRA',
    name: 'Statistics & linear algebra',
    domain: 'SOFTWARE_IT',
    stream: 'AI_ML_ENGINEERING',
    levels: levels({
      BEGINNER: 'Explains basic statistics and vector/matrix concepts.',
      INTERMEDIATE: 'Applies these concepts to explain model behaviour.',
      ADVANCED: 'Uses them to diagnose and improve model performance.',
      PROFESSIONAL: 'Applies advanced theory to design novel approaches.',
    }),
  },
  {
    code: 'ML_LIBRARIES',
    name: 'ML libraries (NumPy/Pandas/Scikit-learn)',
    domain: 'SOFTWARE_IT',
    stream: 'AI_ML_ENGINEERING',
    levels: levels({
      BEGINNER: 'Uses core libraries to load and inspect data.',
      INTERMEDIATE: 'Builds an end-to-end ML workflow.',
      ADVANCED: 'Writes optimised, reusable ML pipeline code.',
      PROFESSIONAL: 'Owns ML tooling standards across a team.',
    }),
  },
  {
    code: 'DEEP_LEARNING_FUNDAMENTALS',
    name: 'Deep learning fundamentals',
    domain: 'SOFTWARE_IT',
    stream: 'AI_ML_ENGINEERING',
    levels: levels({
      BEGINNER: 'Explains what neural networks are.',
      INTERMEDIATE: 'Builds and trains a basic neural network.',
      ADVANCED: 'Designs and tunes deeper architectures for a problem.',
      PROFESSIONAL: 'Advances model architecture practice for an organisation.',
    }),
  },
  {
    code: 'MODEL_TRAINING_EVALUATION',
    name: 'Model training & evaluation',
    domain: 'SOFTWARE_IT',
    stream: 'AI_ML_ENGINEERING',
    levels: levels({
      BEGINNER: 'Explains train/test split and basic metrics.',
      INTERMEDIATE: 'Applies cross-validation and appropriate metrics.',
      ADVANCED: 'Diagnoses bias/variance and improves performance systematically.',
      PROFESSIONAL: 'Sets evaluation standards; reviews model decisions org-wide.',
    }),
  },
  {
    code: 'MLOPS_DEPLOYMENT',
    name: 'MLOps & deployment',
    domain: 'SOFTWARE_IT',
    stream: 'AI_ML_ENGINEERING',
    levels: levels({
      BEGINNER: 'Explains what putting a model into production means.',
      INTERMEDIATE: 'Packages and deploys a model with basic versioning.',
      ADVANCED: 'Designs CI/CD for ML with monitoring and retraining.',
      PROFESSIONAL: 'Owns ML infrastructure and production reliability strategy.',
    }),
  },
  {
    code: 'APPLIED_LLM_GENAI_SKILLS',
    name: 'Applied LLM/GenAI skills',
    domain: 'SOFTWARE_IT',
    stream: 'AI_ML_ENGINEERING',
    levels: levels({
      BEGINNER: 'Uses an LLM via chat interface effectively.',
      INTERMEDIATE: 'Builds a simple app using an LLM API.',
      ADVANCED: 'Designs robust GenAI applications with evaluation and safety trade-offs.',
      PROFESSIONAL: 'Sets applied AI strategy and architecture for an organisation.',
    }),
  },
];

export const SKILL_DEFINITIONS: readonly SkillDefinition[] = [
  ...UNIVERSAL_CORE,
  ...SOFTWARE_DEVELOPMENT,
  ...DATA_SCIENCE_ANALYTICS,
  ...AI_ML_ENGINEERING,
] as const;

/** Assert question-count pattern and verification-method gates are correct for a skill. */
export function assertSkillQuestionCounts(skill: SkillDefinition): void {
  for (const [level, threshold] of Object.entries(skill.levels) as [
    ProficiencyLevel,
    LevelThreshold,
  ][]) {
    const { MCQ, TRUE_FALSE, SHORT_ANSWER, LONG_ANSWER, CODING } = threshold.questionCounts;
    const total = MCQ + TRUE_FALSE + SHORT_ANSWER + LONG_ANSWER + CODING;
    const expected = LEVEL_QUESTION_TOTALS[level];
    if (total !== expected) {
      throw new Error(
        `${skill.code} ${level}: question counts sum to ${String(total)}, expected ${String(expected)}`,
      );
    }
    if ((level === 'BEGINNER' || level === 'INTERMEDIATE') && CODING > 0 && level === 'BEGINNER') {
      throw new Error(`${skill.code} BEGINNER must have 0 coding questions`);
    }
    const gate = LEVEL_VERIFICATION_METHOD[level];
    if (threshold.interviewRequired !== gate.interviewRequired) {
      throw new Error(
        `${skill.code} ${level}: interviewRequired must be ${String(gate.interviewRequired)}`,
      );
    }
    if (threshold.projectRequired !== gate.projectRequired) {
      throw new Error(
        `${skill.code} ${level}: projectRequired must be ${String(gate.projectRequired)}`,
      );
    }
  }
}
