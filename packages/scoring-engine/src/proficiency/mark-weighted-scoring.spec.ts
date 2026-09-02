import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  computeCodingItemScore,
  computeCodingTestRunnerScore,
  computeMarkWeightedScore,
  evaluateDebugScenarioGate,
} from './mark-weighted-scoring.js';

const run = <A, E>(effect: Effect.Effect<A, E>): Either.Either<A, E> =>
  Effect.runSync(Effect.either(effect));

const expectOk = <A, E>(effect: Effect.Effect<A, E>): A => {
  const result = run(effect);
  if (Either.isLeft(result)) {
    throw new Error(`expected success, got failure: ${JSON.stringify(result.left)}`);
  }
  return result.right;
};

/**
 * Each test pins one promise the Scoring Schema document (INF-05) makes
 * about mark-weighted scoring. This is a fixed-threshold placement gate,
 * never the calibrated certification tier engine — see the module docstring.
 */

describe('computeMarkWeightedScore', () => {
  it('applies the Core Formula: marks earned / total marks x 100', () => {
    const result = expectOk(
      computeMarkWeightedScore([{ itemId: 'a', marksEarned: 21, marksMax: 34 }]),
    );
    expect(result.marksEarned).toBe(21);
    expect(result.marksTotal).toBe(34);
    expect(result.scorePercent).toBeCloseTo(61.76, 2);
  });

  it('sums marks across a mixed-item-type attempt', () => {
    const result = expectOk(
      computeMarkWeightedScore([
        { itemId: 'mcq-1', marksEarned: 1, marksMax: 1 },
        { itemId: 'mcq-2', marksEarned: 0, marksMax: 1 },
        { itemId: 'short-1', marksEarned: 2, marksMax: 3 },
        { itemId: 'long-1', marksEarned: 4, marksMax: 6 },
      ]),
    );
    expect(result.marksEarned).toBe(7);
    expect(result.marksTotal).toBe(11);
    expect(result.scorePercent).toBeCloseTo((7 / 11) * 100, 2);
  });

  it('refuses a zero or negative total mark pool', () => {
    const result = run(computeMarkWeightedScore([]));
    expect(Either.isLeft(result)).toBe(true);
  });
});

describe('computeCodingTestRunnerScore', () => {
  it('weights happy/edge/performance/concurrency cases per the doc’s table', () => {
    const score = expectOk(
      computeCodingTestRunnerScore([
        { type: 'HAPPY_PATH', passed: true }, // 0.5
        { type: 'EDGE_CASE', passed: true }, // 1.0
        { type: 'PERFORMANCE', passed: false }, // 1.0, failed
        { type: 'CONCURRENCY', passed: true }, // 1.5
      ]),
    );
    // passed weight 3.0 of total weight 4.0 -> 3/4 * 7 = 5.25
    expect(score).toBeCloseTo(5.25, 2);
  });

  it('gives a brute-force solution zero credit on failed weighted cases', () => {
    const score = expectOk(
      computeCodingTestRunnerScore([
        { type: 'HAPPY_PATH', passed: true },
        { type: 'EDGE_CASE', passed: false },
        { type: 'PERFORMANCE', passed: false },
      ]),
    );
    expect(score).toBeCloseTo((0.5 / 2.5) * 7, 2);
  });

  it('scores an item with no test cases as zero rather than failing', () => {
    expect(expectOk(computeCodingTestRunnerScore([]))).toBe(0);
  });
});

describe('computeCodingItemScore', () => {
  it('sums the 7-mark test runner and 3-mark AI rubric to a 10-mark total', () => {
    expect(computeCodingItemScore(7, 3)).toBe(10);
    expect(computeCodingItemScore(5.25, 2)).toBe(7.25);
  });

  it('clamps out-of-range sub-scores rather than producing an invalid total', () => {
    expect(computeCodingItemScore(9, 5)).toBe(10);
    expect(computeCodingItemScore(-1, -1)).toBe(0);
  });
});

describe('evaluateDebugScenarioGate (dormant Professional gate)', () => {
  it('confirms Professional at or above 21/30', () => {
    const result = expectOk(
      evaluateDebugScenarioGate({ rootCause: 10, fix: 7, tradeoff: 3, monitoring: 2 }),
    );
    expect(result.totalMarks).toBe(22);
    expect(result.outcome).toBe('PROFESSIONAL_CONFIRMED');
  });

  it('routes 15-20 to a follow-up probe', () => {
    const result = expectOk(
      evaluateDebugScenarioGate({ rootCause: 8, fix: 5, tradeoff: 2, monitoring: 1 }),
    );
    expect(result.totalMarks).toBe(16);
    expect(result.outcome).toBe('FOLLOW_UP_PROBE');
  });

  it('falls back to Advanced below 15, without penalising further', () => {
    const result = expectOk(
      evaluateDebugScenarioGate({ rootCause: 4, fix: 3, tradeoff: 1, monitoring: 0 }),
    );
    expect(result.totalMarks).toBe(8);
    expect(result.outcome).toBe('ADVANCED_FALLBACK');
  });

  it('treats the exact boundaries 21 and 15 correctly', () => {
    expect(
      expectOk(evaluateDebugScenarioGate({ rootCause: 9, fix: 9, tradeoff: 3, monitoring: 0 }))
        .outcome,
    ).toBe('PROFESSIONAL_CONFIRMED'); // 21
    expect(
      expectOk(evaluateDebugScenarioGate({ rootCause: 6, fix: 6, tradeoff: 3, monitoring: 0 }))
        .outcome,
    ).toBe('FOLLOW_UP_PROBE'); // 15
  });

  it('rejects an out-of-range total', () => {
    const result = run(
      evaluateDebugScenarioGate({ rootCause: 12, fix: 9, tradeoff: 6, monitoring: 5 }),
    );
    expect(Either.isLeft(result)).toBe(true);
  });
});
