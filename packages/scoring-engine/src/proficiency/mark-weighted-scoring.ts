import { Effect } from 'effect';
import type { ItemType } from '@smart/contracts';
import { InvalidScoreError, InvalidWeightsError } from '../errors.js';
import { roundTo, sum } from '../statistics.js';

/**
 * INF-05 mark-weighted proficiency scoring — the Scoring Schema document's
 * "Core Formula" (marks earned / total marks x 100), plus the coding 70/30
 * split and the Professional debug/incident-scenario three-band gate.
 *
 * This sits alongside — and never replaces — `assignTier()`: SkillClaim
 * verification (SE-T01/CN-T04) is a fixed-threshold pass/fail gate against
 * `SkillPassThresholdsDto` (PRD v1 §7.3), not a calibrated Gold/Silver/Bronze
 * certification. Nothing here invents a parallel tier.
 *
 * `SCENARIO_RESPONSE` stands in for the Scoring Schema's "Long Answer" (6
 * marks) — the current `ItemType` enum has no separate LONG_ANSWER member.
 *
 * The debug-scenario three-band gate applies only when the assessed tier is
 * PROFESSIONAL on the SkillClaim path; lower tiers use the standard mark ratio.
 *
 * Owner: Ramansh.
 */

export const MARK_WEIGHTED_ITEM_TYPES = [
  'MCQ_SINGLE',
  'MCQ_MULTI',
  'NUMERIC_ENTRY',
  'SHORT_ANSWER',
  'SCENARIO_RESPONSE',
  'CODE_TASK',
  'SQL_TASK',
] as const satisfies readonly ItemType[];
export type MarkWeightedItemType = (typeof MARK_WEIGHTED_ITEM_TYPES)[number];

/** Marks per correct/rubric-max answer (Scoring Schema §"Mark Allocation by Question Type"). */
export const MARK_WEIGHTS: Readonly<Record<MarkWeightedItemType, number>> = {
  MCQ_SINGLE: 1,
  MCQ_MULTI: 1,
  NUMERIC_ENTRY: 1,
  SHORT_ANSWER: 3,
  SCENARIO_RESPONSE: 6,
  CODE_TASK: 10,
  SQL_TASK: 10,
} as const;

/** Coding marks split 70% automated test runner / 30% AI design rubric. */
export const CODING_TEST_RUNNER_MAX_MARKS = 7;
export const CODING_AI_RUBRIC_MAX_MARKS = 3;

export interface ScoredItem {
  readonly itemId: string;
  readonly marksEarned: number;
  readonly marksMax: number;
}

export interface MarkWeightedScoreResult {
  readonly marksEarned: number;
  readonly marksTotal: number;
  /** Percentage, 0-100. */
  readonly scorePercent: number;
}

/** Core Formula: SCORE % = (marks earned / total marks) x 100. */
export function computeMarkWeightedScore(
  items: readonly ScoredItem[],
): Effect.Effect<MarkWeightedScoreResult, InvalidWeightsError> {
  return Effect.gen(function* () {
    const marksTotal = sum(items.map((item) => item.marksMax));
    if (marksTotal <= 0) {
      return yield* Effect.fail(
        new InvalidWeightsError({
          sum: marksTotal,
          message: `Total marks must be positive; received ${String(marksTotal)} across ${String(items.length)} item(s).`,
        }),
      );
    }
    const marksEarned = sum(items.map((item) => item.marksEarned));
    return {
      marksEarned: roundTo(marksEarned, 2),
      marksTotal: roundTo(marksTotal, 2),
      scorePercent: roundTo((marksEarned / marksTotal) * 100, 2),
    };
  });
}

export const TEST_CASE_TYPES = ['HAPPY_PATH', 'EDGE_CASE', 'PERFORMANCE', 'CONCURRENCY'] as const;
export type TestCaseType = (typeof TEST_CASE_TYPES)[number];

/** Weighted test-case categories feeding the 7-mark test-runner score. */
export const TEST_CASE_WEIGHTS: Readonly<Record<TestCaseType, number>> = {
  HAPPY_PATH: 0.5,
  EDGE_CASE: 1.0,
  PERFORMANCE: 1.0,
  CONCURRENCY: 1.5,
} as const;

export interface WeightedTestCase {
  readonly type: TestCaseType;
  readonly passed: boolean;
}

/**
 * Coding test-runner sub-score, 0-7 marks (70% of a 10-mark coding item).
 *
 *   Score = (weighted cases passed / total weight) x 7
 */
export function computeCodingTestRunnerScore(
  cases: readonly WeightedTestCase[],
): Effect.Effect<number, InvalidWeightsError> {
  return Effect.gen(function* () {
    if (cases.length === 0) return 0;
    const totalWeight = sum(cases.map((c) => TEST_CASE_WEIGHTS[c.type]));
    if (totalWeight <= 0) {
      return yield* Effect.fail(
        new InvalidWeightsError({
          sum: totalWeight,
          message: 'Test case weights summed to zero or less; cannot score a coding item.',
        }),
      );
    }
    const passedWeight = sum(cases.filter((c) => c.passed).map((c) => TEST_CASE_WEIGHTS[c.type]));
    return roundTo((passedWeight / totalWeight) * CODING_TEST_RUNNER_MAX_MARKS, 2);
  });
}

/**
 * Combine a coding item's two sub-scores into its 10-mark total.
 * `testRunnerScore` is 0-7, `aiRubricScore` is 0-3 (Scoring Schema §"Coding").
 */
export function computeCodingItemScore(testRunnerScore: number, aiRubricScore: number): number {
  const clampedRunner = Math.min(Math.max(testRunnerScore, 0), CODING_TEST_RUNNER_MAX_MARKS);
  const clampedRubric = Math.min(Math.max(aiRubricScore, 0), CODING_AI_RUBRIC_MAX_MARKS);
  return roundTo(clampedRunner + clampedRubric, 2);
}

/* --------------------------- Professional debug gate ----------------------- */
/* Dormant — see module docstring. Kept pure, exported and tested so it is    */
/* ready the day SkillProficiency gains PROFESSIONAL.                        */

export const DEBUG_SCENARIO_DIMENSION_MAX = {
  rootCause: 12,
  fix: 9,
  tradeoff: 6,
  monitoring: 3,
} as const;

export const DEBUG_SCENARIO_MAX_MARKS = 30;
/** >= this: Professional confirmed outright. */
export const DEBUG_SCENARIO_CONFIRM_FLOOR = 21;
/** >= this (and below the confirm floor): short follow-up probe. Below it: Advanced fallback. */
export const DEBUG_SCENARIO_PROBE_FLOOR = 15;

export interface DebugScenarioDimensions {
  readonly rootCause: number;
  readonly fix: number;
  readonly tradeoff: number;
  readonly monitoring: number;
}

export type DebugScenarioOutcome =
  'PROFESSIONAL_CONFIRMED' | 'FOLLOW_UP_PROBE' | 'ADVANCED_FALLBACK';

export interface DebugScenarioGateResult {
  readonly totalMarks: number;
  readonly outcome: DebugScenarioOutcome;
}

/**
 * Professional debug/incident scenario gate — three-band outcome, no hard
 * cutoff (Proficiency Framework §"Three-Band Outcome").
 */
export function evaluateDebugScenarioGate(
  dimensions: DebugScenarioDimensions,
): Effect.Effect<DebugScenarioGateResult, InvalidScoreError> {
  return Effect.gen(function* () {
    const totalMarks = roundTo(
      dimensions.rootCause + dimensions.fix + dimensions.tradeoff + dimensions.monitoring,
      2,
    );
    if (totalMarks < 0 || totalMarks > DEBUG_SCENARIO_MAX_MARKS) {
      return yield* Effect.fail(
        new InvalidScoreError({
          value: totalMarks,
          message: `Debug scenario total must be in [0, ${String(DEBUG_SCENARIO_MAX_MARKS)}]; received ${String(totalMarks)}.`,
        }),
      );
    }

    const outcome: DebugScenarioOutcome =
      totalMarks >= DEBUG_SCENARIO_CONFIRM_FLOOR
        ? 'PROFESSIONAL_CONFIRMED'
        : totalMarks >= DEBUG_SCENARIO_PROBE_FLOOR
          ? 'FOLLOW_UP_PROBE'
          : 'ADVANCED_FALLBACK';

    return { totalMarks, outcome };
  });
}
