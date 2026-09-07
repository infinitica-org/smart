/**
 * Maps INF-05 catalog skill codes (SkillClaim.skillCode) onto SDE v4 form codes.
 * Additive only — does not change SKILL_DEFINITIONS or L1 item banks.
 *
 * Proposed by Ramansh; contracts owner Tino. Skills without a mapping cannot
 * start v4 verification (other catalog skills stay declare-only).
 */

export const INF05_TO_SDE_V4_FORM_CODE: Readonly<Record<string, string>> = {
  PROGRAMMING_FUNDAMENTALS_LOGIC: 'SDE_PROGRAMMING_FUNDAMENTALS',
  DATA_STRUCTURES_ALGORITHMS: 'SDE_DSA',
  OBJECT_ORIENTED_PROGRAMMING: 'SDE_OOP',
  DATABASE_FUNDAMENTALS: 'SDE_DATABASE_SQL',
  OPERATING_SYSTEMS_CONCEPTS: 'SDE_OPERATING_SYSTEMS',
  COMPUTER_NETWORKS_BASICS: 'SDE_COMPUTER_NETWORKS',
  GIT_VERSION_CONTROL: 'SDE_GIT',
  LANGUAGE_PROFICIENCY: 'SDE_PROGRAMMING_FUNDAMENTALS',
  FRONTEND_BACKEND_FRAMEWORK: 'SDE_WEB_FRAMEWORKS',
  SYSTEM_DESIGN_ARCHITECTURE: 'SDE_SYSTEM_DESIGN',
  TESTING_DEBUGGING: 'SDE_TESTING',
  DEPLOYMENT_CICD_BASICS: 'SDE_DEPLOYMENT_CICD',
  PYTHON_R_DATA_ANALYSIS: 'SDE_PROGRAMMING_FUNDAMENTALS',
  ADVANCED_SQL_ANALYTICAL_QUERYING: 'SDE_DATABASE_SQL',
};

export function sdeV4FormCodeForCatalogSkill(skillCode: string): string | null {
  return INF05_TO_SDE_V4_FORM_CODE[skillCode] ?? null;
}

/** Per-skill focus the candidate picks; stems must stay inside this slice. */
export const SKILL_FOCUS_OPTIONS: Readonly<Record<string, readonly string[]>> = {
  PROGRAMMING_FUNDAMENTALS_LOGIC: ['Java', 'Python', 'JavaScript', 'C++'],
  DATA_STRUCTURES_ALGORITHMS: ['Arrays & hashing', 'Trees', 'Graphs', 'Dynamic programming'],
  OBJECT_ORIENTED_PROGRAMMING: ['Java', 'Python', 'C++'],
  DATABASE_FUNDAMENTALS: ['SQL queries', 'Normalization', 'Indexing', 'Transactions'],
  OPERATING_SYSTEMS_CONCEPTS: ['Processes & threads', 'Memory', 'Scheduling', 'Concurrency'],
  COMPUTER_NETWORKS_BASICS: ['HTTP & REST', 'TCP/UDP', 'DNS', 'TLS'],
  GIT_VERSION_CONTROL: ['Branching', 'Merging', 'Rebase', 'Collaboration'],
  LANGUAGE_PROFICIENCY: ['Java', 'Python', 'JavaScript', 'C++'],
  FRONTEND_BACKEND_FRAMEWORK: ['React', 'Node', 'Spring'],
  SYSTEM_DESIGN_ARCHITECTURE: ['APIs', 'Caching', 'Databases', 'Scalability'],
  TESTING_DEBUGGING: ['Unit tests', 'Integration tests', 'Debugging'],
  DEPLOYMENT_CICD_BASICS: ['Docker', 'CI pipelines', 'Environments', 'Rollback'],
  PYTHON_R_DATA_ANALYSIS: ['Python', 'R'],
  ADVANCED_SQL_ANALYTICAL_QUERYING: ['Joins', 'Window functions', 'CTEs', 'Query tuning'],
};

export function skillFocusOptions(skillCode: string): readonly string[] {
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
