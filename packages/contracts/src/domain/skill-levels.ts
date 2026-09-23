/**
 * Shared proficiency level types and assessment thresholds for skill verification.
 */

export const PROFICIENCY_LEVEL_ORDER = [
  'BEGINNER',
  'INTERMEDIATE',
  'PROFICIENT',
  'ADVANCED',
  'PROFESSIONAL',
] as const;

export type ProficiencyLevel = (typeof PROFICIENCY_LEVEL_ORDER)[number];
export type QuestionType = 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'LONG_ANSWER' | 'CODING';

export interface QuestionCounts {
  readonly MCQ: number;
  readonly TRUE_FALSE: number;
  readonly SHORT_ANSWER: number;
  readonly LONG_ANSWER: number;
  readonly CODING: number;
}

export interface LevelThreshold {
  readonly passMark: number;
  readonly timeMinutes: number;
  readonly questionCounts: QuestionCounts;
  readonly interviewRequired: boolean;
  readonly projectRequired: boolean;
  readonly competencyBar: string;
}

export const LEVEL_QUESTION_TOTALS: Record<ProficiencyLevel, number> = {
  BEGINNER: 20,
  INTERMEDIATE: 20,
  PROFICIENT: 25,
  ADVANCED: 30,
  PROFESSIONAL: 30,
};

export const LEVEL_VERIFICATION_METHOD: Record<
  ProficiencyLevel,
  { interviewRequired: boolean; projectRequired: boolean }
> = {
  BEGINNER: { interviewRequired: false, projectRequired: false },
  INTERMEDIATE: { interviewRequired: false, projectRequired: false },
  PROFICIENT: { interviewRequired: false, projectRequired: false },
  ADVANCED: { interviewRequired: true, projectRequired: false },
  PROFESSIONAL: { interviewRequired: true, projectRequired: true },
};

export const DEFAULT_COMPETENCY_BARS: Readonly<Record<ProficiencyLevel, string>> = {
  BEGINNER: 'Conceptual understanding; supervised tasks',
  INTERMEDIATE: 'Independent, bounded-scope execution',
  PROFICIENT: 'Consistent independent delivery; typical production scenarios',
  ADVANCED: 'Owns a component end-to-end; trade-off reasoning',
  PROFESSIONAL: 'Sets standards / architecture / strategy',
};

export function levels(
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
    PROFICIENT: {
      passMark: 67,
      timeMinutes: 50,
      questionCounts: { MCQ: 9, TRUE_FALSE: 5, SHORT_ANSWER: 4, LONG_ANSWER: 3, CODING: 4 },
      interviewRequired: false,
      projectRequired: false,
      competencyBar: bars.PROFICIENT,
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

export function assertSkillQuestionCounts(skill: {
  code: string;
  levels: Readonly<Record<ProficiencyLevel, LevelThreshold>>;
}): void {
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
    if (level === 'BEGINNER' && CODING > 0) {
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

/** Canonical proficiency ordering for UI level numbers (1–5). */
export const PROFICIENCY_TRADITIONAL_LABELS: Readonly<Record<ProficiencyLevel, string>> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  PROFICIENT: 'Proficient',
  ADVANCED: 'Advanced',
  PROFESSIONAL: 'Professional',
};

export function proficiencyLevelIndex(level: string): number {
  return PROFICIENCY_LEVEL_ORDER.indexOf(level as ProficiencyLevel);
}

/** Maps BEGINNER → 1 … PROFESSIONAL → 5; unknown → 0. */
export function proficiencyLevelNumber(level: string): number {
  const idx = proficiencyLevelIndex(level);
  return idx >= 0 ? idx + 1 : 0;
}

/** UI-facing label — backend enums stay unchanged. */
export function proficiencyLevelUiLabel(level: string): string {
  const n = proficiencyLevelNumber(level);
  return n > 0 ? `Level ${String(n)}` : level;
}

export function proficiencyLegendEntries(): ReadonlyArray<{
  level: number;
  traditionalLabel: string;
}> {
  return PROFICIENCY_LEVEL_ORDER.map((key, index) => ({
    level: index + 1,
    traditionalLabel: PROFICIENCY_TRADITIONAL_LABELS[key],
  }));
}

/** Competency evidence bands for placement gap visuals (not proficiency tiers). */
export const COMPETENCY_GAP_DEMONSTRATION_LEVEL = 2;

export function competencyDemonstrationLevel(hitScore: number): number {
  if (hitScore >= 0.5) return 2;
  if (hitScore >= 0.25) return 1;
  return 0;
}
