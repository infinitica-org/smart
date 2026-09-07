/**
 * SDE Skill Verification Framework — Master Matrix v4 (assessment-only).
 * Source: SDE_Skill_Verificatio.pdf. Not INF-05 `SKILL_DEFINITIONS` in contracts.
 *
 * Owner: Ramansh (prompt/eval slice). Catalog/contracts remain VG/TN.
 */

export const SDE_V4_PROFICIENCIES = [
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
  'PROFESSIONAL',
] as const;
export type SdeV4Proficiency = (typeof SDE_V4_PROFICIENCIES)[number];

export const SDE_V4_FORMATS = [
  'MCQ',
  'TRACE',
  'CODING',
  'SCENARIO',
  'DEBUG',
  'DESIGN_REASONING',
] as const;
export type SdeV4Format = (typeof SDE_V4_FORMATS)[number];

export const SDE_V4_TASK_FAMILIES = ['CODING', 'APPLIED'] as const;
export type SdeV4TaskFamily = (typeof SDE_V4_TASK_FAMILIES)[number];

export interface SdeV4ClosedCounts {
  readonly MCQ: number;
  readonly TRACE: number;
}

export interface SdeV4LevelSpec {
  readonly timeMinutes: number;
  readonly passMarkPercent: number;
  readonly closed: SdeV4ClosedCounts;
  readonly openFormats: readonly SdeV4Format[];
  /** PDF matrix cell text for this proficiency (stems, not just format). */
  readonly flavorNotes: readonly string[];
}

export interface SdeV4SkillDefinition {
  readonly code: string;
  readonly name: string;
  readonly taskFamily: SdeV4TaskFamily;
  readonly levels: Readonly<Record<SdeV4Proficiency, SdeV4LevelSpec>>;
}

const CLOSED = {
  BEGINNER: { MCQ: 8, TRACE: 3 },
  INTERMEDIATE: { MCQ: 5, TRACE: 2 },
  ADVANCED: { MCQ: 2, TRACE: 1 },
  PROFESSIONAL: { MCQ: 1, TRACE: 1 },
} as const;

function level(
  proficiency: SdeV4Proficiency,
  openFormats: readonly SdeV4Format[],
  flavorNotes: readonly string[],
): SdeV4LevelSpec {
  const timeMinutes = proficiency === 'BEGINNER' ? 20 : proficiency === 'INTERMEDIATE' ? 40 : 55;
  const passMarkPercent = proficiency === 'INTERMEDIATE' || proficiency === 'ADVANCED' ? 75 : 80;
  return {
    timeMinutes,
    passMarkPercent,
    closed: CLOSED[proficiency],
    openFormats,
    flavorNotes,
  };
}

type OpenSpec = {
  readonly open: readonly SdeV4Format[];
  readonly flavors: readonly string[];
};

function codingLevels(
  beginner: OpenSpec,
  intermediate: OpenSpec,
  advanced: OpenSpec,
  professional: OpenSpec,
): SdeV4SkillDefinition['levels'] {
  return {
    BEGINNER: level('BEGINNER', beginner.open, beginner.flavors),
    INTERMEDIATE: level('INTERMEDIATE', intermediate.open, intermediate.flavors),
    ADVANCED: level('ADVANCED', advanced.open, advanced.flavors),
    PROFESSIONAL: level('PROFESSIONAL', professional.open, professional.flavors),
  };
}

export const SDE_V4_SKILLS: readonly SdeV4SkillDefinition[] = [
  {
    code: 'SDE_PROGRAMMING_FUNDAMENTALS',
    name: 'Programming Fundamentals',
    taskFamily: 'CODING',
    levels: codingLevels(
      { open: ['CODING'], flavors: ['Easy coding task'] },
      { open: ['CODING', 'CODING'], flavors: ['Two medium coding tasks'] },
      { open: ['CODING', 'CODING', 'DEBUG'], flavors: ['Two hard coding tasks', 'Debug task'] },
      {
        open: ['CODING', 'DEBUG', 'DESIGN_REASONING'],
        flavors: ['Optimised coding', 'Multi-bug debug', 'Design reasoning'],
      },
    ),
  },
  {
    code: 'SDE_DSA',
    name: 'Data Structures & Algorithms',
    taskFamily: 'CODING',
    levels: codingLevels(
      { open: ['CODING'], flavors: ['Easy coding task'] },
      { open: ['CODING', 'CODING'], flavors: ['Two medium coding tasks'] },
      { open: ['CODING', 'CODING', 'DEBUG'], flavors: ['Two hard coding tasks', 'Debug task'] },
      {
        open: ['CODING', 'DEBUG', 'DESIGN_REASONING'],
        flavors: ['Hard coding', 'Debug', 'Design: pick the right structure'],
      },
    ),
  },
  {
    code: 'SDE_OOP',
    name: 'OOP Concepts',
    taskFamily: 'CODING',
    levels: codingLevels(
      { open: ['CODING'], flavors: ['Easy class/method coding'] },
      { open: ['CODING', 'CODING'], flavors: ['Class design', 'Second medium coding task'] },
      {
        open: ['CODING', 'CODING', 'DEBUG'],
        flavors: ['Multi-class coding', 'Hard coding', 'Debug task'],
      },
      {
        open: ['CODING', 'DEBUG', 'DESIGN_REASONING'],
        flavors: ['Hard coding', 'Debug', 'Design: pattern refactor'],
      },
    ),
  },
  {
    code: 'SDE_DATABASE_SQL',
    name: 'Database & SQL',
    taskFamily: 'CODING',
    levels: codingLevels(
      { open: ['CODING'], flavors: ['Write a simple query'] },
      { open: ['CODING', 'CODING'], flavors: ['Write query', 'Second query task'] },
      {
        open: ['CODING', 'CODING', 'DEBUG'],
        flavors: ['Joins/subqueries', 'Hard SQL', 'Debug task'],
      },
      {
        open: ['CODING', 'DEBUG', 'DESIGN_REASONING'],
        flavors: ['Hard query', 'Debug: perf/index', 'Design: schema'],
      },
    ),
  },
  {
    code: 'SDE_OPERATING_SYSTEMS',
    name: 'Operating Systems',
    taskFamily: 'APPLIED',
    levels: codingLevels(
      { open: ['SCENARIO'], flavors: ['Easy applied OS scenario'] },
      { open: ['SCENARIO', 'SCENARIO'], flavors: ['Two medium OS scenarios'] },
      {
        open: ['SCENARIO', 'SCENARIO', 'DEBUG'],
        flavors: ['Two hard OS scenarios', 'Debug: trace deadlock'],
      },
      {
        open: ['SCENARIO', 'DEBUG', 'DESIGN_REASONING'],
        flavors: ['Hard OS scenario', 'Debug: trace analysis', 'Design reasoning'],
      },
    ),
  },
  {
    code: 'SDE_COMPUTER_NETWORKS',
    name: 'Computer Networks',
    taskFamily: 'APPLIED',
    levels: codingLevels(
      { open: ['SCENARIO'], flavors: ['Easy applied networking scenario'] },
      { open: ['SCENARIO', 'SCENARIO'], flavors: ['Two medium networking scenarios'] },
      {
        open: ['SCENARIO', 'SCENARIO', 'DEBUG'],
        flavors: ['Two hard networking scenarios', 'Debug: fix misconfig'],
      },
      {
        open: ['SCENARIO', 'DEBUG', 'DESIGN_REASONING'],
        flavors: ['Hard networking scenario', 'Debug: log analysis', 'Design: topology'],
      },
    ),
  },
  {
    code: 'SDE_GIT',
    name: 'Git & Version Control',
    taskFamily: 'APPLIED',
    levels: codingLevels(
      { open: ['SCENARIO'], flavors: ['Easy Git scenario'] },
      { open: ['SCENARIO', 'SCENARIO'], flavors: ['Branch/merge scenario', 'Second medium Git'] },
      {
        open: ['SCENARIO', 'SCENARIO', 'DEBUG'],
        flavors: ['Two hard Git scenarios', 'Debug: broken history'],
      },
      {
        open: ['SCENARIO', 'DEBUG', 'DESIGN_REASONING'],
        flavors: ['Hard Git scenario', 'Debug: repo recovery', 'Design: branching strategy'],
      },
    ),
  },
  {
    code: 'SDE_WEB_FRAMEWORKS',
    name: 'Web Frameworks (React/Node)',
    taskFamily: 'CODING',
    levels: codingLevels(
      { open: ['CODING'], flavors: ['Easy component or endpoint'] },
      {
        open: ['CODING', 'CODING'],
        flavors: ['Component/endpoint', 'Second medium coding task'],
      },
      {
        open: ['CODING', 'CODING', 'DEBUG'],
        flavors: ['Stateful coding', 'Hard coding', 'Debug task'],
      },
      {
        open: ['CODING', 'DEBUG', 'DESIGN_REASONING'],
        flavors: ['Integration coding', 'Debug', 'Design reasoning'],
      },
    ),
  },
  {
    code: 'SDE_SYSTEM_DESIGN',
    name: 'System Design & Architecture',
    taskFamily: 'APPLIED',
    levels: codingLevels(
      { open: ['SCENARIO'], flavors: ['Easy design scenario'] },
      { open: ['SCENARIO', 'SCENARIO'], flavors: ['Basic design', 'Second medium scenario'] },
      {
        open: ['SCENARIO', 'DESIGN_REASONING', 'DEBUG'],
        flavors: ['Hard scenario', 'Design reasoning', 'Debug: spot flaw'],
      },
      {
        open: ['SCENARIO', 'DEBUG', 'DESIGN_REASONING'],
        flavors: ['Hard scenario', 'Debug: bottleneck', 'Design: deep'],
      },
    ),
  },
  {
    code: 'SDE_TESTING',
    name: 'Testing & Debugging',
    taskFamily: 'CODING',
    levels: codingLevels(
      { open: ['CODING'], flavors: ['Easy coding: write a test'] },
      { open: ['CODING', 'CODING'], flavors: ['Write tests', 'Second medium coding'] },
      {
        open: ['CODING', 'CODING', 'DEBUG'],
        flavors: ['Test suite', 'Hard coding', 'Debug task'],
      },
      {
        open: ['CODING', 'DEBUG', 'DESIGN_REASONING'],
        flavors: ['Edge-case suite', 'Debug: root cause', 'Design reasoning'],
      },
    ),
  },
  {
    code: 'SDE_DEPLOYMENT_CICD',
    name: 'Deployment & CI/CD',
    taskFamily: 'APPLIED',
    levels: codingLevels(
      { open: ['SCENARIO'], flavors: ['Easy pipeline/deploy scenario'] },
      { open: ['SCENARIO', 'SCENARIO'], flavors: ['Pipeline config', 'Second medium scenario'] },
      {
        open: ['SCENARIO', 'SCENARIO', 'DEBUG'],
        flavors: ['Two hard deploy scenarios', 'Debug: fix pipeline'],
      },
      {
        open: ['SCENARIO', 'DEBUG', 'DESIGN_REASONING'],
        flavors: ['Hard deploy scenario', 'Debug: deploy failure', 'Design: release strategy'],
      },
    ),
  },
];

export const SDE_V4_SKILL_BY_CODE: ReadonlyMap<string, SdeV4SkillDefinition> = new Map(
  SDE_V4_SKILLS.map((skill) => [skill.code, skill]),
);

export const SDE_V4_ITEM_TOTALS: Readonly<Record<SdeV4Proficiency, number>> = {
  BEGINNER: 12,
  INTERMEDIATE: 9,
  ADVANCED: 6,
  PROFESSIONAL: 5,
};

export function expectedFormCounts(
  skill: SdeV4SkillDefinition,
  proficiency: SdeV4Proficiency,
): {
  readonly MCQ: number;
  readonly TRACE: number;
  readonly open: readonly SdeV4Format[];
  readonly total: number;
} {
  const spec = skill.levels[proficiency];
  return {
    MCQ: spec.closed.MCQ,
    TRACE: spec.closed.TRACE,
    open: spec.openFormats,
    total: spec.closed.MCQ + spec.closed.TRACE + spec.openFormats.length,
  };
}

export function assertSdeV4FormShape(
  skill: SdeV4SkillDefinition,
  proficiency: SdeV4Proficiency,
  formats: readonly SdeV4Format[],
): void {
  const expected = expectedFormCounts(skill, proficiency);
  if (formats.length !== expected.total) {
    throw new Error(
      `${skill.code} ${proficiency}: expected ${String(expected.total)} items, got ${String(formats.length)}`,
    );
  }
  const mcq = formats.filter((format) => format === 'MCQ').length;
  const trace = formats.filter((format) => format === 'TRACE').length;
  if (mcq !== expected.MCQ || trace !== expected.TRACE) {
    throw new Error(
      `${skill.code} ${proficiency}: expected ${String(expected.MCQ)} MCQ + ${String(expected.TRACE)} TRACE`,
    );
  }
  const open = formats.filter((format) => format !== 'MCQ' && format !== 'TRACE');
  if (open.length !== expected.open.length) {
    throw new Error(`${skill.code} ${proficiency}: open-item count mismatch`);
  }
  for (let i = 0; i < expected.open.length; i += 1) {
    if (open[i] !== expected.open[i]) {
      throw new Error(
        `${skill.code} ${proficiency}: open[${String(i)}] expected ${expected.open[i]}, got ${open[i]}`,
      );
    }
  }
}
