import { describe, expect, it } from 'vitest';
import { DEFAULT_SIGNAL_WEIGHT_MODEL } from './default-weights.js';
import { computeModelChecksum, verifySignalWeightModel } from './model-integrity.js';

describe('verifySignalWeightModel', () => {
  it('accepts the default practitioner model with valid checksum', () => {
    expect(verifySignalWeightModel(DEFAULT_SIGNAL_WEIGHT_MODEL)).toBe(true);
  });

  it('rejects a tampered checksum', () => {
    expect(
      verifySignalWeightModel({
        ...DEFAULT_SIGNAL_WEIGHT_MODEL,
        modelChecksum: 'a'.repeat(64),
      }),
    ).toBe(false);
  });

  it('produces stable checksums for the same payload', () => {
    const a = computeModelChecksum(DEFAULT_SIGNAL_WEIGHT_MODEL);
    const b = computeModelChecksum(DEFAULT_SIGNAL_WEIGHT_MODEL);
    expect(a).toBe(b);
  });
});
