import { createHash } from 'node:crypto';
import type { SignalWeightModel } from '@smart/contracts';

type ChecksumInput = Pick<SignalWeightModel, 'modelVersion' | 'weightsBySourceAndDimension'>;

/** Deterministic checksum for weight-model tamper detection. */
export function computeModelChecksum(model: ChecksumInput): string {
  const payload = JSON.stringify({
    modelVersion: model.modelVersion,
    weightsBySourceAndDimension: model.weightsBySourceAndDimension,
  });
  return createHash('sha256').update(payload).digest('hex');
}

/** Returns false when a checksum is present but does not match the weights payload. */
export function verifySignalWeightModel(model: SignalWeightModel): boolean {
  if (!model.modelChecksum) {
    return model.modelVersion === 'practitioner-v1' && model.cohortSize === 0;
  }
  return computeModelChecksum(model) === model.modelChecksum;
}
