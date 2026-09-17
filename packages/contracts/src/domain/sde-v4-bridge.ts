import {
  sdeFormCodeForSkill,
  skillFocusOptionsForSkill,
} from './evidence/skill-competency-registry.js';

/**
 * Maps skill@1 catalog skill codes (SkillClaim.skillCode) onto SDE v4 form codes.
 * @deprecated Prefer sdeFormCodeForSkill() from skill-competency-registry (67-skill index).
 */

export const SKILL_TO_SDE_V4_FORM_CODE: Readonly<Record<string, string>> = {
  PYTHON_APPLICATION_BACKEND_DEVELOPMENT: 'SDE_PROGRAMMING_FUNDAMENTALS',
  JAVA_ENTERPRISE_APPLICATION_DEVELOPMENT: 'SDE_PROGRAMMING_FUNDAMENTALS',
  JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT: 'SDE_PROGRAMMING_FUNDAMENTALS',
  C_SYSTEMS_PERFORMANCE_ENGINEERING: 'SDE_DSA',
  ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION: 'SDE_DSA',
  SQL_QUERY_OPTIMIZATION: 'SDE_DATABASE_SQL',
  RELATIONAL_DATABASE_DESIGN_ADMINISTRATION: 'SDE_DATABASE_SQL',
  MODERN_FRONTEND_FRAMEWORKS: 'SDE_WEB_FRAMEWORKS',
  RESTFUL_GRAPHQL_API_DESIGN: 'SDE_SYSTEM_DESIGN',
  CONTINUOUS_TESTING_QUALITY_ENGINEERING: 'SDE_TESTING',
  CI_CD_PIPELINE_ENGINEERING: 'SDE_DEPLOYMENT_CICD',
  CONTAINERIZATION_ORCHESTRATION: 'SDE_DEPLOYMENT_CICD',
};

/** @deprecated use SKILL_TO_SDE_V4_FORM_CODE */
export const INF05_TO_SDE_V4_FORM_CODE = SKILL_TO_SDE_V4_FORM_CODE;

export function sdeV4FormCodeForCatalogSkill(skillCode: string): string | null {
  if (!skillCode || typeof skillCode !== 'string') return null;
  return (
    sdeFormCodeForSkill(skillCode) ??
    SKILL_TO_SDE_V4_FORM_CODE[skillCode] ??
    'SDE_PROGRAMMING_FUNDAMENTALS'
  );
}

export const SKILL_FOCUS_OPTIONS: Readonly<Record<string, readonly string[]>> = {
  PYTHON_APPLICATION_BACKEND_DEVELOPMENT: ['Python', 'Django', 'FastAPI'],
  JAVA_ENTERPRISE_APPLICATION_DEVELOPMENT: ['Java', 'Spring Boot'],
  JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT: ['TypeScript', 'Node.js', 'React'],
  C_SYSTEMS_PERFORMANCE_ENGINEERING: ['C++', 'Memory management', 'Performance'],
  ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION: [
    'Arrays & hashing',
    'Trees',
    'Graphs',
    'Dynamic programming',
  ],
  SQL_QUERY_OPTIMIZATION: ['Joins', 'Window functions', 'CTEs', 'Query tuning'],
  MODERN_FRONTEND_FRAMEWORKS: ['React', 'Vue', 'Angular'],
  RESTFUL_GRAPHQL_API_DESIGN: ['REST', 'GraphQL', 'OpenAPI'],
  CONTINUOUS_TESTING_QUALITY_ENGINEERING: ['Unit tests', 'Integration tests', 'Debugging'],
  CI_CD_PIPELINE_ENGINEERING: ['Docker', 'CI pipelines', 'Environments', 'Rollback'],
};

export function skillFocusOptions(skillCode: string): readonly string[] {
  const fromRegistry = skillFocusOptionsForSkill(skillCode);
  if (fromRegistry.length > 0) return fromRegistry;
  return SKILL_FOCUS_OPTIONS[skillCode] ?? [];
}

export function resolveSkillFocus(skillCode: string, requested?: string | null): string | null {
  const options = skillFocusOptions(skillCode);
  if (options.length === 0) {
    const trimmed = requested?.trim() ?? '';
    return trimmed.length > 0 ? trimmed.slice(0, 64) : null;
  }
  if (requested && options.includes(requested)) return requested;
  return options[0] ?? null;
}

export function skillFocusFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const focus = (metadata as Record<string, unknown>).skillFocus;
  return typeof focus === 'string' && focus.trim().length > 0 ? focus.trim().slice(0, 64) : null;
}
