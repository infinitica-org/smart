import { describe, expect, it } from 'vitest';
import {
  buildFusionCapabilityRows,
  fusionCapabilityModelVersion,
} from './fusion-capability-sync.js';

describe('fusion-capability-sync', () => {
  it('builds a version string from provenance parts', () => {
    expect(
      fusionCapabilityModelVersion({
        ruleSetVersion: 'v1',
        taxonomyVersion: 'skill@1',
        capabilityModelVersion: 'capability-inference-v1',
      }),
    ).toBe('fusion:v1|skill@1|capability-inference-v1');
  });

  it('maps fusion capability profile rows for persistence', () => {
    const rows = buildFusionCapabilityRows(
      {
        studentId: '11111111-1111-4111-8111-111111111111',
        skillCode: 'SQL_QUERY_OPTIMIZATION',
        outcome: 'INFERRED',
        inferredProficiency: 'INTERMEDIATE',
        confidence: 'MEDIUM',
        confidenceReason: 'ok',
        proficiencyInferenceReason: null,
        evidenceCount: 1,
        provenance: {
          ruleSetVersion: 'v1',
          taxonomyVersion: 'skill@1',
          promptRefs: [],
          evidenceRecordIds: [],
          computedAt: '2026-01-01T00:00:00.000Z',
        },
        fusion: {
          skillCode: 'SQL_QUERY_OPTIMIZATION',
          capabilityProfile: [
            {
              competencyId: 'aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee',
              capability: 'Writes efficient queries',
              inferredStatus: 'DEMONSTRATED',
              primaryEvidenceSource: 'PROJECT',
              supportingSources: [],
              observableEvidence: ['Used indexes in capstone'],
            },
          ],
          inferredDomainProficiency: 'INTERMEDIATE',
          ruleSetVersion: 'v1',
          capabilityGaps: [],
          confidence: 'MEDIUM',
          confidenceReason: 'ok',
          activeSources: ['PROJECT'],
          conflicts: [],
          fusionTrace: [],
          assessmentComplete: false,
          recommendedNextStep: 'NONE',
        },
      },
      'fusion:v1|skill@1|capability-inference-v1',
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.proficiency).toBe('INTERMEDIATE');
    expect(rows[0]?.evidenceRefs).toContain('Used indexes in capstone');
  });
});
