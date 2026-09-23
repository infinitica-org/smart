/**
 * inf-se-v1 — Software Engineering verified skill framework.
 *
 * Parallel to INF-05 (`skills.ts`) for DS/AI streams. Nine categories (A–I),
 * 33 tagged skills + tool-scale tags. Standard anchors (NSQF/SFIA/etc.) are
 * reference-only and are NOT stored here.
 *
 * Owner: Ramansh (S6-RM-13).
 *
 * Security: `buildSeSkillLibraryResponse()` is the canonical registry; committed
 * JSON must match (content-pipeline drift guard). Consent scope allowlist lives
 * in `signal-consent-scopes.ts` for the corroboration branch to enforce at ingest.
 */

import type { ProficiencyLevel } from './skills.js';

export const INF_SE_V1_TAXONOMY_VERSION = 'inf-se-v1@1' as const;

export const SE_SKILL_CATEGORY_IDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] as const;
export type SeSkillCategoryId = (typeof SE_SKILL_CATEGORY_IDS)[number];

export const SKILL_TAG_TYPES = ['SKILL', 'TOOL'] as const;
export type SkillTagType = (typeof SKILL_TAG_TYPES)[number];

export const TOOL_PROFICIENCY_TIERS = ['AWARE', 'WORKING', 'PRODUCTION'] as const;
export type ToolProficiencyTier = (typeof TOOL_PROFICIENCY_TIERS)[number];

/** Shared five-band competency bars (framework-level definitions). */
export const SE_PROFICIENCY_BARS: Readonly<Record<ProficiencyLevel, string>> = {
  BEGINNER: 'Conceptual understanding; supervised tasks',
  INTERMEDIATE: 'Independent, bounded-scope execution',
  PROFICIENT: 'Consistent independent delivery; typical production scenarios',
  ADVANCED: 'Owns a component end-to-end; trade-off reasoning',
  PROFESSIONAL: 'Sets standards / architecture / strategy',
};

export const SE_SKILL_CATEGORIES: Readonly<
  Record<SeSkillCategoryId, { readonly id: SeSkillCategoryId; readonly name: string }>
> = {
  A: { id: 'A', name: 'Programming & Software Development' },
  B: { id: 'B', name: 'Software Design' },
  C: { id: 'C', name: 'Systems Design & Solution Architecture' },
  D: { id: 'D', name: 'Engineering Leadership & Delivery' },
  E: { id: 'E', name: 'Frontend Development' },
  F: { id: 'F', name: 'Backend Development' },
  G: { id: 'G', name: 'Database Design & Data Management' },
  H: { id: 'H', name: 'Testing & Quality Assurance' },
  I: { id: 'I', name: 'Deployment, Infrastructure & CI/CD' },
};

export interface SeSkillDefinition {
  readonly code: string;
  readonly name: string;
  readonly categoryId: SeSkillCategoryId;
  readonly tagType: SkillTagType;
  readonly competencyBars: Readonly<Record<ProficiencyLevel, string>>;
  readonly toolBars?: Readonly<Record<ToolProficiencyTier, string>>;
  readonly corroborationEligible: boolean;
  readonly assessmentRequiredForClaim: boolean;
}

function skill(code: string, name: string, categoryId: SeSkillCategoryId): SeSkillDefinition {
  return {
    code,
    name,
    categoryId,
    tagType: 'SKILL',
    competencyBars: SE_PROFICIENCY_BARS,
    corroborationEligible: true,
    assessmentRequiredForClaim: true,
  };
}

function tool(code: string, name: string): SeSkillDefinition {
  return {
    code,
    name,
    categoryId: 'I',
    tagType: 'TOOL',
    competencyBars: SE_PROFICIENCY_BARS,
    toolBars: {
      AWARE: `Knows terminology and when to use ${name}`,
      WORKING: `Uses ${name} hands-on in bounded tasks`,
      PRODUCTION: `Operates ${name} at production scale`,
    },
    corroborationEligible: true,
    assessmentRequiredForClaim: true,
  };
}

const CATEGORY_A: SeSkillDefinition[] = [
  skill('SE_JAVA', 'Java', 'A'),
  skill('SE_PYTHON', 'Python', 'A'),
  skill('SE_JAVASCRIPT', 'JavaScript', 'A'),
  skill('SE_TYPESCRIPT', 'TypeScript', 'A'),
  skill('SE_GO', 'Go', 'A'),
  skill('SE_DATA_STRUCTURES_ALGORITHMS', 'Data Structures & Algorithms', 'A'),
];

const CATEGORY_B: SeSkillDefinition[] = [
  skill('SE_OO_DESIGN', 'OO Design', 'B'),
  skill('SE_DESIGN_PATTERNS', 'Design Patterns', 'B'),
  skill('SE_API_INTERFACE_DESIGN', 'API / Interface Design', 'B'),
];

const CATEGORY_C: SeSkillDefinition[] = [
  skill('SE_COMPONENT_MODULE_DESIGN', 'Component / Module Design', 'C'),
  skill('SE_DISTRIBUTED_SYSTEMS', 'Distributed Systems & Microservices', 'C'),
  skill('SE_SCALABILITY_PERFORMANCE', 'Scalability & Performance Design', 'C'),
  skill('SE_SOLUTION_ARCHITECTURE', 'Solution / Enterprise Architecture', 'C'),
];

const CATEGORY_D: SeSkillDefinition[] = [
  skill('SE_DEV_PROCESS_DELIVERY', 'Development Process & Delivery', 'D'),
  skill('SE_TECHNICAL_MENTORSHIP', 'Technical Mentorship', 'D'),
  skill('SE_ENGINEERING_STRATEGY', 'Engineering Strategy', 'D'),
];

const CATEGORY_E: SeSkillDefinition[] = [
  skill('SE_REACT', 'React', 'E'),
  skill('SE_HTML', 'HTML', 'E'),
  skill('SE_CSS', 'CSS', 'E'),
  skill('SE_ACCESSIBILITY_WCAG', 'Accessibility (WCAG)', 'E'),
];

const CATEGORY_F: SeSkillDefinition[] = [
  skill('SE_SPRING_BOOT', 'Spring Boot', 'F'),
  skill('SE_REST_API_DESIGN', 'REST API Design', 'F'),
  skill('SE_GO_BACKEND_GIN', 'Go Backend (GIN)', 'F'),
];

const CATEGORY_G: SeSkillDefinition[] = [
  skill('SE_RELATIONAL_SQL_DESIGN', 'Relational / SQL Design', 'G'),
  skill('SE_QUERY_OPTIMIZATION', 'Query Optimization', 'G'),
  skill('SE_DATA_MODELLING_NOSQL', 'Data Modelling (incl. NoSQL)', 'G'),
];

const CATEGORY_H: SeSkillDefinition[] = [
  skill('SE_FUNCTIONAL_UNIT_TESTING', 'Functional / Unit Testing', 'H'),
  skill('SE_NON_FUNCTIONAL_TESTING', 'Non-Functional Testing', 'H'),
  skill('SE_TEST_AUTOMATION', 'Test Automation Tooling', 'H'),
];

const CATEGORY_I: SeSkillDefinition[] = [
  skill('SE_CICD_PIPELINES', 'CI/CD Pipelines', 'I'),
  skill('SE_CLOUD_INFRASTRUCTURE', 'Cloud Infrastructure', 'I'),
  tool('TOOL_DOCKER', 'Containerization (Docker)'),
  tool('TOOL_KUBERNETES', 'Orchestration (Kubernetes)'),
];

export const SE_SKILL_DEFINITIONS: readonly SeSkillDefinition[] = [
  ...CATEGORY_A,
  ...CATEGORY_B,
  ...CATEGORY_C,
  ...CATEGORY_D,
  ...CATEGORY_E,
  ...CATEGORY_F,
  ...CATEGORY_G,
  ...CATEGORY_H,
  ...CATEGORY_I,
] as const;

export const SE_SKILL_CODES = SE_SKILL_DEFINITIONS.map((entry) => entry.code);
export const SE_SKILL_CODE_SET: ReadonlySet<string> = new Set(SE_SKILL_CODES);

/** INF-05 code → inf-se-v1 targets for migration UX (no auto-rewrite of verified rows). */
export const LEGACY_INF05_TO_SE_V1: Readonly<Record<string, readonly string[]>> = {
  LANGUAGE_PROFICIENCY: ['SE_JAVA', 'SE_PYTHON', 'SE_JAVASCRIPT', 'SE_TYPESCRIPT', 'SE_GO'],
  DATA_STRUCTURES_ALGORITHMS: ['SE_DATA_STRUCTURES_ALGORITHMS'],
  OBJECT_ORIENTED_PROGRAMMING: ['SE_OO_DESIGN'],
  DATABASE_FUNDAMENTALS: ['SE_RELATIONAL_SQL_DESIGN'],
  FRONTEND_BACKEND_FRAMEWORK: ['SE_REACT', 'SE_REST_API_DESIGN'],
  SYSTEM_DESIGN_ARCHITECTURE: ['SE_COMPONENT_MODULE_DESIGN', 'SE_DISTRIBUTED_SYSTEMS'],
  TESTING_DEBUGGING: ['SE_FUNCTIONAL_UNIT_TESTING'],
  DEPLOYMENT_CICD_BASICS: ['SE_CICD_PIPELINES', 'TOOL_DOCKER'],
};

export interface SeSkillCategoryGroup {
  readonly id: SeSkillCategoryId;
  readonly name: string;
  readonly skills: readonly SeSkillDefinition[];
}

export function groupSeSkillsByCategory(): readonly SeSkillCategoryGroup[] {
  return SE_SKILL_CATEGORY_IDS.map((id) => ({
    id,
    name: SE_SKILL_CATEGORIES[id].name,
    skills: SE_SKILL_DEFINITIONS.filter((entry) => entry.categoryId === id),
  }));
}

export function getSeSkillDefinition(code: string): SeSkillDefinition | undefined {
  return SE_SKILL_DEFINITIONS.find((entry) => entry.code === code);
}
