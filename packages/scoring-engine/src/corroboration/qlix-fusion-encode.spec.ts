import { describe, expect, it } from 'vitest';
import {
  competencyObservationScore,
  computeQlixFusionConfidence,
  computeQlixSkillScore,
  encodeQlixFusionEntries,
} from './qlix-fusion-encode.js';

describe('qlix-fusion-encode', () => {
  it('maps competency observation statuses to normalized scores', () => {
    expect(competencyObservationScore('DEMONSTRATED')).toBe(0.85);
    expect(competencyObservationScore('PARTIALLY_DEMONSTRATED')).toBe(0.6);
    expect(competencyObservationScore('UNCERTAIN')).toBe(0.35);
  });

  it('blends QLIX report columns into a skill score', () => {
    const score = computeQlixSkillScore({
      appliedProficiencyCeiling: 'ADVANCED',
      qualityScore: 80,
      authenticityScore: 70,
      relevanceScore: 90,
      similarityIndex: 20,
      qlixConfidence: 'high',
    });

    expect(score).not.toBeNull();
    if (score == null) return;
    expect(score).toBeGreaterThan(0.6);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('falls back to competency observations when scalar scores are absent', () => {
    const score = computeQlixSkillScore({
      competencyObservations: [
        { competencyId: 'c1', status: 'DEMONSTRATED' },
        { competencyId: 'c2', status: 'UNCERTAIN' },
      ],
    });

    expect(score).toBeCloseTo(0.6, 2);
  });

  it('boosts confidence with defense score and penalizes integrity risks', () => {
    const strong = computeQlixFusionConfidence({
      qlixConfidence: 'high',
      defenseScore: 90,
    });
    const risky = computeQlixFusionConfidence({
      qlixConfidence: 'high',
      defenseScore: 90,
      similarityIndex: 95,
      aiLikelihood: 85,
      ownershipConcern: true,
    });

    expect(strong).toBeGreaterThan(risky);
  });

  it('merges verified projects by skill code using the strongest score', () => {
    const entries = encodeQlixFusionEntries([
      {
        projectId: 'p1',
        skillCodes: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
        appliedProficiencyCeiling: 'INTERMEDIATE',
        qualityScore: 60,
        qlixConfidence: 'medium',
      },
      {
        projectId: 'p2',
        skillCodes: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
        appliedProficiencyCeiling: 'ADVANCED',
        qualityScore: 85,
        qlixConfidence: 'high',
        defenseScore: 88,
      },
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0]?.skillCode).toBe('PYTHON_APPLICATION_BACKEND_DEVELOPMENT');
    expect(entries[0]?.score).toBeGreaterThan(0.5);
    expect(entries[0]?.confidence).toBeGreaterThan(0.6);
  });
});
