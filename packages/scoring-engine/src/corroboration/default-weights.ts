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
  LINKEDIN: { default: 0.6 },
  CREDLY: { default: 0.7 },
  RESUME: { default: 0.5 },
  MANUAL: { default: 0.4 },
  // Credential evidence is supporting-only (playbook §5.5): kept below every
  // platform-observed source until issuer APIs replace OCR/stub verification.
  EXTERNALCERT: { default: 0.5 },
  PROFESSIONALCREDENTIAL: { default: 0.55 },
  /** Frozen v1 placeholder until ORION recalibration publishes a trained weight. */
  QLIX: { default: 0.85 },
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
