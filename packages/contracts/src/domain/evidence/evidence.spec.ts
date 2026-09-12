import { describe, expect, it } from 'vitest';
import {
  ContributionSchema,
  EvidenceRecordSchema,
  FrameworkSkillClaimSchema,
  RESPONSIBILITY_LEVEL_RANK,
  TARGET_ROLES,
  TaxonomySkillCodeSchema,
  WorkExperienceResponsibilitySchema,
  evidenceRequiresRelatedSkills,
  frameworkSkillClaimFromDto,
  frameworkSkillClaimToDto,
} from '../../index.js';

const VALID_UUID = '00000000-0000-4000-8000-000000000001';
const VALID_UUID_2 = '00000000-0000-4000-8000-000000000002';

describe('evidence domain schemas', () => {
  it('parses a minimal evidence record', () => {
    const parsed = EvidenceRecordSchema.parse({
      evidenceId: VALID_UUID,
      candidateId: VALID_UUID_2,
      evidenceType: 'PROJECT',
      source: 'CANDIDATE',
      relatedSkillIds: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
      verificationStatus: 'PENDING',
      artifactIds: [],
      contradictions: [],
      accessibility: 'PRIVATE',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(parsed.evidenceType).toBe('PROJECT');
  });

  it('requires related skills when claim is present', () => {
    expect(
      evidenceRequiresRelatedSkills({
        claim: 'Built payment service',
        relatedSkillIds: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
      }),
    ).toBe(true);
    expect(
      evidenceRequiresRelatedSkills({
        claim: 'Built payment service',
        relatedSkillIds: [],
      }),
    ).toBe(false);
  });

  it('orders responsibility levels monotonically', () => {
    const levels = Object.keys(RESPONSIBILITY_LEVEL_RANK) as Array<
      keyof typeof RESPONSIBILITY_LEVEL_RANK
    >;
    for (let i = 1; i < levels.length; i += 1) {
      expect(RESPONSIBILITY_LEVEL_RANK[levels[i]!]).toBeGreaterThan(
        RESPONSIBILITY_LEVEL_RANK[levels[i - 1]!]!,
      );
    }
  });

  it('parses contribution and responsibility metadata', () => {
    expect(() =>
      ContributionSchema.parse({
        whatWasDone: 'Implemented API',
        personalContribution: 'Owned the auth module',
        responsibilityLevel: 'OWNED',
      }),
    ).not.toThrow();

    expect(() =>
      WorkExperienceResponsibilitySchema.parse({
        task: 'Ship feature',
        personalContribution: 'Led implementation',
        responsibilityLevel: 'DESIGNED_DECIDED',
      }),
    ).not.toThrow();
  });

  it('validates target role skill codes against taxonomy', () => {
    for (const role of TARGET_ROLES) {
      for (const code of [...role.recommendedSkillIds, ...role.optionalSkillIds]) {
        expect(TaxonomySkillCodeSchema.safeParse(code).success).toBe(true);
      }
    }
  });

  it('round-trips framework skill claim bridge helpers', () => {
    const dto = {
      claimId: VALID_UUID,
      studentId: VALID_UUID_2,
      skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      proficiency: 'INTERMEDIATE' as const,
      status: 'DECLARED' as const,
      strikes: 0,
      lockedUntil: null,
      lastAttemptId: null,
    };
    const framework = frameworkSkillClaimFromDto(dto, VALID_UUID_2);
    expect(FrameworkSkillClaimSchema.parse(framework).skillCode).toBe(dto.skillCode);
    const back = frameworkSkillClaimToDto(framework);
    expect(back.claimId).toBe(dto.claimId);
    expect(back.skillCode).toBe(dto.skillCode);
  });
});
