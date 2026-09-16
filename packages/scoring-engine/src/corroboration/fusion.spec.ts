import { describe, expect, it } from 'vitest';
import { ACTIVE_TAXONOMY_VERSION } from '@smart/contracts';
import { DEFAULT_SIGNAL_WEIGHT_MODEL } from './default-weights.js';
import { fuseSignals } from './fusion.js';

const dim = (key: string) => ({
  taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
  dimensionKey: key,
  skillCode: key,
});

describe('fuseSignals', () => {
  it('returns passive-only readout when assessment Y is absent', () => {
    const result = fuseSignals({
      passiveX: {
        userId: '00000000-0000-4000-8000-000000000001',
        sourceId: 'GITHUB',
        taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
        encodedAt: '2026-09-11T00:00:00.000Z',
        entries: [
          {
            dimension: dim('PYTHON_APPLICATION_BACKEND_DEVELOPMENT'),
            sourceId: 'GITHUB',
            score: 0.6,
            confidence: 0.8,
          },
        ],
      },
      assessmentY: null,
      weights: DEFAULT_SIGNAL_WEIGHT_MODEL,
    });

    expect(result.readouts).toHaveLength(1);
    expect(result.readouts[0]?.passiveScore).toBe(0.6);
    expect(result.readouts[0]?.assessmentScore).toBeNull();
    expect(result.readouts[0]?.contradictionFlag).toBe(false);
    expect(result.contradictionDimensions).toHaveLength(0);
  });

  it('computes high agreement when passive and assessment align', () => {
    const result = fuseSignals({
      passiveX: {
        userId: '00000000-0000-4000-8000-000000000001',
        sourceId: 'GITHUB',
        taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
        encodedAt: '2026-09-11T00:00:00.000Z',
        entries: [
          {
            dimension: dim('LANGUAGE_PROFICIENCY'),
            sourceId: 'GITHUB',
            score: 0.75,
            confidence: 0.9,
          },
        ],
      },
      assessmentY: {
        userId: '00000000-0000-4000-8000-000000000001',
        claimId: '00000000-0000-4000-8000-000000000002',
        skillCode: 'LANGUAGE_PROFICIENCY',
        assessedAt: '2026-09-11T01:00:00.000Z',
        entries: [
          {
            dimension: dim('LANGUAGE_PROFICIENCY'),
            scorePercent: 78,
            passed: true,
            proficiencyLevel: 'INTERMEDIATE',
          },
        ],
      },
      weights: DEFAULT_SIGNAL_WEIGHT_MODEL,
    });

    expect(result.readouts[0]?.corroborationScore).toBeGreaterThan(90);
    expect(result.readouts[0]?.contradictionFlag).toBe(false);
  });

  it('flags contradiction when assessment passed but passive is very low', () => {
    const result = fuseSignals({
      passiveX: {
        userId: '00000000-0000-4000-8000-000000000001',
        sourceId: 'GITHUB',
        taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
        encodedAt: '2026-09-11T00:00:00.000Z',
        entries: [
          {
            dimension: dim('ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION'),
            sourceId: 'GITHUB',
            score: 0.05,
            confidence: 0.7,
          },
        ],
      },
      assessmentY: {
        userId: '00000000-0000-4000-8000-000000000001',
        claimId: '00000000-0000-4000-8000-000000000003',
        skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
        assessedAt: '2026-09-11T01:00:00.000Z',
        entries: [
          {
            dimension: dim('ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION'),
            scorePercent: 82,
            passed: true,
            proficiencyLevel: 'INTERMEDIATE',
          },
        ],
      },
      weights: DEFAULT_SIGNAL_WEIGHT_MODEL,
    });

    expect(result.readouts[0]?.contradictionFlag).toBe(true);
    expect(result.contradictionDimensions).toContain(
      'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
    );
  });

  it('fuses multiple passive signals (array input) instead of only using one source', () => {
    const result = fuseSignals({
      passiveX: [
        {
          userId: '00000000-0000-4000-8000-000000000001',
          sourceId: 'GITHUB',
          taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
          encodedAt: '2026-09-11T00:00:00.000Z',
          entries: [
            {
              dimension: dim('PYTHON_APPLICATION_BACKEND_DEVELOPMENT'),
              sourceId: 'GITHUB',
              score: 0.6,
              confidence: 0.8,
            },
          ],
        },
        {
          userId: '00000000-0000-4000-8000-000000000001',
          sourceId: 'PROFESSIONALCREDENTIAL',
          taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
          encodedAt: '2026-09-11T00:00:00.000Z',
          entries: [
            {
              dimension: dim('SQL_QUERY_OPTIMIZATION'),
              sourceId: 'PROFESSIONALCREDENTIAL',
              score: 0.9,
              confidence: 0.6,
            },
          ],
        },
      ],
      assessmentY: null,
      weights: DEFAULT_SIGNAL_WEIGHT_MODEL,
    });

    const dimensionKeys = result.readouts.map((r) => r.dimension.dimensionKey).sort();
    expect(dimensionKeys).toEqual([
      'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      'SQL_QUERY_OPTIMIZATION',
    ]);
  });

  it('does not flag when assessment failed even with low passive', () => {
    const result = fuseSignals({
      passiveX: {
        userId: '00000000-0000-4000-8000-000000000001',
        sourceId: 'GITHUB',
        taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
        encodedAt: '2026-09-11T00:00:00.000Z',
        entries: [
          {
            dimension: dim('SQL_QUERY_OPTIMIZATION'),
            sourceId: 'GITHUB',
            score: 0.05,
            confidence: 0.7,
          },
        ],
      },
      assessmentY: {
        userId: '00000000-0000-4000-8000-000000000001',
        claimId: '00000000-0000-4000-8000-000000000004',
        skillCode: 'SQL_QUERY_OPTIMIZATION',
        assessedAt: '2026-09-11T01:00:00.000Z',
        entries: [
          {
            dimension: dim('SQL_QUERY_OPTIMIZATION'),
            scorePercent: 40,
            passed: false,
            proficiencyLevel: 'BEGINNER',
          },
        ],
      },
      weights: DEFAULT_SIGNAL_WEIGHT_MODEL,
    });

    expect(result.readouts[0]?.contradictionFlag).toBe(false);
  });
});
