import type { SignalSourceId, SignalWeightModel } from '@smart/contracts';
import { computeModelChecksum } from './model-integrity.js';

/**
 * Frozen v1 signal weights until offline learning publishes a trained model.
 *
 * Owner: Ramansh.
 */

const PRACTITIONER_WEIGHTS = {
  GITHUB: { default: 1 },
  HACKERRANK: { default: 0.8 },
  LEETCODE: { default: 0.8 },
  RESUME: { default: 0.5 },
  MANUAL: { default: 0.4 },
} satisfies Record<SignalSourceId, Record<string, number>>;

const PRACTITIONER_BASE = {
  modelVersion: 'practitioner-v1',
  trainedAt: null,
  cohortSize: 0,
  weightsBySourceAndDimension: PRACTITIONER_WEIGHTS,
} as const;

export const DEFAULT_SIGNAL_WEIGHT_MODEL: SignalWeightModel = {
  ...PRACTITIONER_BASE,
  modelChecksum: computeModelChecksum(PRACTITIONER_BASE),
};

/** Resolve weight for a source×dimension pair; falls back to source default then 1. */
export function resolveSignalWeight(
  model: SignalWeightModel,
  sourceId: SignalSourceId,
  dimensionKey: string,
): number {
  const bySource = model.weightsBySourceAndDimension[sourceId];
  if (!bySource) return 1;
  return bySource[dimensionKey] ?? bySource.default ?? 1;
}
