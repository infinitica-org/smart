import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  assignTier,
  clearsLevel,
  cohensKappa,
  computeCapstoneSplitScore,
  computeDefenseScore,
  computeWeightedLevelScore,
  cronbachAlpha,
  deriveAngoffCutScore,
  deriveCutScore,
  deriveCutScoreSet,
  estimateAbility,
  itemInformation,
  MIN_PANELISTS,
  probabilityCorrect,
  reconcileAnchors,
  resolveTierByMode,
  selectMostInformativeItem,
  standardDeviation,
  type CutScoreSet,
  type WeightedItem,
} from './index.js';

/**
 * Scoring-engine tests.
 *
 * These are not coverage decoration. Each test pins a promise SMART makes to a
 * candidate or an employer, and the comment says which promise. If one of these
 * fails, a certificate is about to become indefensible.
 */

const run = <A, E>(effect: Effect.Effect<A, E>): Either.Either<A, E> =>
  Effect.runSync(Effect.either(effect));

const expectOk = <A, E>(effect: Effect.Effect<A, E>): A => {
  const result = run(effect);
  if (Either.isLeft(result)) {
    throw new Error(`expected success, got failure: ${JSON.stringify(result.left)}`);
  }
  return result.right;
};

const expectFailureTag = <A, E>(effect: Effect.Effect<A, E>): string => {
  const result = run(effect);
  if (Either.isRight(result)) {
    throw new Error(`expected failure, got success: ${JSON.stringify(result.right)}`);
  }
  return (result.left as { _tag: string })._tag;
};

/* -------------------------------------------------------------------------- */
/* Angoff cut scores                                                          */
/* -------------------------------------------------------------------------- */

describe('Angoff cut scores', () => {
  it('derives mu +/- sigma from panelist estimates', () => {
    const cut = expectOk(deriveCutScore('GOLD', [70, 75, 80, 75, 80]));

    expect(cut.mean).toBe(76);
    expect(cut.sd).toBe(4.18);
    expect(cut.lowerBound).toBe(71.82);
    expect(cut.upperBound).toBe(80.18);
    expect(cut.panelistCount).toBe(5);
  });

  it('refuses to derive a cut score from fewer than three practitioners', () => {
    // A threshold that decides employability must never come from two opinions.
    expect(expectFailureTag(deriveCutScore('GOLD', [75, 80]))).toBe('InsufficientPanelError');
    expect(expectFailureTag(deriveCutScore('GOLD', []))).toBe('InsufficientPanelError');
    expect(expectFailureTag(deriveAngoffCutScore('GOLD', []))).toBe('InsufficientPanelError');
    expect(MIN_PANELISTS).toBe(3);
  });

  it('works identically when called via deriveAngoffCutScore alias', () => {
    const cut = expectOk(deriveAngoffCutScore('GOLD', [70, 75, 80, 75, 80]));
    expect(cut.mean).toBe(76);
    expect(cut.sd).toBe(4.18);
  });

  it('uses the sample (n-1) standard deviation so the published band is not narrowed', () => {
    // Population SD of this set is ~4.10; sample SD is ~4.18. Publishing the
    // smaller number would overstate our precision.
    expect(standardDeviation([70, 75, 80, 75, 80])).toBeCloseTo(4.1833, 3);
  });

  it('rejects a non-monotonic Gold/Silver/Bronze set', () => {
    // Silver above Gold makes tier assignment ambiguous for a whole cohort.
    const tag = expectFailureTag(
      deriveCutScoreSet({
        gold: [60, 62, 61],
        silver: [80, 82, 81],
        bronze: [40, 42, 41],
      }),
    );
    expect(tag).toBe('NonMonotonicCutScoresError');
  });

  it('clamps the confidence band to the 0-100 scale', () => {
    const cut = expectOk(deriveCutScore('GOLD', [98, 99, 100, 100, 99]));
    expect(cut.upperBound).toBeLessThanOrEqual(100);
  });
});

/* -------------------------------------------------------------------------- */
/* Tier assignment                                                            */
/* -------------------------------------------------------------------------- */

const cutScores: CutScoreSet = expectOk(
  deriveCutScoreSet({
    gold: [74, 75, 76, 75, 75],
    silver: [59, 60, 61, 60, 60],
    bronze: [44, 45, 46, 45, 45],
  }),
);

describe('tier assignment', () => {
  it('awards each tier at its cut score boundary', () => {
    expect(expectOk(assignTier(90, cutScores)).tier).toBe('GOLD');
    expect(expectOk(assignTier(cutScores.gold.mean, cutScores)).tier).toBe('GOLD');
    expect(expectOk(assignTier(65, cutScores)).tier).toBe('SILVER');
    expect(expectOk(assignTier(50, cutScores)).tier).toBe('BRONZE');
    expect(expectOk(assignTier(20, cutScores)).tier).toBe('BELOW_BRONZE');
  });

  it('discloses a borderline result instead of silently rounding', () => {
    // Sitting inside the Gold band means the evidence does not separate
    // Gold from Silver. The candidate is told, rather than quietly downgraded.
    const assignment = expectOk(assignTier(cutScores.gold.mean - 0.5, cutScores));

    expect(assignment.tier).toBe('SILVER');
    expect(assignment.borderline).toBe(true);
    expect(assignment.borderlineNote).toContain('Borderline');
    expect(assignment.nextTier).toBe('GOLD');
    expect(assignment.pointsToNextTier).toBeCloseTo(0.5, 2);
  });

  it('always publishes the confidence band of the tier awarded', () => {
    const assignment = expectOk(assignTier(80, cutScores));
    expect(assignment.confidenceBand).toMatch(/Gold cut score \d+\.\d{2} ± \d+\.\d{2}/u);
  });

  it('reports points to the next tier so the result is actionable', () => {
    const assignment = expectOk(assignTier(50, cutScores));
    expect(assignment.tier).toBe('BRONZE');
    expect(assignment.nextTier).toBe('SILVER');
    expect(assignment.pointsToNextTier).toBeCloseTo(cutScores.silver.mean - 50, 2);
  });

  it('never awards a tier from an out-of-range score', () => {
    expect(expectFailureTag(assignTier(101, cutScores))).toBe('InvalidScoreError');
    expect(expectFailureTag(assignTier(-1, cutScores))).toBe('InvalidScoreError');
    expect(expectFailureTag(assignTier(Number.NaN, cutScores))).toBe('InvalidScoreError');
  });

  it('unlocks the next level at Bronze and above, and not below', () => {
    expect(clearsLevel('GOLD')).toBe(true);
    expect(clearsLevel('SILVER')).toBe(true);
    expect(clearsLevel('BRONZE')).toBe(true);
    expect(clearsLevel('BELOW_BRONZE')).toBe(false);
  });

  it('is deterministic — the same inputs always produce the same tier', () => {
    // Reproducibility is what makes a challenged certificate defensible.
    const first = expectOk(assignTier(72.345, cutScores));
    const second = expectOk(assignTier(72.345, cutScores));
    expect(first).toStrictEqual(second);
  });
});

/* -------------------------------------------------------------------------- */
/* Weighted scoring                                                           */
/* -------------------------------------------------------------------------- */

describe('weighted level scoring', () => {
  const items: readonly WeightedItem[] = [
    { itemId: 'i1', competencyId: 'c-heavy', score: 1, maxScore: 1, weight: 0.8 },
    { itemId: 'i2', competencyId: 'c-heavy', score: 1, maxScore: 1, weight: 0.8 },
    { itemId: 'i3', competencyId: 'c-light', score: 0, maxScore: 1, weight: 0.2 },
  ];

  it('weights by real-world importance, not by item count', () => {
    // Two correct heavy items and one wrong light item must not be 67%.
    const result = expectOk(computeWeightedLevelScore(items));
    expect(result.rawScore).toBeCloseTo(88.89, 2);
  });

  it('produces a per-competency breakdown that drives the gap report', () => {
    const result = expectOk(computeWeightedLevelScore(items));
    const gaps = result.competencyScores.filter((competency) => competency.isGap);

    expect(result.competencyScores).toHaveLength(2);
    expect(gaps.map((gap) => gap.competencyId)).toStrictEqual(['c-light']);
    // Weakest competency first, so the report leads with what to fix.
    expect(result.competencyScores[0]?.competencyId).toBe('c-light');
  });

  it('rejects an unweighted item bank rather than scoring it as zero', () => {
    const tag = expectFailureTag(
      computeWeightedLevelScore([
        { itemId: 'i1', competencyId: 'c1', score: 1, maxScore: 1, weight: 0 },
      ]),
    );
    expect(tag).toBe('InvalidWeightsError');
  });

  it('returns an empty score for an empty attempt without throwing', () => {
    const result = expectOk(computeWeightedLevelScore([]));
    expect(result).toStrictEqual({
      rawScore: 0,
      competencyScores: [],
      totalWeight: 0,
      itemsScored: 0,
    });
  });

  it('splits the L5 capstone 50/30/20', () => {
    expect(
      computeCapstoneSplitScore({
        objectiveChecklist: 80,
        practitionerRubric: 70,
        presentation: 60,
      }),
    ).toBe(73);
  });

  it('rejects L4 defense weights that do not sum to 1.0', () => {
    const dimensions = {
      depthOfUnderstanding: 80,
      ownershipAndOriginality: 70,
      defenseQuality: 90,
    };

    expect(
      expectOk(
        computeDefenseScore(dimensions, {
          depthOfUnderstanding: 0.35,
          ownershipAndOriginality: 0.3,
          defenseQuality: 0.35,
        }),
      ),
    ).toBeCloseTo(80.5, 2);

    expect(
      expectFailureTag(
        computeDefenseScore(dimensions, {
          depthOfUnderstanding: 0.5,
          ownershipAndOriginality: 0.5,
          defenseQuality: 0.5,
        }),
      ),
    ).toBe('InvalidWeightsError');
  });
});

/* -------------------------------------------------------------------------- */
/* BARS mode consensus                                                        */
/* -------------------------------------------------------------------------- */

describe('BARS mode consensus', () => {
  it('keeps only anchor points a majority of the panel named', () => {
    const consensus = reconcileAnchors([
      { panelistId: 'p1', tier: 'GOLD', anchorPoints: ['explains trade-offs', 'cites metrics'] },
      { panelistId: 'p2', tier: 'GOLD', anchorPoints: ['explains trade-offs', 'names risks'] },
      { panelistId: 'p3', tier: 'GOLD', anchorPoints: ['explains trade-offs', 'cites metrics'] },
    ]);

    expect(consensus?.consensusPoints).toStrictEqual(['cites metrics', 'explains trade-offs']);
    expect(consensus?.minorityPoints).toStrictEqual(['names risks']);
    expect(consensus?.agreementRatio).toBe(1);
  });

  it('does not let one panelist manufacture consensus by repeating a point', () => {
    const consensus = reconcileAnchors([
      {
        panelistId: 'p1',
        tier: 'SILVER',
        anchorPoints: ['works alone', 'works alone', 'works alone'],
      },
      { panelistId: 'p2', tier: 'SILVER', anchorPoints: ['asks for help'] },
      { panelistId: 'p3', tier: 'SILVER', anchorPoints: ['asks for help'] },
    ]);

    expect(consensus?.consensusPoints).toStrictEqual(['asks for help']);
    expect(consensus?.minorityPoints).toStrictEqual(['works alone']);
  });

  it('resolves split rater judgments to the lower tier and flags the tie', () => {
    // Inflating on a coin-flip is the failure mode SMART exists to prevent.
    expect(resolveTierByMode(['GOLD', 'SILVER'])).toStrictEqual({ tier: 'SILVER', tied: true });
    expect(resolveTierByMode(['GOLD', 'GOLD', 'SILVER'])).toStrictEqual({
      tier: 'GOLD',
      tied: false,
    });
    expect(resolveTierByMode([])).toStrictEqual({ tier: null, tied: false });
  });
});

/* -------------------------------------------------------------------------- */
/* Reliability gates                                                          */
/* -------------------------------------------------------------------------- */

describe("Cohen's kappa circuit breaker", () => {
  const tiers = ['GOLD', 'SILVER', 'BRONZE'] as const;
  const pattern = (offset: number, length: number): string[] =>
    Array.from({ length }, (_, index) => tiers[(index + offset) % 3] ?? 'BRONZE');

  it('allows automated scoring only at kappa >= 0.65', () => {
    const agreed = pattern(0, 30);
    const result = expectOk(cohensKappa(agreed, agreed));

    expect(result.kappa).toBe(1);
    expect(result.automatedScoringAllowed).toBe(true);
    expect(result.interpretation).toBe('almost perfect agreement');
  });

  it('halts automated scoring when raters disagree', () => {
    // Systematic disagreement: rater B is always one tier off.
    const result = expectOk(cohensKappa(pattern(0, 30), pattern(1, 30)));

    expect(result.kappa).toBeLessThan(0.65);
    expect(result.automatedScoringAllowed).toBe(false);
  });

  it('corrects for chance agreement rather than reporting raw hit rate', () => {
    // Both raters award GOLD almost always, so high raw agreement is meaningless.
    const raterA = Array.from({ length: 30 }, (_, i) => (i === 0 ? 'SILVER' : 'GOLD'));
    const raterB = Array.from({ length: 30 }, (_, i) => (i === 1 ? 'SILVER' : 'GOLD'));
    const result = expectOk(cohensKappa(raterA, raterB));

    expect(result.observedAgreement).toBeGreaterThan(0.9);
    expect(result.kappa).toBeLessThan(0.5);
  });

  it('refuses to judge agreement from too small a sample', () => {
    expect(expectFailureTag(cohensKappa(['GOLD'], ['GOLD']))).toBe('InsufficientSampleError');
  });

  it('does not report perfect agreement when every rating is identical', () => {
    // Expected agreement is 1 here; kappa is undefined, so claiming 1.0 would be
    // a false confidence signal.
    const constant = Array.from({ length: 30 }, () => 'GOLD');
    expect(expectOk(cohensKappa(constant, constant)).kappa).toBe(0);
  });
});

describe("Cronbach's alpha", () => {
  it('reports a high coefficient for internally consistent responses', () => {
    // Monotone ability pattern: consistent items.
    const responses = Array.from({ length: 40 }, (_, respondent) =>
      Array.from({ length: 10 }, (_, item) => (respondent % 10 >= item ? 1 : 0)),
    );
    const result = expectOk(cronbachAlpha(responses));

    expect(result.coefficient).toBeGreaterThan(0.7);
    expect(result.meetsAcademicMinimum).toBe(true);
    expect(result.coefficient).toBeLessThanOrEqual(1);
  });

  it('downgrades the confidence claim below the 0.70 academic floor', () => {
    const responses = Array.from({ length: 40 }, (_, respondent) =>
      Array.from({ length: 6 }, (_, item) => ((respondent + item) % 2 === 0 ? 1 : 0)),
    );
    const result = expectOk(cronbachAlpha(responses));

    expect(result.meetsAcademicMinimum).toBe(false);
    expect(result.interpretation).toMatch(/unacceptable|poor|questionable/u);
  });

  it('refuses to publish an alpha from too few respondents', () => {
    const responses = Array.from({ length: 5 }, () => [1, 0, 1]);
    expect(expectFailureTag(cronbachAlpha(responses))).toBe('InsufficientSampleError');
  });
});

/* -------------------------------------------------------------------------- */
/* IRT (Phase 2)                                                              */
/* -------------------------------------------------------------------------- */

describe('IRT 2PL (Phase 2, not wired into v1 scoring)', () => {
  const item = { itemId: 'i1', discrimination: 1.2, difficulty: 0 };

  it('gives a 50% chance of success when ability equals difficulty', () => {
    expect(probabilityCorrect(0, item)).toBeCloseTo(0.5, 6);
  });

  it('peaks item information at the item difficulty', () => {
    expect(itemInformation(0, item)).toBeGreaterThan(itemInformation(2, item));
    expect(itemInformation(0, item)).toBeGreaterThan(itemInformation(-2, item));
  });

  it('estimates a higher ability for a stronger response pattern', () => {
    const items = [
      { itemId: 'a', discrimination: 1, difficulty: -1 },
      { itemId: 'b', discrimination: 1, difficulty: 0 },
      { itemId: 'c', discrimination: 1, difficulty: 1 },
      { itemId: 'd', discrimination: 1, difficulty: 2 },
    ];
    const weak = estimateAbility([
      { item: items[0] as never, correct: true },
      { item: items[1] as never, correct: false },
      { item: items[2] as never, correct: false },
      { item: items[3] as never, correct: false },
    ]);
    const strong = estimateAbility([
      { item: items[0] as never, correct: true },
      { item: items[1] as never, correct: true },
      { item: items[2] as never, correct: true },
      { item: items[3] as never, correct: false },
    ]);

    expect(weak).not.toBeNull();
    expect(strong).not.toBeNull();
    expect(strong ?? 0).toBeGreaterThan(weak ?? 0);
  });

  it('returns null rather than inventing a theta for an all-correct pattern', () => {
    expect(estimateAbility([{ item, correct: true }])).toBeNull();
    expect(estimateAbility([])).toBeNull();
  });

  it('selects the unadministered item closest to current ability', () => {
    const pool = [
      { itemId: 'easy', discrimination: 1, difficulty: -1 },
      { itemId: 'matched', discrimination: 1, difficulty: 0.5 },
      { itemId: 'hard', discrimination: 1, difficulty: 3 },
    ];
    expect(selectMostInformativeItem(0.5, pool, new Set())?.itemId).toBe('matched');
    // With the matched item spent, the next-closest difficulty wins.
    expect(selectMostInformativeItem(0.5, pool, new Set(['matched']))?.itemId).toBe('easy');
    expect(selectMostInformativeItem(0.5, pool, new Set(['easy', 'matched', 'hard']))).toBeNull();
  });
});
