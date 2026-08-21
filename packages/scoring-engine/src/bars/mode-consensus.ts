import type { CertifiableTier } from '@smart/contracts';
import { modes } from '../statistics.js';

/**
 * BARS mode-consensus reconciliation.
 *
 * A calibration panel independently writes what a Gold-, Silver- and
 * Bronze-level response contains. Those are reconciled into a rubric by taking
 * the **mode** — the most commonly agreed anchor points — not the average.
 *
 * This matters: averaging behavioural descriptions produces a vague composite
 * that no rater can apply consistently, which is precisely how inter-rater
 * agreement collapses. Mode consensus keeps the anchor concrete.
 *
 * Owner: Ramansh.
 */

export interface PanelistAnchorRating {
  readonly panelistId: string;
  readonly tier: CertifiableTier;
  /** Discrete behavioural points this panelist expects at this tier. */
  readonly anchorPoints: readonly string[];
}

export interface ConsensusAnchor {
  readonly tier: CertifiableTier;
  /** Points named by at least `agreementThreshold` of the panel. */
  readonly consensusPoints: readonly string[];
  /** Points named by only one or two panelists — kept for review, not for grading. */
  readonly minorityPoints: readonly string[];
  readonly panelistCount: number;
  /** Share of the panel that agreed on the median consensus point. */
  readonly agreementRatio: number;
}

/**
 * Reconcile panelist anchor sets for one tier into a gradeable rubric.
 *
 * @param ratings          one entry per panelist for a single tier
 * @param agreementThreshold minimum share of the panel that must name a point
 *                           for it to become part of the grading rubric
 */
export function reconcileAnchors(
  ratings: readonly PanelistAnchorRating[],
  agreementThreshold = 0.5,
): ConsensusAnchor | null {
  if (ratings.length === 0) return null;

  const tier = ratings[0]?.tier;
  if (!tier) return null;

  const counts = new Map<string, number>();
  for (const rating of ratings) {
    // De-duplicate within a panelist so one person repeating a point cannot
    // manufacture consensus on their own.
    for (const point of new Set(rating.anchorPoints)) {
      const normalised = point.trim();
      if (normalised.length === 0) continue;
      counts.set(normalised, (counts.get(normalised) ?? 0) + 1);
    }
  }

  const required = Math.ceil(ratings.length * agreementThreshold);
  const consensusPoints: string[] = [];
  const minorityPoints: string[] = [];

  for (const [point, count] of counts) {
    if (count >= required) {
      consensusPoints.push(point);
    } else {
      minorityPoints.push(point);
    }
  }

  const maxCount = counts.size > 0 ? Math.max(...counts.values()) : 0;

  return {
    tier,
    consensusPoints: consensusPoints.sort(),
    minorityPoints: minorityPoints.sort(),
    panelistCount: ratings.length,
    agreementRatio: ratings.length > 0 ? maxCount / ratings.length : 0,
  };
}

/**
 * Resolve a set of independent tier judgments into one tier by mode.
 *
 * Used when several raters (or several LLM samples) grade the same response. On
 * a tie the **lower** tier wins: when the evidence is genuinely split between
 * Gold and Silver, awarding Silver and disclosing the borderline is the honest
 * outcome. Inflating on a coin-flip is the failure mode SMART exists to avoid.
 */
export function resolveTierByMode(judgments: readonly CertifiableTier[]): {
  readonly tier: CertifiableTier | null;
  readonly tied: boolean;
} {
  if (judgments.length === 0) return { tier: null, tied: false };

  const winners = modes(judgments);
  if (winners.length === 1) {
    return { tier: winners[0] ?? null, tied: false };
  }

  const rank: Record<CertifiableTier, number> = { BRONZE: 1, SILVER: 2, GOLD: 3 };
  const lowest = [...winners].sort((a, b) => rank[a] - rank[b])[0] ?? null;
  return { tier: lowest, tied: true };
}
