import { describe, expect, it } from 'vitest';
import type { CompetencyFusionResult } from '@smart/contracts';
import {
  fusionRequiresProficiencyDowngrade,
  resolveDemonstratedProficiencyForFinalize,
} from './finalize-demonstrated-proficiency.js';

function fusion(overrides?: Partial<CompetencyFusionResult>): CompetencyFusionResult {
  return {
    skillCode: 'RESTFUL_GRAPHQL_API_DESIGN',
    capabilityProfile: [],
    inferredDomainProficiency: 'BEGINNER',
    ruleSetVersion: 'v1',
    capabilityGaps: [],
    confidence: 'MEDIUM',
    confidenceReason: 'test',
    activeSources: ['ASSESSMENT', 'PROJECT'],
    conflicts: [],
    fusionTrace: [],
    assessmentComplete: true,
    recommendedNextStep: 'NONE',
    ...overrides,
  };
}

describe('resolveDemonstratedProficiencyForFinalize', () => {
  it('prefers assessment when interview passed and fusion has no veto', () => {
    expect(
      resolveDemonstratedProficiencyForFinalize({
        assessmentSupported: 'ADVANCED',
        fusionInferred: 'BEGINNER',
        interviewPassed: true,
        fusion: fusion(),
      }),
    ).toBe('ADVANCED');
  });

  it('caps down when fusion applied a veto', () => {
    expect(
      resolveDemonstratedProficiencyForFinalize({
        assessmentSupported: 'ADVANCED',
        fusionInferred: 'BEGINNER',
        interviewPassed: true,
        fusion: fusion({
          fusionTrace: [
            {
              competencyId: 'aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee',
              fusedStatus: 'NOT_DEMONSTRATED',
              contributingSources: ['PROJECT'],
              appliedRuleIds: ['R-01'],
              appliedVetoIds: ['V-CEIL-01'],
              ruleSetVersion: 'v1',
              confidenceReason: 'ceiling',
              inputs: {},
            },
          ],
        }),
      }),
    ).toBe('BEGINNER');
  });

  it('uses fusion when assessment is absent', () => {
    expect(
      resolveDemonstratedProficiencyForFinalize({
        assessmentSupported: null,
        fusionInferred: 'INTERMEDIATE',
        interviewPassed: false,
        fusion: null,
      }),
    ).toBe('INTERMEDIATE');
  });
});

describe('fusionRequiresProficiencyDowngrade', () => {
  it('detects unresolved conflicts', () => {
    expect(
      fusionRequiresProficiencyDowngrade(
        fusion({
          conflicts: [
            {
              type: 'CONFLICT',
              competencyId: 'aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee',
              sources: ['ASSESSMENT', 'PROJECT'],
              message: 'divergence',
              resolved: false,
            },
          ],
        }),
      ),
    ).toBe(true);
  });
});
