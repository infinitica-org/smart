import { Effect } from 'effect';
import { COHENS_KAPPA_FLOOR, RELIABILITY_ALPHA_FLOOR } from '@smart/contracts';
import { InsufficientSampleError } from '../errors.js';
import { roundTo, variance } from '../statistics.js';

/**
 * Reliability and inter-rater agreement.
 *
 * These two numbers are SMART's honesty mechanism in code form:
 *   - Cohen's kappa gates whether automated scoring is allowed to run at all.
 *   - Cronbach's alpha gates what the confidence note is allowed to claim.
 *
 * Owner: Ramansh (kappa, computation) / Vedika G (alpha reporting, publication).
 */

/** Minimum paired ratings before a kappa is meaningful enough to act on. */
export const MIN_KAPPA_SAMPLE = 20;
/** Minimum respondents before an alpha is meaningful enough to publish. */
export const MIN_ALPHA_SAMPLE = 30;

export interface AgreementResult {
  readonly kappa: number;
  readonly observedAgreement: number;
  readonly expectedAgreement: number;
  readonly sampleSize: number;
  readonly interpretation: string;
  /** kappa >= 0.65. When false, automated scoring must pause. */
  readonly meetsThreshold: boolean;
  /**
   * THE CIRCUIT BREAKER. False means the evaluation module must route grading to
   * human raters instead of accepting LLM output. This is a product-integrity
   * requirement, not a dashboard metric (TEAM.md §2.5).
   */
  readonly automatedScoringAllowed: boolean;
}

/**
 * Cohen's kappa between two raters over the same items.
 *
 * Kappa rather than raw percentage agreement because two raters who both award
 * Gold 80 % of the time will agree 80 % of the time by chance alone. Kappa
 * corrects for that, which is the whole point of measuring it.
 */
export function cohensKappa(
  raterA: readonly string[],
  raterB: readonly string[],
): Effect.Effect<AgreementResult, InsufficientSampleError> {
  return Effect.gen(function* () {
    const n = Math.min(raterA.length, raterB.length);

    if (n < MIN_KAPPA_SAMPLE) {
      return yield* Effect.fail(
        new InsufficientSampleError({
          sampleSize: n,
          required: MIN_KAPPA_SAMPLE,
          message:
            `Cohen's kappa needs at least ${String(MIN_KAPPA_SAMPLE)} paired ratings to be ` +
            `actionable; received ${String(n)}. Expand the human-rated hold-out set before ` +
            `enabling or disabling automated scoring on this track.`,
        }),
      );
    }

    const categories = new Set<string>([...raterA.slice(0, n), ...raterB.slice(0, n)]);

    let agreements = 0;
    for (let i = 0; i < n; i += 1) {
      if (raterA[i] === raterB[i]) agreements += 1;
    }
    const observedAgreement = agreements / n;

    let expectedAgreement = 0;
    for (const category of categories) {
      const pA = raterA.slice(0, n).filter((value) => value === category).length / n;
      const pB = raterB.slice(0, n).filter((value) => value === category).length / n;
      expectedAgreement += pA * pB;
    }

    // Perfect expected agreement means every rating was the same category; kappa
    // is undefined there, and reporting 1.0 would be a false confidence signal.
    const kappa =
      expectedAgreement >= 1
        ? 0
        : roundTo((observedAgreement - expectedAgreement) / (1 - expectedAgreement), 4);

    const meetsThreshold = kappa >= COHENS_KAPPA_FLOOR;

    return {
      kappa,
      observedAgreement: roundTo(observedAgreement, 4),
      expectedAgreement: roundTo(expectedAgreement, 4),
      sampleSize: n,
      interpretation: interpretKappa(kappa),
      meetsThreshold,
      automatedScoringAllowed: meetsThreshold,
    };
  });
}

/** Landis & Koch interpretation bands. */
export function interpretKappa(kappa: number): string {
  if (kappa < 0) return 'worse than chance';
  if (kappa < 0.21) return 'slight agreement';
  if (kappa < 0.41) return 'fair agreement';
  if (kappa < 0.61) return 'moderate agreement';
  if (kappa < 0.81) return 'substantial agreement';
  return 'almost perfect agreement';
}

export interface ReliabilityResult {
  readonly coefficient: number;
  readonly kind: 'CRONBACH_ALPHA' | 'KR_20';
  readonly itemCount: number;
  readonly sampleSize: number;
  /** coefficient >= 0.70. When false, the confidence note downgrades itself. */
  readonly meetsAcademicMinimum: boolean;
  readonly interpretation: string;
}

/**
 * Cronbach's alpha over an item-response matrix.
 *
 * @param responses one row per respondent, one column per item (same length).
 *
 * Below 0.70 the track is flagged internally as "not yet stable" and the public
 * confidence note downgrades **automatically** — nobody has to remember to do
 * it, which is the only way that promise survives a busy release week.
 */
export function cronbachAlpha(
  responses: readonly (readonly number[])[],
): Effect.Effect<ReliabilityResult, InsufficientSampleError> {
  return Effect.gen(function* () {
    const sampleSize = responses.length;

    if (sampleSize < MIN_ALPHA_SAMPLE) {
      return yield* Effect.fail(
        new InsufficientSampleError({
          sampleSize,
          required: MIN_ALPHA_SAMPLE,
          message:
            `Cronbach's alpha needs at least ${String(MIN_ALPHA_SAMPLE)} respondents to be ` +
            `publishable; received ${String(sampleSize)}. Report the sample size honestly and ` +
            `keep the confidence note downgraded until the pilot cohort is large enough.`,
        }),
      );
    }

    const itemCount = responses[0]?.length ?? 0;
    if (itemCount < 2) {
      return {
        coefficient: 0,
        kind: 'CRONBACH_ALPHA',
        itemCount,
        sampleSize,
        meetsAcademicMinimum: false,
        interpretation: 'not computable with fewer than 2 items',
      };
    }

    let sumItemVariances = 0;
    for (let itemIndex = 0; itemIndex < itemCount; itemIndex += 1) {
      const column = responses.map((row) => row[itemIndex] ?? 0);
      sumItemVariances += variance(column);
    }

    const totals = responses.map((row) => row.reduce((total, value) => total + value, 0));
    const totalVariance = variance(totals);

    const coefficient =
      totalVariance === 0
        ? 0
        : roundTo((itemCount / (itemCount - 1)) * (1 - sumItemVariances / totalVariance), 4);

    // Alpha is bounded above by 1; negative alpha signals items measuring
    // different constructs rather than a usable low score.
    const bounded = Math.min(coefficient, 1);

    return {
      coefficient: bounded,
      kind: 'CRONBACH_ALPHA',
      itemCount,
      sampleSize,
      meetsAcademicMinimum: bounded >= RELIABILITY_ALPHA_FLOOR,
      interpretation: interpretAlpha(bounded),
    };
  });
}

/**
 * KR-20 — Cronbach's alpha specialised for dichotomous (right/wrong) items,
 * which is what L1 produces.
 */
export function kr20(
  responses: readonly (readonly (0 | 1)[])[],
): Effect.Effect<ReliabilityResult, InsufficientSampleError> {
  return Effect.map(cronbachAlpha(responses), (result) => ({ ...result, kind: 'KR_20' as const }));
}

export function interpretAlpha(alpha: number): string {
  if (alpha < 0.5) return 'unacceptable — track not yet stable';
  if (alpha < 0.6) return 'poor — treat results as provisional';
  if (alpha < 0.7) return 'questionable — below academic minimum';
  if (alpha < 0.8) return 'acceptable';
  if (alpha < 0.9) return 'good';
  return 'excellent';
}
