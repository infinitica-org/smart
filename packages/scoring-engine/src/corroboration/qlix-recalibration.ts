import type { SignalWeightModel } from '@smart/contracts';
import { computeModelChecksum } from './model-integrity.js';
import { auc, pointBiserial } from './statistics.js';

/** Playbook / OQ-5: minimum cohort before automated weight updates. */
export const RECALIBRATION_MIN_SAMPLE = 100;

/** EWMA retain factor: new_weight = retain × old + (1 - retain) × derived. */
export const RECALIBRATION_EWMA_RETAIN = 0.9;

export const POSITIVE_PLACEMENT_OUTCOMES = new Set(['ACCEPTED', 'OFFERED']);

const PROFICIENCY_SCORE: Record<string, number> = {
  BEGINNER: 0.25,
  INTERMEDIATE: 0.5,
  ADVANCED: 0.75,
  PROFESSIONAL: 1,
};

export type QlixPredictorKey =
  'proficiencyCeilingScore' | 'qualityScore' | 'authenticityScore' | 'relevanceScore';

export type QlixRecalibrationSample = {
  trackCode: string;
  positiveOutcome: boolean;
  proficiencyCeilingScore: number | null;
  qualityScore: number | null;
  authenticityScore: number | null;
  relevanceScore: number | null;
};

export type QlixRecalibrationReport = {
  sampleSize: number;
  predictor: QlixPredictorKey;
  correlation: number | null;
  auc: number | null;
  previousWeight: number;
  nextWeight: number;
  published: boolean;
  reason: string;
  trackBreakdown: ReadonlyArray<{
    trackCode: string;
    sampleSize: number;
    correlation: number | null;
  }>;
};

export function isPositivePlacementOutcome(outcome: string): boolean {
  return POSITIVE_PLACEMENT_OUTCOMES.has(outcome);
}

export function proficiencyCeilingToScore(ceiling: string | null | undefined): number | null {
  if (!ceiling) return null;
  const normalized = ceiling.toUpperCase();
  return PROFICIENCY_SCORE[normalized] ?? null;
}

/** Normalize a 0–100 score to [0, 1]. Values already in [0, 1] pass through. */
export function normalizeUnitScore(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  if (value <= 1) return Math.min(1, Math.max(0, value));
  return Math.min(1, Math.max(0, value / 100));
}

export function correlationToWeightComponent(correlation: number): number {
  return Math.min(1, Math.max(0, 0.5 + correlation / 2));
}

export function deriveUpdatedWeight(
  currentWeight: number,
  correlation: number | null,
  sampleSize: number,
  minSample = RECALIBRATION_MIN_SAMPLE,
): { weight: number; updated: boolean } {
  if (correlation == null || sampleSize < minSample) {
    return { weight: currentWeight, updated: false };
  }
  const derived = correlationToWeightComponent(correlation);
  const weight =
    RECALIBRATION_EWMA_RETAIN * currentWeight + (1 - RECALIBRATION_EWMA_RETAIN) * derived;
  return { weight: Math.min(1, Math.max(0.1, weight)), updated: true };
}

function predictorValues(
  samples: readonly QlixRecalibrationSample[],
  key: QlixPredictorKey,
): { outcomes: boolean[]; values: number[] } {
  const outcomes: boolean[] = [];
  const values: number[] = [];
  for (const sample of samples) {
    const value = sample[key];
    if (value == null) continue;
    outcomes.push(sample.positiveOutcome);
    values.push(value);
  }
  return { outcomes, values };
}

export function evaluatePredictor(
  samples: readonly QlixRecalibrationSample[],
  key: QlixPredictorKey,
): { correlation: number | null; auc: number | null; sampleSize: number } {
  const { outcomes, values } = predictorValues(samples, key);
  if (outcomes.length < 2) {
    return { correlation: null, auc: null, sampleSize: outcomes.length };
  }
  return {
    correlation: pointBiserial(outcomes, values),
    auc: auc(outcomes, values),
    sampleSize: outcomes.length,
  };
}

/** Primary predictor is proficiency ceiling; fall back to strongest |r| when ceiling is sparse. */
export function selectPrimaryPredictor(
  samples: readonly QlixRecalibrationSample[],
  minSample: number,
): { key: QlixPredictorKey; correlation: number | null; auc: number | null; sampleSize: number } {
  const ceiling = evaluatePredictor(samples, 'proficiencyCeilingScore');
  if (ceiling.sampleSize >= minSample && ceiling.correlation != null) {
    return { key: 'proficiencyCeilingScore', ...ceiling };
  }

  const predictors: QlixPredictorKey[] = [
    'qualityScore',
    'authenticityScore',
    'relevanceScore',
    'proficiencyCeilingScore',
  ];
  let best: {
    key: QlixPredictorKey;
    correlation: number | null;
    auc: number | null;
    sampleSize: number;
  } = { key: 'proficiencyCeilingScore', correlation: null, auc: null, sampleSize: 0 };

  for (const key of predictors) {
    const stats = evaluatePredictor(samples, key);
    if (stats.sampleSize < minSample || stats.correlation == null) continue;
    if (best.correlation == null || Math.abs(stats.correlation) > Math.abs(best.correlation)) {
      best = { key, ...stats };
    }
  }
  return best;
}

export function buildTrackBreakdown(
  samples: readonly QlixRecalibrationSample[],
): QlixRecalibrationReport['trackBreakdown'] {
  const byTrack = new Map<string, QlixRecalibrationSample[]>();
  for (const sample of samples) {
    const rows = byTrack.get(sample.trackCode) ?? [];
    rows.push(sample);
    byTrack.set(sample.trackCode, rows);
  }
  return [...byTrack.entries()]
    .map(([trackCode, rows]) => {
      const stats = evaluatePredictor(rows, 'proficiencyCeilingScore');
      return { trackCode, sampleSize: stats.sampleSize, correlation: stats.correlation };
    })
    .sort((a, b) => a.trackCode.localeCompare(b.trackCode));
}

export function buildRecalibratedWeightModel(
  current: SignalWeightModel,
  samples: readonly QlixRecalibrationSample[],
  options?: { minSample?: number; trainedAt?: string },
): { model: SignalWeightModel; report: QlixRecalibrationReport } {
  const minSample = options?.minSample ?? RECALIBRATION_MIN_SAMPLE;
  const previousWeight = current.weightsBySourceAndDimension.QLIX?.default ?? 0.85;
  const primary = selectPrimaryPredictor(samples, minSample);
  const { weight, updated } = deriveUpdatedWeight(
    previousWeight,
    primary.correlation,
    primary.sampleSize,
    minSample,
  );

  const trackBreakdown = buildTrackBreakdown(samples);
  const reason = updated
    ? `Published QLIX.default from ${primary.key} (n=${primary.sampleSize}, r=${primary.correlation?.toFixed(3) ?? 'null'}).`
    : primary.sampleSize < minSample
      ? `Frozen: need ${minSample} QLIX-linked outcomes (have ${primary.sampleSize}).`
      : 'Frozen: correlation undefined for eligible predictor.';

  if (!updated) {
    return {
      model: current,
      report: {
        sampleSize: primary.sampleSize,
        predictor: primary.key,
        correlation: primary.correlation,
        auc: primary.auc,
        previousWeight,
        nextWeight: previousWeight,
        published: false,
        reason,
        trackBreakdown,
      },
    };
  }

  const weightsBySourceAndDimension = {
    ...current.weightsBySourceAndDimension,
    QLIX: {
      ...current.weightsBySourceAndDimension.QLIX,
      default: weight,
      [primary.key]: weight,
    },
  };
  const base = {
    modelVersion: 'qlix-trained-v1',
    trainedAt: options?.trainedAt ?? new Date().toISOString(),
    cohortSize: primary.sampleSize,
    weightsBySourceAndDimension,
  };
  const model: SignalWeightModel = {
    ...base,
    modelChecksum: computeModelChecksum(base),
  };

  return {
    model,
    report: {
      sampleSize: primary.sampleSize,
      predictor: primary.key,
      correlation: primary.correlation,
      auc: primary.auc,
      previousWeight,
      nextWeight: weight,
      published: true,
      reason,
      trackBreakdown,
    },
  };
}
