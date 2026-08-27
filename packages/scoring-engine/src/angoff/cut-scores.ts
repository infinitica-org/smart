import { Effect } from 'effect';
import type { CertifiableTier } from '@smart/contracts';
import { InsufficientPanelError, NonMonotonicCutScoresError } from '../errors.js';
import { mean, roundTo, standardDeviation } from '../statistics.js';

/**
 * Angoff standard-setting.
 *
 * A panel of 3–5 practising practitioners each answers, per tier: "what
 * percentage of this test would a borderline-but-acceptable candidate at this
 * tier get right?" The mean of those estimates is the cut score; the standard
 * deviation is published as the visible **confidence band**.
 *
 *     Cut_tier = mu_panel  +/-  sigma_panel
 *
 * That sigma is not a footnote — it is the mechanism by which SMART is honest
 * about its own precision, and it is why a candidate can be told "borderline
 * Gold/Silver" instead of being silently rounded one way or the other.
 *
 * Owner: Ramansh. Cut-score *authority* (which values get published) belongs to
 * Vedika G's calibration module.
 */

/** Product rule: a defensible panel needs at least 3 practitioners. */
export const MIN_PANELISTS = 3;
export const RECOMMENDED_PANELISTS = 5;

export interface CutScore {
  readonly tier: CertifiableTier;
  /** mu — mean panelist estimate. */
  readonly mean: number;
  /** sigma — sample standard deviation; the published confidence band. */
  readonly sd: number;
  readonly panelistCount: number;
  /** Inclusive lower edge of the uncertainty band. */
  readonly lowerBound: number;
  /** Inclusive upper edge of the uncertainty band. */
  readonly upperBound: number;
}

export interface CutScoreSet {
  readonly gold: CutScore;
  readonly silver: CutScore;
  readonly bronze: CutScore;
}

/**
 * Derive one tier's cut score from raw panelist estimates.
 *
 * Fails with `InsufficientPanelError` rather than returning a number, because a
 * cut score derived from two people's opinions must never quietly become the
 * threshold that decides someone's employability.
 */
export function deriveCutScore(
  tier: CertifiableTier,
  panelistEstimates: readonly number[],
): Effect.Effect<CutScore, InsufficientPanelError> {
  return Effect.gen(function* () {
    if (panelistEstimates.length < MIN_PANELISTS) {
      return yield* Effect.fail(
        new InsufficientPanelError({
          panelistCount: panelistEstimates.length,
          required: MIN_PANELISTS,
          message:
            `Cannot derive a ${tier} cut score from ${panelistEstimates.length} panelist estimate(s). ` +
            `SMART requires at least ${MIN_PANELISTS} practitioners (recommended ${RECOMMENDED_PANELISTS}).`,
        }),
      );
    }

    const mu = roundTo(mean(panelistEstimates), 2);
    const sigma = roundTo(standardDeviation(panelistEstimates), 2);

    return {
      tier,
      mean: mu,
      sd: sigma,
      panelistCount: panelistEstimates.length,
      lowerBound: roundTo(Math.max(0, mu - sigma), 2),
      upperBound: roundTo(Math.min(100, mu + sigma), 2),
    };
  });
}

/** Canonical alias for deriveCutScore matching ticket specification. */
export const deriveAngoffCutScore = deriveCutScore;

/**
 * Derive and validate a full Gold/Silver/Bronze set.
 *
 * Monotonicity is enforced: Gold > Silver > Bronze. A non-monotonic set would
 * make tier assignment ambiguous (a score could satisfy Gold but not Silver),
 * so it fails loudly at derivation time rather than producing nonsense grades
 * for a whole cohort.
 */
export function deriveCutScoreSet(estimates: {
  readonly gold: readonly number[];
  readonly silver: readonly number[];
  readonly bronze: readonly number[];
}): Effect.Effect<CutScoreSet, InsufficientPanelError | NonMonotonicCutScoresError> {
  return Effect.gen(function* () {
    const gold = yield* deriveCutScore('GOLD', estimates.gold);
    const silver = yield* deriveCutScore('SILVER', estimates.silver);
    const bronze = yield* deriveCutScore('BRONZE', estimates.bronze);

    if (!(gold.mean > silver.mean && silver.mean > bronze.mean)) {
      return yield* Effect.fail(
        new NonMonotonicCutScoresError({
          gold: gold.mean,
          silver: silver.mean,
          bronze: bronze.mean,
          message:
            `Cut scores must be strictly decreasing (Gold > Silver > Bronze) but got ` +
            `Gold ${gold.mean}, Silver ${silver.mean}, Bronze ${bronze.mean}. ` +
            `Re-run the calibration panel — this set cannot assign an unambiguous tier.`,
        }),
      );
    }

    return { gold, silver, bronze };
  });
}

/** True when a score sits inside a cut score's uncertainty band. */
export function isWithinConfidenceBand(score: number, cut: CutScore): boolean {
  return score >= cut.lowerBound && score <= cut.upperBound;
}

/**
 * Human-readable confidence band for a certificate or results page.
 * e.g. `"Gold cut score 75.00 ± 4.20 (5 practitioners)"`
 */
export function formatConfidenceBand(cut: CutScore): string {
  return (
    `${titleCase(cut.tier)} cut score ${cut.mean.toFixed(2)} ± ${cut.sd.toFixed(2)} ` +
    `(${String(cut.panelistCount)} practitioner${cut.panelistCount === 1 ? '' : 's'})`
  );
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
