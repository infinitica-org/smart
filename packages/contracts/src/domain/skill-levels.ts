/**
 * Shared proficiency level types and assessment thresholds for skill verification.
 */

export type ProficiencyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PROFESSIONAL';
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
  ADVANCED: 30,
  PROFESSIONAL: 30,
};

export const LEVEL_VERIFICATION_METHOD: Record<
  ProficiencyLevel,
  { interviewRequired: boolean; projectRequired: boolean }
> = {
  BEGINNER: { interviewRequired: false, projectRequired: false },
  INTERMEDIATE: { interviewRequired: false, projectRequired: false },
  ADVANCED: { interviewRequired: true, projectRequired: false },
  PROFESSIONAL: { interviewRequired: true, projectRequired: true },
};

export const DEFAULT_COMPETENCY_BARS: Readonly<Record<ProficiencyLevel, string>> = {
  BEGINNER: 'Conceptual understanding; supervised tasks',
  INTERMEDIATE: 'Independent, bounded-scope execution',
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
