import { Effect } from 'effect';
import type { Tier } from '@smart/contracts';
import { InvalidScoreError } from '../errors.js';
import { formatConfidenceBand, isWithinConfidenceBand, type CutScoreSet } from './cut-scores.js';
import { roundTo } from '../statistics.js';

/**
 * Tier assignment — the single place in the entire platform where a raw score
 * becomes a Gold / Silver / Bronze tier.
 *
 * Nothing else may do this. `evaluation` produces raw scores, `calibration`
 * publishes cut scores, and this function is the only bridge. That is what makes
 * every tier traceable back to a named panel of practitioners instead of to a
 * constant somebody typed into a service.
 *
 * Owner: Ramansh.
 */

export interface TierAssignment {
  readonly tier: Tier;
  readonly rawScore: number;
  /** Human-readable band for the tier actually awarded. */
  readonly confidenceBand: string;
  /**
   * True when the score falls inside the cut-score uncertainty band, i.e. the
   * evidence does not cleanly separate this candidate from the tier above.
   */
  readonly borderline: boolean;
  /** Candidate-facing borderline disclosure, or null when unambiguous. */
  readonly borderlineNote: string | null;
  /** Points short of the next tier up, or null when already Gold. */
  readonly pointsToNextTier: number | null;
  readonly nextTier: Tier | null;
}

/**
 * Assign a tier by comparing a raw score against published cut scores.
 *
 * Below the Bronze cut is `BELOW_BRONZE`, which is deliberately not a "fail":
 * it is tracked internally and produces a private gap report. It never appears
 * as a public tier.
 */
export function assignTier(
  rawScore: number,
  cutScores: CutScoreSet,
): Effect.Effect<TierAssignment, InvalidScoreError> {
  return Effect.gen(function* () {
    if (!Number.isFinite(rawScore) || rawScore < 0 || rawScore > 100) {
      return yield* Effect.fail(
        new InvalidScoreError({
          value: rawScore,
          message: `Raw score must be a finite number in [0, 100]; received ${String(rawScore)}.`,
        }),
      );
    }

    const score = roundTo(rawScore, 2);

    if (score >= cutScores.gold.mean) {
      return {
        tier: 'GOLD' as const,
        rawScore: score,
        confidenceBand: formatConfidenceBand(cutScores.gold),
        borderline: isWithinConfidenceBand(score, cutScores.gold),
        borderlineNote: isWithinConfidenceBand(score, cutScores.gold)
          ? borderlineNoteFor('GOLD', 'SILVER', score, cutScores.gold.mean, cutScores.gold.sd)
          : null,
        pointsToNextTier: null,
        nextTier: null,
      };
    }

    if (score >= cutScores.silver.mean) {
      const borderline =
        isWithinConfidenceBand(score, cutScores.silver) ||
        isWithinConfidenceBand(score, cutScores.gold);
      return {
        tier: 'SILVER' as const,
        rawScore: score,
        confidenceBand: formatConfidenceBand(cutScores.silver),
        borderline,
        borderlineNote: borderline
          ? borderlineNoteFor('SILVER', 'GOLD', score, cutScores.gold.mean, cutScores.gold.sd)
          : null,
        pointsToNextTier: roundTo(cutScores.gold.mean - score, 2),
        nextTier: 'GOLD' as const,
      };
    }

    if (score >= cutScores.bronze.mean) {
      const borderline =
        isWithinConfidenceBand(score, cutScores.bronze) ||
        isWithinConfidenceBand(score, cutScores.silver);
      return {
        tier: 'BRONZE' as const,
        rawScore: score,
        confidenceBand: formatConfidenceBand(cutScores.bronze),
        borderline,
        borderlineNote: borderline
          ? borderlineNoteFor('BRONZE', 'SILVER', score, cutScores.silver.mean, cutScores.silver.sd)
          : null,
        pointsToNextTier: roundTo(cutScores.silver.mean - score, 2),
        nextTier: 'SILVER' as const,
      };
    }

    return {
      tier: 'BELOW_BRONZE' as const,
      rawScore: score,
      confidenceBand: formatConfidenceBand(cutScores.bronze),
      borderline: isWithinConfidenceBand(score, cutScores.bronze),
      borderlineNote: null,
      pointsToNextTier: roundTo(cutScores.bronze.mean - score, 2),
      nextTier: 'BRONZE' as const,
    };
  });
}

function borderlineNoteFor(
  awarded: Tier,
  adjacent: Tier,
  score: number,
  cutMean: number,
  cutSd: number,
): string {
  return (
    `Borderline ${titleCase(awarded)}/${titleCase(adjacent)} — scored ${score.toFixed(2)} against a ` +
    `cut score of ${cutMean.toFixed(2)} ± ${cutSd.toFixed(2)}. The cut-score confidence band ` +
    `overlaps this result, so the two tiers are not cleanly separated by the available evidence.`
  );
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ');
}

/** A level unlocks the next one only at Bronze or above. */
export function clearsLevel(tier: Tier): boolean {
  return tier === 'BRONZE' || tier === 'SILVER' || tier === 'GOLD';
}
