import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import { computeSdeV4FormScore, scoreClosedChoice, sdeV4Passed } from './sde-v4-scoring.js';

const runOk = <A, E>(effect: Effect.Effect<A, E>): A => {
  const result = Effect.runSync(Effect.either(effect));
  if (Either.isLeft(result)) throw new Error(JSON.stringify(result.left));
  return result.right;
};

describe('sde v4 scoring', () => {
  it('scores closed choices case-insensitively', () => {
    expect(scoreClosedChoice('a', 'A')).toBe(1);
    expect(scoreClosedChoice('B', 'A')).toBe(0);
    expect(scoreClosedChoice(null, 'A')).toBe(0);
  });

  it('passes beginner at 80 percent', () => {
    expect(sdeV4Passed(80, 'BEGINNER')).toBe(true);
    expect(sdeV4Passed(79.99, 'BEGINNER')).toBe(false);
    expect(sdeV4Passed(75, 'INTERMEDIATE')).toBe(true);
    expect(sdeV4Passed(80, 'PROFESSIONAL')).toBe(true);
  });

  it('computes a beginner form pass from mixed marks', () => {
    const result = runOk(
      computeSdeV4FormScore(
        [
          { itemId: '1', marksEarned: 11, marksMax: 11 },
          { itemId: 'open', marksEarned: 6, marksMax: 10 },
        ],
        'BEGINNER',
      ),
    );
    expect(result.scorePercent).toBeCloseTo((17 / 21) * 100, 2);
    expect(result.passed).toBe(result.scorePercent >= 80);
  });
});
