/**
 * GitHub language → INF-05 skill dimension mapping (S6-RM-10).
 * Ported from assessment/candidate-skills-discovered.consumer.ts LANGUAGE_SKILL_HINTS.
 *
 * Owner: Ramansh.
 */

export interface GithubLanguageMappingEntry {
  readonly dimensionKey: string;
  readonly skillCode: string;
  readonly weight: number;
}

/** Lowercase GitHub language name → catalog skill codes with relative weight. */
export const GITHUB_LANGUAGE_MAPPING: Readonly<
  Record<string, readonly GithubLanguageMappingEntry[]>
> = {
  javascript: [
    { dimensionKey: 'LANGUAGE_PROFICIENCY', skillCode: 'LANGUAGE_PROFICIENCY', weight: 1 },
    {
      dimensionKey: 'PROGRAMMING_FUNDAMENTALS_LOGIC',
      skillCode: 'PROGRAMMING_FUNDAMENTALS_LOGIC',
      weight: 0.8,
    },
  ],
  typescript: [
    { dimensionKey: 'LANGUAGE_PROFICIENCY', skillCode: 'LANGUAGE_PROFICIENCY', weight: 1 },
    {
      dimensionKey: 'PROGRAMMING_FUNDAMENTALS_LOGIC',
      skillCode: 'PROGRAMMING_FUNDAMENTALS_LOGIC',
      weight: 0.8,
    },
  ],
  python: [
    { dimensionKey: 'LANGUAGE_PROFICIENCY', skillCode: 'LANGUAGE_PROFICIENCY', weight: 1 },
    {
      dimensionKey: 'PYTHON_R_DATA_ANALYSIS',
      skillCode: 'PYTHON_R_DATA_ANALYSIS',
      weight: 0.9,
    },
  ],
  java: [
    { dimensionKey: 'LANGUAGE_PROFICIENCY', skillCode: 'LANGUAGE_PROFICIENCY', weight: 1 },
    {
      dimensionKey: 'OBJECT_ORIENTED_PROGRAMMING',
      skillCode: 'OBJECT_ORIENTED_PROGRAMMING',
      weight: 0.85,
    },
  ],
  'c++': [
    { dimensionKey: 'LANGUAGE_PROFICIENCY', skillCode: 'LANGUAGE_PROFICIENCY', weight: 1 },
    {
      dimensionKey: 'DATA_STRUCTURES_ALGORITHMS',
      skillCode: 'DATA_STRUCTURES_ALGORITHMS',
      weight: 0.85,
    },
  ],
  c: [
    {
      dimensionKey: 'PROGRAMMING_FUNDAMENTALS_LOGIC',
      skillCode: 'PROGRAMMING_FUNDAMENTALS_LOGIC',
      weight: 0.9,
    },
  ],
  go: [{ dimensionKey: 'LANGUAGE_PROFICIENCY', skillCode: 'LANGUAGE_PROFICIENCY', weight: 1 }],
  rust: [{ dimensionKey: 'LANGUAGE_PROFICIENCY', skillCode: 'LANGUAGE_PROFICIENCY', weight: 1 }],
  ruby: [{ dimensionKey: 'LANGUAGE_PROFICIENCY', skillCode: 'LANGUAGE_PROFICIENCY', weight: 1 }],
  php: [{ dimensionKey: 'LANGUAGE_PROFICIENCY', skillCode: 'LANGUAGE_PROFICIENCY', weight: 1 }],
  kotlin: [
    { dimensionKey: 'LANGUAGE_PROFICIENCY', skillCode: 'LANGUAGE_PROFICIENCY', weight: 1 },
    {
      dimensionKey: 'OBJECT_ORIENTED_PROGRAMMING',
      skillCode: 'OBJECT_ORIENTED_PROGRAMMING',
      weight: 0.85,
    },
  ],
  swift: [{ dimensionKey: 'LANGUAGE_PROFICIENCY', skillCode: 'LANGUAGE_PROFICIENCY', weight: 1 }],
  sql: [{ dimensionKey: 'DATABASE_FUNDAMENTALS', skillCode: 'DATABASE_FUNDAMENTALS', weight: 1 }],
  plpgsql: [
    { dimensionKey: 'DATABASE_FUNDAMENTALS', skillCode: 'DATABASE_FUNDAMENTALS', weight: 1 },
  ],
  html: [
    {
      dimensionKey: 'FRONTEND_BACKEND_FRAMEWORK',
      skillCode: 'FRONTEND_BACKEND_FRAMEWORK',
      weight: 0.7,
    },
  ],
  css: [
    {
      dimensionKey: 'FRONTEND_BACKEND_FRAMEWORK',
      skillCode: 'FRONTEND_BACKEND_FRAMEWORK',
      weight: 0.7,
    },
  ],
  scss: [
    {
      dimensionKey: 'FRONTEND_BACKEND_FRAMEWORK',
      skillCode: 'FRONTEND_BACKEND_FRAMEWORK',
      weight: 0.7,
    },
  ],
  vue: [
    {
      dimensionKey: 'FRONTEND_BACKEND_FRAMEWORK',
      skillCode: 'FRONTEND_BACKEND_FRAMEWORK',
      weight: 0.85,
    },
  ],
  dockerfile: [
    {
      dimensionKey: 'DEPLOYMENT_CICD_BASICS',
      skillCode: 'DEPLOYMENT_CICD_BASICS',
      weight: 0.8,
    },
  ],
  shell: [
    {
      dimensionKey: 'DEPLOYMENT_CICD_BASICS',
      skillCode: 'DEPLOYMENT_CICD_BASICS',
      weight: 0.75,
    },
  ],
  'jupyter notebook': [
    {
      dimensionKey: 'PYTHON_R_DATA_ANALYSIS',
      skillCode: 'PYTHON_R_DATA_ANALYSIS',
      weight: 0.9,
    },
    {
      dimensionKey: 'MACHINE_LEARNING_FUNDAMENTALS',
      skillCode: 'MACHINE_LEARNING_FUNDAMENTALS',
      weight: 0.7,
    },
  ],
} as const;

/** Self-selected skill name without byte-share evidence — weak passive signal. */
export const SELF_SELECTED_SKILL_SCORE = 0.35;
export const SELF_SELECTED_SKILL_CONFIDENCE = 0.4;
