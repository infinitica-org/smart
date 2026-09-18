import { describe, expect, it } from 'vitest';
import { mapVerifiedProjectToQlixFusionInput } from './qlix-project.mapper.js';

describe('mapVerifiedProjectToQlixFusionInput', () => {
  it('maps persisted QLIX columns and smart assessment JSON to fusion input', () => {
    const mapped = mapVerifiedProjectToQlixFusionInput(
      {
        id: '00000000-0000-4000-8000-000000000001',
        skillMappings: [{ skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT' }],
        qlixCheckResult: {
          appliedProficiencyCeiling: 'ADVANCED',
          qualityScore: 82,
          authenticityScore: 76,
          relevanceScore: 88,
          similarityIndex: 15,
          aiLikelihood: 10,
          confidence: 'high',
          smartAssessmentJson: {
            competencyObservations: [{ competencyId: 'c1', status: 'DEMONSTRATED' }],
          },
        },
      },
      { defenseScore: 91 },
    );

    expect(mapped).not.toBeNull();
    expect(mapped?.skillCodes).toEqual(['PYTHON_APPLICATION_BACKEND_DEVELOPMENT']);
    expect(mapped?.defenseScore).toBe(91);
    expect(mapped?.competencyObservations).toHaveLength(1);
  });

  it('returns null when QLIX result or skill mappings are missing', () => {
    expect(
      mapVerifiedProjectToQlixFusionInput({
        id: 'p1',
        skillMappings: [],
        qlixCheckResult: { appliedProficiencyCeiling: 'ADVANCED' } as never,
      }),
    ).toBeNull();
    expect(
      mapVerifiedProjectToQlixFusionInput({
        id: 'p1',
        skillMappings: [{ skillCode: 'SQL_QUERY_OPTIMIZATION' }],
        qlixCheckResult: null,
      }),
    ).toBeNull();
  });
});
