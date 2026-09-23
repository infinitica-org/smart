/**
 * SDE Skill Verification Framework — Master Matrix v4 (assessment-only).
 * Source: SDE_Skill_Verificatio.pdf. Not INF-05 `SKILL_DEFINITIONS` in contracts.
 *
 * Owner: Ramansh (prompt/eval slice). Catalog/contracts remain VG/TN.
 */

export const SDE_V4_PROFICIENCIES = [
  'BEGINNER',
  'INTERMEDIATE',
  'PROFICIENT',
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
  PROFICIENT: { MCQ: 3, TRACE: 2 },
  ADVANCED: { MCQ: 2, TRACE: 1 },
  PROFESSIONAL: { MCQ: 1, TRACE: 1 },
} as const;

function level(
  proficiency: SdeV4Proficiency,
  openFormats: readonly SdeV4Format[],
  flavorNotes: readonly string[],
): SdeV4LevelSpec {
  const timeMinutes =
    proficiency === 'BEGINNER'
      ? 20
      : proficiency === 'INTERMEDIATE'
        ? 40
        : proficiency === 'PROFICIENT'
          ? 48
          : 55;
  const passMarkPercent = proficiency === 'BEGINNER' || proficiency === 'PROFESSIONAL' ? 80 : 75;
  return {
    timeMinutes,
    passMarkPercent,
    closed: CLOSED[proficiency],
    openFormats,
    flavorNotes,
  };
}

type FlavorSpec = {
  readonly beginner: readonly string[];
  readonly intermediate: readonly string[];
  readonly proficient?: readonly string[];
  readonly advanced: readonly string[];
  readonly professional: readonly string[];
};

/** Open items are only CODING (coding family) or SCENARIO (applied family) — no DEBUG / DESIGN_REASONING. */
function levelsForFamily(
  taskFamily: SdeV4TaskFamily,
  flavors: FlavorSpec,
): SdeV4SkillDefinition['levels'] {
  const openFormat: SdeV4Format = taskFamily === 'CODING' ? 'CODING' : 'SCENARIO';
  const open = (count: number): readonly SdeV4Format[] =>
    Array.from({ length: count }, () => openFormat);
  return {
    BEGINNER: level('BEGINNER', open(1), flavors.beginner),
    INTERMEDIATE: level('INTERMEDIATE', open(2), flavors.intermediate),
    PROFICIENT: level('PROFICIENT', open(2), flavors.proficient ?? flavors.intermediate),
    ADVANCED: level('ADVANCED', open(3), flavors.advanced),
    PROFESSIONAL: level('PROFESSIONAL', open(3), flavors.professional),
  };
}

export const SDE_V4_SKILLS: readonly SdeV4SkillDefinition[] = [
  {
    code: 'SDE_PROGRAMMING_FUNDAMENTALS',
    name: 'Programming Fundamentals',
    taskFamily: 'CODING',
    levels: levelsForFamily('CODING', {
      beginner: ['Easy coding task'],
      intermediate: ['Two medium coding tasks'],
      advanced: ['Two hard coding tasks', 'Third hard coding task'],
      professional: ['Optimised coding', 'Integration coding', 'Hard coding with trade-offs'],
    }),
  },
  {
    code: 'SDE_DSA',
    name: 'Data Structures & Algorithms',
    taskFamily: 'CODING',
    levels: levelsForFamily('CODING', {
      beginner: ['Easy coding task'],
      intermediate: ['Two medium coding tasks'],
      advanced: ['Two hard coding tasks', 'Third hard coding task'],
      professional: ['Hard coding', 'Complexity-aware coding', 'Pick the right structure'],
    }),
  },
  {
    code: 'SDE_OOP',
    name: 'OOP Concepts',
    taskFamily: 'CODING',
    levels: levelsForFamily('CODING', {
      beginner: ['Easy class/method coding'],
      intermediate: ['Class design', 'Second medium coding task'],
      advanced: ['Multi-class coding', 'Hard coding', 'Third OOP coding task'],
      professional: ['Hard coding', 'Refactor coding', 'Pattern-oriented coding'],
    }),
  },
  {
    code: 'SDE_DATABASE_SQL',
    name: 'Database & SQL',
    taskFamily: 'CODING',
    levels: levelsForFamily('CODING', {
      beginner: ['Write a simple query'],
      intermediate: ['Write query', 'Second query task'],
      advanced: ['Joins/subqueries', 'Hard SQL', 'Third SQL coding task'],
      professional: ['Hard query', 'Performance-oriented SQL', 'Schema-oriented SQL task'],
    }),
  },
  {
    code: 'SDE_OPERATING_SYSTEMS',
    name: 'Operating Systems',
    taskFamily: 'APPLIED',
    levels: levelsForFamily('APPLIED', {
      beginner: ['Easy applied OS scenario'],
      intermediate: ['Two medium OS scenarios'],
      advanced: ['Two hard OS scenarios', 'Third OS scenario (e.g. deadlock)'],
      professional: ['Hard OS scenario', 'Trace/analysis scenario', 'Design trade-off scenario'],
    }),
  },
  {
    code: 'SDE_COMPUTER_NETWORKS',
    name: 'Computer Networks',
    taskFamily: 'APPLIED',
    levels: levelsForFamily('APPLIED', {
      beginner: ['Easy applied networking scenario'],
      intermediate: ['Two medium networking scenarios'],
      advanced: ['Two hard networking scenarios', 'Third networking scenario'],
      professional: ['Hard networking scenario', 'Troubleshooting scenario', 'Topology trade-offs'],
    }),
  },
  {
    code: 'SDE_GIT',
    name: 'Git & Version Control',
    taskFamily: 'APPLIED',
    levels: levelsForFamily('APPLIED', {
      beginner: ['Easy Git scenario'],
      intermediate: ['Branch/merge scenario', 'Second medium Git scenario'],
      advanced: ['Two hard Git scenarios', 'Third Git scenario'],
      professional: ['Hard Git scenario', 'Recovery scenario', 'Branching strategy scenario'],
    }),
  },
  {
    code: 'SDE_WEB_FRAMEWORKS',
    name: 'Web Frameworks (React/Node)',
    taskFamily: 'CODING',
    levels: levelsForFamily('CODING', {
      beginner: ['Easy component or endpoint'],
      intermediate: ['Component/endpoint', 'Second medium coding task'],
      advanced: ['Stateful coding', 'Hard coding', 'Third UI/API coding task'],
      professional: ['Integration coding', 'Hard coding', 'Architecture trade-off coding'],
    }),
  },
  {
    code: 'SDE_SYSTEM_DESIGN',
    name: 'System Design & Architecture',
    taskFamily: 'APPLIED',
    levels: levelsForFamily('APPLIED', {
      beginner: ['Easy design scenario'],
      intermediate: ['Basic design', 'Second medium scenario'],
      advanced: ['Hard scenario', 'Design trade-offs scenario', 'Spot-the-flaw scenario'],
      professional: ['Hard scenario', 'Bottleneck scenario', 'Deep design scenario'],
    }),
  },
  {
    code: 'SDE_TESTING',
    name: 'Testing & Debugging',
    taskFamily: 'CODING',
    levels: levelsForFamily('CODING', {
      beginner: ['Easy coding: write a test'],
      intermediate: ['Write tests', 'Second medium coding'],
      advanced: ['Test suite coding', 'Hard coding', 'Third testing-focused coding task'],
      professional: ['Edge-case suite', 'Root-cause coding', 'Test design coding'],
    }),
  },
  {
    code: 'SDE_DEPLOYMENT_CICD',
    name: 'Deployment & CI/CD',
    taskFamily: 'APPLIED',
    levels: levelsForFamily('APPLIED', {
      beginner: ['Easy pipeline/deploy scenario'],
      intermediate: ['Pipeline config', 'Second medium scenario'],
      advanced: ['Two hard deploy scenarios', 'Third deploy scenario'],
      professional: [
        'Hard deploy scenario',
        'Pipeline failure scenario',
        'Release strategy scenario',
      ],
    }),
  },
];

export const SDE_V4_SKILL_BY_CODE: ReadonlyMap<string, SdeV4SkillDefinition> = new Map(
  SDE_V4_SKILLS.map((skill) => [skill.code, skill]),
);

export const SDE_V4_ITEM_TOTALS: Readonly<Record<SdeV4Proficiency, number>> = {
  BEGINNER: 12,
  INTERMEDIATE: 9,
  PROFICIENT: 7,
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
