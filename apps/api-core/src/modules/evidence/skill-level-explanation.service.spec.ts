import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { SkillLevelExplanationService } from './skill-level-explanation.service.js';

vi.mock('@smart/contracts', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getSkillBlueprint: vi.fn(() => ({
      competencyModel: [{ competencyId: 'aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee' }],
      freshnessPolicy: { maxAgeDays: 730 },
    })),
    getSkillDefinition: vi.fn(() => ({ name: 'SQL Query Optimization' })),
  };
});

describe('SkillLevelExplanationService', () => {
  it('returns 404 when student is outside the institution for employer inspection', async () => {
    const prisma = {
      user: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const service = new SkillLevelExplanationService(
      prisma as never,
      { getForStudent: vi.fn() } as never,
    );

    await expect(
      service.getForEmployerInspection('inst-1', 'student-1', 'SQL_QUERY_OPTIMIZATION'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('builds student explanation from claim, assessment, and inference', async () => {
    const prisma = {
      skillClaim: {
        findFirst: vi.fn().mockResolvedValue({
          status: 'VERIFIED',
          proficiency: 'INTERMEDIATE',
          finalProficiency: 'INTERMEDIATE',
          verificationAttempts: [
            {
              id: 'attempt-1',
              explanation: 'Named indexes and explained trade-offs.',
              assessmentAttemptId: '33333333-3333-4333-8333-333333333333',
              createdAt: new Date('2026-01-01T00:00:00.000Z'),
              assessmentResultJson: {
                skillCode: 'SQL_QUERY_OPTIMIZATION',
                attemptId: '33333333-3333-4333-8333-333333333333',
                competencyResults: [],
                highestAssessmentSupportedProficiency: 'INTERMEDIATE',
                targetProficiency: 'INTERMEDIATE',
                assessmentComplete: true,
                assessmentPassed: true,
                uncertainties: [],
                recommendedNextStep: 'NONE',
                requiresInterview: false,
                requiresEvidenceVerification: false,
                requiresAdditionalAssessment: false,
                confidence: 'HIGH',
                evaluatedAt: '2026-01-01T00:00:00.000Z',
              },
            },
          ],
        }),
      },
      evidenceRecord: { findMany: vi.fn().mockResolvedValue([]) },
      user: {
        findFirst: vi.fn().mockResolvedValue({ id: '11111111-1111-4111-8111-111111111111' }),
      },
    };

    const inference = {
      studentId: '11111111-1111-4111-8111-111111111111',
      skillCode: 'SQL_QUERY_OPTIMIZATION',
      outcome: 'INFERRED',
      inferredProficiency: 'INTERMEDIATE',
      confidence: 'HIGH',
      confidenceReason: 'Aligned signals.',
      proficiencyInferenceReason: null,
      evidenceCount: 0,
      provenance: {
        ruleSetVersion: 'v1',
        taxonomyVersion: 'skill@1',
        promptRefs: [],
        evidenceRecordIds: [],
        computedAt: '2026-01-01T00:00:00.000Z',
      },
      fusion: {
        skillCode: 'SQL_QUERY_OPTIMIZATION',
        capabilityProfile: [],
        inferredDomainProficiency: 'INTERMEDIATE',
        ruleSetVersion: 'v1',
        capabilityGaps: [],
        confidence: 'HIGH',
        confidenceReason: 'Aligned signals.',
        activeSources: ['ASSESSMENT'],
        conflicts: [],
        fusionTrace: [],
        assessmentComplete: true,
        recommendedNextStep: 'NONE',
      },
    };

    const skillInference = { getForStudent: vi.fn().mockResolvedValue(inference) };
    const service = new SkillLevelExplanationService(prisma as never, skillInference as never);

    const result = await service.getForStudent(
      '11111111-1111-4111-8111-111111111111',
      'SQL_QUERY_OPTIMIZATION',
    );

    expect(result.basis).toBe('ASSESSMENT_ONLY');
    expect(result.verifiedVsAi.verified?.proficiency).toBe('INTERMEDIATE');
    expect(result.reportRefs.some((row) => row.kind === 'ASSESSMENT_ATTEMPT')).toBe(true);
  });
});
