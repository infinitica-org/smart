/**
 * HackerRank / LeetCode tag → skill@1 dimension mappings.
 */

export interface SignalTagMappingEntry {
  readonly tag: string;
  readonly dimensionKey: string;
  readonly skillCode: string;
  readonly weight: number;
}

export const HACKERRANK_TAG_MAPPING: Readonly<Record<string, SignalTagMappingEntry>> = {
  python: {
    tag: 'python',
    dimensionKey: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
    skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
    weight: 1,
  },
  java: {
    tag: 'java',
    dimensionKey: 'JAVA_ENTERPRISE_APPLICATION_DEVELOPMENT',
    skillCode: 'JAVA_ENTERPRISE_APPLICATION_DEVELOPMENT',
    weight: 0.9,
  },
  sql: {
    tag: 'sql',
    dimensionKey: 'SQL_QUERY_OPTIMIZATION',
    skillCode: 'SQL_QUERY_OPTIMIZATION',
    weight: 1,
  },
  'problem solving': {
    tag: 'problem solving',
    dimensionKey: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
    skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
    weight: 1,
  },
  'data structures': {
    tag: 'data structures',
    dimensionKey: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
    skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
    weight: 0.95,
  },
  javascript: {
    tag: 'javascript',
    dimensionKey: 'JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT',
    skillCode: 'JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT',
    weight: 0.9,
  },
  'c++': {
    tag: 'c++',
    dimensionKey: 'C_SYSTEMS_PERFORMANCE_ENGINEERING',
    skillCode: 'C_SYSTEMS_PERFORMANCE_ENGINEERING',
    weight: 0.85,
  },
};

export const LEETCODE_TAG_MAPPING: Readonly<Record<string, SignalTagMappingEntry>> = {
  array: {
    tag: 'array',
    dimensionKey: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
    skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
    weight: 0.9,
  },
  'dynamic-programming': {
    tag: 'dynamic-programming',
    dimensionKey: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
    skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
    weight: 1,
  },
  tree: {
    tag: 'tree',
    dimensionKey: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
    skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
    weight: 0.95,
  },
  graph: {
    tag: 'graph',
    dimensionKey: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
    skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
    weight: 0.95,
  },
  sql: {
    tag: 'sql',
    dimensionKey: 'SQL_QUERY_OPTIMIZATION',
    skillCode: 'SQL_QUERY_OPTIMIZATION',
    weight: 1,
  },
  database: {
    tag: 'database',
    dimensionKey: 'RELATIONAL_DATABASE_DESIGN_ADMINISTRATION',
    skillCode: 'RELATIONAL_DATABASE_DESIGN_ADMINISTRATION',
    weight: 0.9,
  },
  string: {
    tag: 'string',
    dimensionKey: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
    skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
    weight: 0.8,
  },
};

/** Cap confidence when recent activity is stale (anti-gaming). */
export function activityConfidenceCap(recentActivityDays: number): number {
  if (recentActivityDays >= 30) return 1;
  if (recentActivityDays >= 14) return 0.75;
  if (recentActivityDays >= 7) return 0.55;
  if (recentActivityDays >= 1) return 0.35;
  return 0.2;
}

/** Normalize solved count to [0, 1] score with diminishing returns. */
export function solvedCountScore(count: number, cap = 50): number {
  if (count <= 0) return 0;
  return Math.min(1, Math.log10(count + 1) / Math.log10(cap + 1));
}
