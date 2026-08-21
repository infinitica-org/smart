import { Effect } from 'effect';
import { InvalidWeightsError } from '../errors.js';
import { roundTo, sum } from '../statistics.js';

/**
 * Weighted item and competency scoring.
 *
 *   Level1_Score = SUM(item_correct[i] * competency_weight[i]) / SUM(competency_weight[i])
 *
 * The weight is `real_world_weight` — how much practitioners said the
 * competency actually matters on the job. That weighting is the difference
 * between SMART and a generic percentage-correct test, so it is applied here
 * rather than being left to each caller to remember.
 *
 * Owner: Ramansh.
 */

export interface WeightedItem {
  readonly itemId: string;
  readonly competencyId: string;
  /** Points earned on this item. */
  readonly score: number;
  /** Maximum points available on this item. */
  readonly maxScore: number;
  /** Item weight, typically inherited from its competency's real-world weight. */
  readonly weight: number;
}

export interface CompetencyScore {
  readonly competencyId: string;
  /** Percentage achieved on this competency, 0–100. */
  readonly score: number;
  readonly weight: number;
  readonly itemsAnswered: number;
  /** True when the competency is below the gap threshold and belongs in the report. */
  readonly isGap: boolean;
}

export interface WeightedLevelScore {
  /** Weighted percentage, 0–100. This is the raw score fed to `assignTier`. */
  readonly rawScore: number;
  readonly competencyScores: readonly CompetencyScore[];
  readonly totalWeight: number;
  readonly itemsScored: number;
}

/**
 * A competency at or below this percentage is reported as a gap.
 * Chosen to sit below any realistic Bronze cut so the gap report is actionable
 * rather than flagging everything.
 */
export const GAP_THRESHOLD = 50;

/**
 * Compute a weighted level score with a per-competency breakdown.
 *
 * The breakdown is not optional decoration: it is what powers the student's gap
 * report and the institution's batch weakness report, which are the two things
 * institutions actually renew for.
 */
export function computeWeightedLevelScore(
  items: readonly WeightedItem[],
): Effect.Effect<WeightedLevelScore, InvalidWeightsError> {
  return Effect.gen(function* () {
    if (items.length === 0) {
      return { rawScore: 0, competencyScores: [], totalWeight: 0, itemsScored: 0 };
    }

    const totalWeight = sum(items.map((item) => item.weight));
    if (totalWeight <= 0) {
      return yield* Effect.fail(
        new InvalidWeightsError({
          sum: totalWeight,
          message:
            `Total item weight is ${String(totalWeight)}. Every item needs a positive ` +
            `real_world_weight — an unweighted item cannot contribute to a score. ` +
            `Check the item bank (owner: Vedika G).`,
        }),
      );
    }

    // Group by competency so the breakdown reflects competency mastery rather
    // than raw item counts — a competency with 6 items must not outweigh one
    // with 2 unless its declared weight says so.
    const byCompetency = new Map<string, WeightedItem[]>();
    for (const item of items) {
      const bucket = byCompetency.get(item.competencyId);
      if (bucket) {
        bucket.push(item);
      } else {
        byCompetency.set(item.competencyId, [item]);
      }
    }

    const competencyScores: CompetencyScore[] = [];
    for (const [competencyId, competencyItems] of byCompetency) {
      const earned = sum(competencyItems.map((i) => i.score));
      const available = sum(competencyItems.map((i) => i.maxScore));
      const percentage = available > 0 ? (earned / available) * 100 : 0;
      const weight = sum(competencyItems.map((i) => i.weight));
      competencyScores.push({
        competencyId,
        score: roundTo(percentage, 2),
        weight: roundTo(weight, 4),
        itemsAnswered: competencyItems.length,
        isGap: percentage <= GAP_THRESHOLD,
      });
    }

    const weightedNumerator = sum(
      competencyScores.map((competency) => competency.score * competency.weight),
    );
    const rawScore = roundTo(weightedNumerator / totalWeight, 2);

    return {
      rawScore,
      competencyScores: competencyScores.sort((a, b) => a.score - b.score),
      totalWeight: roundTo(totalWeight, 4),
      itemsScored: items.length,
    };
  });
}

/**
 * L5 capstone split score: 50 % objective checklist, 30 % practitioner rubric,
 * 20 % presentation (ARCHITECTURE.md §6.1).
 *
 * All three inputs are percentages, 0–100.
 */
export function computeCapstoneSplitScore(parts: {
  readonly objectiveChecklist: number;
  readonly practitionerRubric: number;
  readonly presentation: number;
}): number {
  return roundTo(
    parts.objectiveChecklist * 0.5 + parts.practitionerRubric * 0.3 + parts.presentation * 0.2,
    2,
  );
}

/**
 * L4 defense score from per-dimension marks. Weights vary per track — Full Stack
 * is 35/30/35, AI/ML is 35/25/40, and so on — so they are passed in rather than
 * hardcoded.
 */
export function computeDefenseScore(
  dimensions: {
    readonly depthOfUnderstanding: number;
    readonly ownershipAndOriginality: number;
    readonly defenseQuality: number;
  },
  weights: {
    readonly depthOfUnderstanding: number;
    readonly ownershipAndOriginality: number;
    readonly defenseQuality: number;
  },
): Effect.Effect<number, InvalidWeightsError> {
  return Effect.gen(function* () {
    const weightSum =
      weights.depthOfUnderstanding + weights.ownershipAndOriginality + weights.defenseQuality;
    if (Math.abs(weightSum - 1) > 1e-6) {
      return yield* Effect.fail(
        new InvalidWeightsError({
          sum: weightSum,
          message: `L4 rubric dimension weights must sum to 1.0; received ${weightSum.toFixed(4)}.`,
        }),
      );
    }
    return roundTo(
      dimensions.depthOfUnderstanding * weights.depthOfUnderstanding +
        dimensions.ownershipAndOriginality * weights.ownershipAndOriginality +
        dimensions.defenseQuality * weights.defenseQuality,
      2,
    );
  });
}
