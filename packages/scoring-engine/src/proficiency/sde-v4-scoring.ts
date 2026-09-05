import { Effect } from 'effect';
import type { InvalidWeightsError } from '../errors.js';
import { computeMarkWeightedScore, type ScoredItem } from './mark-weighted-scoring.js';

export const SDE_V4_FORMATS = [
  'MCQ',
  'TRACE',
  'CODING',
  'SCENARIO',
  'DEBUG',
  'DESIGN_REASONING',
] as const;
export type SdeV4ScoreFormat = (typeof SDE_V4_FORMATS)[number];

export const SDE_V4_PROFICIENCIES = [
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
  'PROFESSIONAL',
] as const;
export type SdeV4ScoreProficiency = (typeof SDE_V4_PROFICIENCIES)[number];

/** Closed items 1 mark; open tasks 10 marks (v4 assessment-only mix). */
export const SDE_V4_MARKS: Readonly<Record<SdeV4ScoreFormat, number>> = {
  MCQ: 1,
  TRACE: 1,
  CODING: 10,
  SCENARIO: 10,
  DEBUG: 10,
  DESIGN_REASONING: 10,
};

export const SDE_V4_PASS_PERCENT: Readonly<Record<SdeV4ScoreProficiency, number>> = {
  BEGINNER: 80,
  INTERMEDIATE: 75,
  ADVANCED: 75,
  PROFESSIONAL: 80,
};

export function scoreClosedChoice(selected: string | null, correct: string): number {
  if (selected === null) return 0;
  return selected.trim().toUpperCase() === correct.trim().toUpperCase() ? 1 : 0;
}

export function sdeV4Passed(scorePercent: number, proficiency: SdeV4ScoreProficiency): boolean {
  return scorePercent + Number.EPSILON >= SDE_V4_PASS_PERCENT[proficiency];
}

export function computeSdeV4FormScore(
  items: readonly ScoredItem[],
  proficiency: SdeV4ScoreProficiency,
): Effect.Effect<
  { marksEarned: number; marksTotal: number; scorePercent: number; passed: boolean },
  InvalidWeightsError
> {
  return Effect.gen(function* () {
    const scored = yield* computeMarkWeightedScore(items);
    return {
      ...scored,
      passed: sdeV4Passed(scored.scorePercent, proficiency),
    };
  });
}
