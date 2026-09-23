import { describe, expect, it } from 'vitest';
import type { SkillEvidenceInferenceSnapshot } from '@smart/contracts';
import {
  buildEmployerSkillInspection,
  buildSkillLevelExplanation,
  classifyFreshness,
} from './skill-level-explanation.js';

const COMP_A = 'aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee';

function minimalInference(
  overrides: Partial<SkillEvidenceInferenceSnapshot> = {},
): SkillEvidenceInferenceSnapshot {
  return {
    studentId: '11111111-1111-4111-8111-111111111111',
    skillCode: 'SQL_QUERY_OPTIMIZATION',
    outcome: 'INFERRED',
    inferredProficiency: 'INTERMEDIATE',
    confidence: 'MEDIUM',
    confidenceReason: 'Project and assessment agree on core competencies.',
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
          competencyId: COMP_A,
          capability: 'Writes efficient queries',
          inferredStatus: 'DEMONSTRATED',
          primaryEvidenceSource: 'PROJECT',
          supportingSources: [],
          observableEvidence: ['Indexed lookup in project report'],
        },
      ],
      inferredDomainProficiency: 'INTERMEDIATE',
      ruleSetVersion: 'v1',
      capabilityGaps: [],
      confidence: 'MEDIUM',
      confidenceReason: 'Project and assessment agree on core competencies.',
      activeSources: ['PROJECT'],
      conflicts: [],
      fusionTrace: [
        {
          competencyId: COMP_A,
          fusedStatus: 'DEMONSTRATED',
          contributingSources: ['PROJECT'],
          appliedRuleIds: [],
          appliedVetoIds: [],
          ruleSetVersion: 'v1',
          confidenceReason: 'QLIX project observation demonstrated capability.',
        },
      ],
      assessmentComplete: false,
      recommendedNextStep: 'NONE',
    },
    ...overrides,
  };
}

describe('classifyFreshness', () => {
  it('marks evidence beyond maxAgeDays as EXPIRED', () => {
    expect(classifyFreshness(800, 730)).toBe('EXPIRED');
    expect(classifyFreshness(100, 730)).toBe('CURRENT');
  });
});

describe('buildSkillLevelExplanation', () => {
  it('uses EVIDENCE_ONLY basis when only inference exists', () => {
    const result = buildSkillLevelExplanation({
      skillCode: 'SQL_QUERY_OPTIMIZATION',
      skillName: 'SQL Query Optimization',
      claimStatus: 'DECLARED',
      verifiedProficiency: null,
      assessment: null,
      inference: minimalInference(),
      freshnessRows: [
        { evidenceId: '22222222-2222-4222-8222-222222222222', label: 'Capstone', ageDays: 30 },
      ],
      reportRefs: [],
      computedAt: '2026-01-02T00:00:00.000Z',
    });

    expect(result.basis).toBe('EVIDENCE_ONLY');
    expect(result.whyThisLevel).toContain('project evidence only');
    expect(result.verifiedVsAi.alignment).toBe('INFERENCE_ONLY');
  });

  it('flags divergence when verified claim differs from inference', () => {
    const result = buildSkillLevelExplanation({
      skillCode: 'SQL_QUERY_OPTIMIZATION',
      skillName: 'SQL Query Optimization',
      claimStatus: 'VERIFIED',
      verifiedProficiency: 'ADVANCED',
      assessment: null,
      inference: minimalInference({ inferredProficiency: 'INTERMEDIATE' }),
      freshnessRows: [],
      reportRefs: [],
      computedAt: '2026-01-02T00:00:00.000Z',
    });

    expect(result.verifiedVsAi.alignment).toBe('INFERENCE_DIVERGES_FROM_VERIFIED');
  });

  it('adds employer confidence indicators for verified multi-source profiles', () => {
    const explanation = buildSkillLevelExplanation({
      skillCode: 'SQL_QUERY_OPTIMIZATION',
      skillName: 'SQL Query Optimization',
      claimStatus: 'VERIFIED',
      verifiedProficiency: 'INTERMEDIATE',
      assessment: {
        attemptId: '33333333-3333-4333-8333-333333333333',
        highestSupportedProficiency: 'INTERMEDIATE',
        confidence: 'HIGH',
        evaluatedAt: '2026-01-01T00:00:00.000Z',
      },
      inference: minimalInference({ evidenceCount: 2 }),
      freshnessRows: [
        {
          evidenceId: '22222222-2222-4222-8222-222222222222',
          label: 'Capstone',
          ageDays: 20,
          maxAgeDays: 730,
        },
      ],
      reportRefs: [],
      computedAt: '2026-01-02T00:00:00.000Z',
    });

    const employer = buildEmployerSkillInspection(
      '11111111-1111-4111-8111-111111111111',
      explanation,
      2,
    );
    expect(employer.basis).toBe('ASSESSMENT_AND_EVIDENCE');
    expect(employer.employerConfidenceIndicators.some((row) => row.code === 'VERIFIED_SKILL')).toBe(
      true,
    );
    expect(employer.employerConfidenceIndicators.some((row) => row.code === 'MULTI_SOURCE')).toBe(
      true,
    );
  });
});
