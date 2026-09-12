/**
 * GitHub language → skill@1 dimension mapping.
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
    {
      dimensionKey: 'JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT',
      skillCode: 'JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT',
      weight: 1,
    },
  ],
  typescript: [
    {
      dimensionKey: 'JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT',
      skillCode: 'JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT',
      weight: 1,
    },
  ],
  python: [
    {
      dimensionKey: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      weight: 1,
    },
  ],
  java: [
    {
      dimensionKey: 'JAVA_ENTERPRISE_APPLICATION_DEVELOPMENT',
      skillCode: 'JAVA_ENTERPRISE_APPLICATION_DEVELOPMENT',
      weight: 1,
    },
  ],
  'c++': [
    {
      dimensionKey: 'C_SYSTEMS_PERFORMANCE_ENGINEERING',
      skillCode: 'C_SYSTEMS_PERFORMANCE_ENGINEERING',
      weight: 1,
    },
  ],
  c: [
    {
      dimensionKey: 'C_SYSTEMS_PERFORMANCE_ENGINEERING',
      skillCode: 'C_SYSTEMS_PERFORMANCE_ENGINEERING',
      weight: 0.9,
    },
  ],
  go: [
    {
      dimensionKey: 'GO_GOLANG_FOR_HIGH_PERFORMANCE_SERVICES',
      skillCode: 'GO_GOLANG_FOR_HIGH_PERFORMANCE_SERVICES',
      weight: 1,
    },
  ],
  rust: [
    {
      dimensionKey: 'RUST_FOR_SYSTEMS_RELIABILITY_ENGINEERING',
      skillCode: 'RUST_FOR_SYSTEMS_RELIABILITY_ENGINEERING',
      weight: 1,
    },
  ],
  ruby: [
    {
      dimensionKey: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      weight: 0.75,
    },
  ],
  php: [
    {
      dimensionKey: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      weight: 0.75,
    },
  ],
  kotlin: [
    {
      dimensionKey: 'KOTLIN_FOR_ANDROID_BACKEND_SERVICES',
      skillCode: 'KOTLIN_FOR_ANDROID_BACKEND_SERVICES',
      weight: 1,
    },
  ],
  swift: [
    {
      dimensionKey: 'SWIFT_FOR_IOS_MACOS_DEVELOPMENT',
      skillCode: 'SWIFT_FOR_IOS_MACOS_DEVELOPMENT',
      weight: 1,
    },
  ],
  sql: [
    {
      dimensionKey: 'SQL_QUERY_OPTIMIZATION',
      skillCode: 'SQL_QUERY_OPTIMIZATION',
      weight: 1,
    },
  ],
  plpgsql: [
    {
      dimensionKey: 'SQL_QUERY_OPTIMIZATION',
      skillCode: 'SQL_QUERY_OPTIMIZATION',
      weight: 1,
    },
  ],
  html: [
    {
      dimensionKey: 'MODERN_FRONTEND_FRAMEWORKS',
      skillCode: 'MODERN_FRONTEND_FRAMEWORKS',
      weight: 0.7,
    },
  ],
  css: [
    {
      dimensionKey: 'MODERN_FRONTEND_FRAMEWORKS',
      skillCode: 'MODERN_FRONTEND_FRAMEWORKS',
      weight: 0.7,
    },
  ],
  scss: [
    {
      dimensionKey: 'MODERN_FRONTEND_FRAMEWORKS',
      skillCode: 'MODERN_FRONTEND_FRAMEWORKS',
      weight: 0.7,
    },
  ],
  vue: [
    {
      dimensionKey: 'MODERN_FRONTEND_FRAMEWORKS',
      skillCode: 'MODERN_FRONTEND_FRAMEWORKS',
      weight: 0.85,
    },
  ],
  dockerfile: [
    {
      dimensionKey: 'CONTAINERIZATION_ORCHESTRATION',
      skillCode: 'CONTAINERIZATION_ORCHESTRATION',
      weight: 0.8,
    },
  ],
  shell: [
    {
      dimensionKey: 'INFRASTRUCTURE_AS_CODE_IAC',
      skillCode: 'INFRASTRUCTURE_AS_CODE_IAC',
      weight: 0.75,
    },
  ],
  'jupyter notebook': [
    {
      dimensionKey: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      weight: 0.9,
    },
    {
      dimensionKey: 'MACHINE_LEARNING_MODEL_DEVELOPMENT_DEPLOYMENT',
      skillCode: 'MACHINE_LEARNING_MODEL_DEVELOPMENT_DEPLOYMENT',
      weight: 0.7,
    },
  ],
} as const;

/** Self-selected skill name without byte-share evidence — weak passive signal. */
export const SELF_SELECTED_SKILL_SCORE = 0.35;
export const SELF_SELECTED_SKILL_CONFIDENCE = 0.4;
