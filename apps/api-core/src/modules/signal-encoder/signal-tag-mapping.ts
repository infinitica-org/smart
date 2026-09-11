/**
 * HackerRank / LeetCode tag → INF-05 dimension mappings (S6-RM-12).
 *
 * Source JSON: tools/content-pipeline/data/signal-mappings/*.json
 *
 * Owner: Ramansh.
 */

export interface SignalTagMappingEntry {
  readonly tag: string;
  readonly dimensionKey: string;
  readonly skillCode: string;
  readonly weight: number;
}

/** Mirrors hackerrank-inf-05@3.json */
export const HACKERRANK_TAG_MAPPING: Readonly<Record<string, SignalTagMappingEntry>> = {
  python: {
    tag: 'python',
    dimensionKey: 'PYTHON_R_DATA_ANALYSIS',
    skillCode: 'PYTHON_R_DATA_ANALYSIS',
    weight: 1,
  },
  java: {
    tag: 'java',
    dimensionKey: 'OBJECT_ORIENTED_PROGRAMMING',
    skillCode: 'OBJECT_ORIENTED_PROGRAMMING',
    weight: 0.9,
  },
  sql: {
    tag: 'sql',
    dimensionKey: 'DATABASE_FUNDAMENTALS',
    skillCode: 'DATABASE_FUNDAMENTALS',
    weight: 1,
  },
  'problem solving': {
    tag: 'problem solving',
    dimensionKey: 'DATA_STRUCTURES_ALGORITHMS',
    skillCode: 'DATA_STRUCTURES_ALGORITHMS',
    weight: 1,
  },
  'data structures': {
    tag: 'data structures',
    dimensionKey: 'DATA_STRUCTURES_ALGORITHMS',
    skillCode: 'DATA_STRUCTURES_ALGORITHMS',
    weight: 0.95,
  },
  javascript: {
    tag: 'javascript',
    dimensionKey: 'LANGUAGE_PROFICIENCY',
    skillCode: 'LANGUAGE_PROFICIENCY',
    weight: 0.9,
  },
  'c++': {
    tag: 'c++',
    dimensionKey: 'DATA_STRUCTURES_ALGORITHMS',
    skillCode: 'DATA_STRUCTURES_ALGORITHMS',
    weight: 0.85,
  },
};

/** Mirrors leetcode-inf-05@3.json */
export const LEETCODE_TAG_MAPPING: Readonly<Record<string, SignalTagMappingEntry>> = {
  array: {
    tag: 'array',
    dimensionKey: 'DATA_STRUCTURES_ALGORITHMS',
    skillCode: 'DATA_STRUCTURES_ALGORITHMS',
    weight: 0.9,
  },
  'dynamic-programming': {
    tag: 'dynamic-programming',
    dimensionKey: 'DATA_STRUCTURES_ALGORITHMS',
    skillCode: 'DATA_STRUCTURES_ALGORITHMS',
    weight: 1,
  },
  tree: {
    tag: 'tree',
    dimensionKey: 'DATA_STRUCTURES_ALGORITHMS',
    skillCode: 'DATA_STRUCTURES_ALGORITHMS',
    weight: 0.95,
  },
  graph: {
    tag: 'graph',
    dimensionKey: 'DATA_STRUCTURES_ALGORITHMS',
    skillCode: 'DATA_STRUCTURES_ALGORITHMS',
    weight: 0.95,
  },
  sql: {
    tag: 'sql',
    dimensionKey: 'DATABASE_FUNDAMENTALS',
    skillCode: 'DATABASE_FUNDAMENTALS',
    weight: 1,
  },
  database: {
    tag: 'database',
    dimensionKey: 'DATABASE_FUNDAMENTALS',
    skillCode: 'DATABASE_FUNDAMENTALS',
    weight: 0.9,
  },
  string: {
    tag: 'string',
    dimensionKey: 'PROGRAMMING_FUNDAMENTALS_LOGIC',
    skillCode: 'PROGRAMMING_FUNDAMENTALS_LOGIC',
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
