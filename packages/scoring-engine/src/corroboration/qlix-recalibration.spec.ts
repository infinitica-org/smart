import { describe, expect, it } from 'vitest';
import { DEFAULT_SIGNAL_WEIGHT_MODEL } from './default-weights.js';
import {
  RECALIBRATION_MIN_SAMPLE,
  buildRecalibratedWeightModel,
  deriveUpdatedWeight,
  isPositivePlacementOutcome,
  normalizeUnitScore,
  proficiencyCeilingToScore,
  type QlixRecalibrationSample,
} from './qlix-recalibration.js';

function sample(overrides: Partial<QlixRecalibrationSample> = {}): QlixRecalibrationSample {
  return {
    trackCode: 'TECH_FULLSTACK',
    positiveOutcome: true,
    proficiencyCeilingScore: 0.75,
    qualityScore: 0.8,
    authenticityScore: 0.7,
    relevanceScore: 0.65,
    ...overrides,
  };
}

function cohort(size: number, positiveRate: number): QlixRecalibrationSample[] {
  return Array.from({ length: size }, (_, index) =>
    sample({
      positiveOutcome: index / size < positiveRate,
      proficiencyCeilingScore: index / size < positiveRate ? 0.85 : 0.35,
      qualityScore: index / size < positiveRate ? 0.82 : 0.4,
    }),
  );
}

describe('qlix-recalibration', () => {
  it('maps positive placement outcomes', () => {
    expect(isPositivePlacementOutcome('ACCEPTED')).toBe(true);
    expect(isPositivePlacementOutcome('OFFERED')).toBe(true);
    expect(isPositivePlacementOutcome('INTERVIEWED')).toBe(false);
  });

  it('normalizes proficiency ceiling and unit scores', () => {
    expect(proficiencyCeilingToScore('PROFICIENT')).toBe(0.625);
    expect(proficiencyCeilingToScore('ADVANCED')).toBe(0.75);
    expect(normalizeUnitScore(82)).toBeCloseTo(0.82);
    expect(normalizeUnitScore(0.66)).toBe(0.66);
  });

  it('freezes weight updates below minimum sample size', () => {
    const { model, report } = buildRecalibratedWeightModel(
      DEFAULT_SIGNAL_WEIGHT_MODEL,
      cohort(40, 0.6),
    );
    expect(report.published).toBe(false);
    expect(model.modelVersion).toBe('practitioner-v1');
    expect(report.reason).toContain(String(RECALIBRATION_MIN_SAMPLE));
  });

  it('publishes EWMA-adjusted QLIX.default when cohort is large enough', () => {
    const { model, report } = buildRecalibratedWeightModel(
      DEFAULT_SIGNAL_WEIGHT_MODEL,
      cohort(120, 0.7),
    );
    expect(report.published).toBe(true);
    expect(model.modelVersion).toBe('qlix-trained-v1');
    expect(model.modelChecksum).toMatch(/^[a-f0-9]{64}$/);
    expect(model.weightsBySourceAndDimension.QLIX?.default).toBeGreaterThan(0);
    expect(report.nextWeight).not.toBe(report.previousWeight);
  });

  it('applies EWMA retain factor on manual derivation', () => {
    const { weight, updated } = deriveUpdatedWeight(0.85, 0.8, RECALIBRATION_MIN_SAMPLE);
    expect(updated).toBe(true);
    expect(weight).toBeCloseTo(0.9 * 0.85 + 0.1 * 0.9, 5);
  });
});
