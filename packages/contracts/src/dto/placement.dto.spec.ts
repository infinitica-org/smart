import { describe, expect, it } from 'vitest';
import {
  ApplicationConfidenceDtoSchema,
  CandidateApplicationDtoSchema,
  CreateApplicationRequestSchema,
  CreateJobOpeningRequestSchema,
  JobOpeningDtoSchema,
  ListJobOpeningsResponseSchema,
  ListMyApplicationsResponseSchema,
  SEND_TO_COMPANY_STAGE,
  SKILL_CODES,
} from '../index.js';

const taxonomySkill = SKILL_CODES[0] ?? 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION';

function validCreate(overrides: Record<string, unknown> = {}) {
  return {
    companyName: 'Acme Labs',
    roleTitle: 'Backend Engineer',
    domain: 'SOFTWARE_IT',
    requiredSkills: [{ skillCode: taxonomySkill, minProficiency: 'INTERMEDIATE' }],
    minYearsExperience: 1,
    maxYearsExperience: 4,
    location: 'Bengaluru',
    employmentType: 'FULL_TIME',
    headcount: 2,
    ...overrides,
  };
}

function validOpeningDto(overrides: Record<string, unknown> = {}) {
  return {
    ...validCreate(),
    openingId: '00000000-0000-4000-8000-000000000010',
    institutionId: '00000000-0000-4000-8000-000000000001',
    status: 'DRAFT',
    createdAt: '2026-09-02T00:00:00.000Z',
    ...overrides,
  };
}

describe('CO-T01 job opening contracts', () => {
  it('accepts a valid TPO create payload', () => {
    const parsed = CreateJobOpeningRequestSchema.safeParse(validCreate());
    expect(parsed.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const parsed = CreateJobOpeningRequestSchema.safeParse({
      companyName: 'Acme Labs',
      roleTitle: 'Backend Engineer',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects a client-supplied institutionId on create', () => {
    const parsed = CreateJobOpeningRequestSchema.safeParse(
      validCreate({ institutionId: '00000000-0000-4000-8000-000000000001' }),
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect('institutionId' in parsed.data).toBe(false);
    }
  });

  it('rejects a skill code outside the INF-05 taxonomy', () => {
    const parsed = CreateJobOpeningRequestSchema.safeParse(
      validCreate({
        requiredSkills: [{ skillCode: 'javascript', minProficiency: 'BEGINNER' }],
      }),
    );
    expect(parsed.success).toBe(false);
  });

  it('rejects JD proficiency values outside the skill proficiency enum', () => {
    const parsed = CreateJobOpeningRequestSchema.safeParse(
      validCreate({
        requiredSkills: [{ skillCode: taxonomySkill, minProficiency: 'EXPERT' }],
      }),
    );
    expect(parsed.success).toBe(false);
  });

  it('accepts PROFESSIONAL as a valid JD minProficiency', () => {
    const parsed = CreateJobOpeningRequestSchema.safeParse(
      validCreate({
        requiredSkills: [{ skillCode: taxonomySkill, minProficiency: 'PROFESSIONAL' }],
      }),
    );
    expect(parsed.success).toBe(true);
  });

  it('rejects an experience range where minimum exceeds maximum', () => {
    const parsed = CreateJobOpeningRequestSchema.safeParse(
      validCreate({ minYearsExperience: 5, maxYearsExperience: 2 }),
    );
    expect(parsed.success).toBe(false);
  });

  it('rejects an employment type outside the closed enum', () => {
    const parsed = CreateJobOpeningRequestSchema.safeParse(validCreate({ employmentType: 'GIG' }));
    expect(parsed.success).toBe(false);
  });

  it('rejects a non-positive headcount', () => {
    const parsed = CreateJobOpeningRequestSchema.safeParse(validCreate({ headcount: 0 }));
    expect(parsed.success).toBe(false);
  });

  it('accepts a list response of institution-scoped openings', () => {
    const parsed = ListJobOpeningsResponseSchema.safeParse({
      openings: [validOpeningDto()],
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a list row that omits server-set institutionId', () => {
    const parsed = JobOpeningDtoSchema.safeParse({
      ...validCreate(),
      openingId: '00000000-0000-4000-8000-000000000010',
      status: 'DRAFT',
      createdAt: '2026-09-02T00:00:00.000Z',
    });
    expect(parsed.success).toBe(false);
    expect(
      ListJobOpeningsResponseSchema.safeParse({
        openings: [
          {
            ...validCreate(),
            openingId: '00000000-0000-4000-8000-000000000010',
            status: 'DRAFT',
            createdAt: '2026-09-02T00:00:00.000Z',
          },
        ],
      }).success,
    ).toBe(false);
  });
});

describe('AC-T05 create application contract', () => {
  const validShortlist = {
    openingId: '00000000-0000-4000-8000-000000000010',
    studentId: '00000000-0000-4000-8000-000000000020',
    matchScore: 0.92,
  };

  it('accepts openingId, studentId and an optional matchScore', () => {
    expect(CreateApplicationRequestSchema.safeParse(validShortlist).success).toBe(true);
    expect(
      CreateApplicationRequestSchema.safeParse({
        openingId: validShortlist.openingId,
        studentId: validShortlist.studentId,
      }).success,
    ).toBe(true);
  });

  it('strips a client-supplied institutionId and rejects an out-of-range score', () => {
    const parsed = CreateApplicationRequestSchema.safeParse({
      ...validShortlist,
      institutionId: '00000000-0000-4000-8000-000000000001',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect('institutionId' in parsed.data).toBe(false);
    }
    expect(
      CreateApplicationRequestSchema.safeParse({ ...validShortlist, matchScore: 1.4 }).success,
    ).toBe(false);
  });
});

describe('CN-T06 candidate application contracts', () => {
  const validMine = {
    applicationId: '00000000-0000-4000-8000-000000000010',
    openingId: '00000000-0000-4000-8000-000000000011',
    studentId: '00000000-0000-4000-8000-000000000012',
    stage: 'SHORTLISTED',
    matchScore: 0.88,
    createdAt: '2026-09-02T00:00:00.000Z',
    updatedAt: '2026-09-02T01:00:00.000Z',
    companyName: 'Acme Labs',
    roleTitle: 'Backend Engineer',
    location: 'Bengaluru',
    employmentType: 'FULL_TIME',
    domain: 'SOFTWARE_IT',
  };

  it('reuses Application identity plus CO-T01 opening display fields', () => {
    const parsed = CandidateApplicationDtoSchema.parse(validMine);
    expect(parsed.stage).toBe('SHORTLISTED');
    expect(parsed.companyName).toBe('Acme Labs');
    expect(parsed.roleTitle).toBe('Backend Engineer');
  });

  it('accepts AI_VERIFIED and HIRED as canonical ATS stages', () => {
    expect(
      CandidateApplicationDtoSchema.safeParse({ ...validMine, stage: 'AI_VERIFIED' }).success,
    ).toBe(true);
    expect(CandidateApplicationDtoSchema.safeParse({ ...validMine, stage: 'HIRED' }).success).toBe(
      true,
    );
  });

  it('rejects a stage that is not in the canonical AtsStage enum', () => {
    expect(
      CandidateApplicationDtoSchema.safeParse({ ...validMine, stage: 'SENT_TO_COMPANY' }).success,
    ).toBe(false);
  });

  it('accepts a list of the authenticated student applications', () => {
    expect(ListMyApplicationsResponseSchema.safeParse({ applications: [validMine] }).success).toBe(
      true,
    );
  });
});

describe('AC-T06 send-to-company contracts', () => {
  it('maps send-to-company onto the AI_VERIFIED kanban column', () => {
    expect(SEND_TO_COMPANY_STAGE).toBe('AI_VERIFIED');
  });

  it('allows a TPO-readable pass/fail + explanation without a numeric score', () => {
    const parsed = ApplicationConfidenceDtoSchema.parse({
      applicationId: '00000000-0000-4000-8000-000000000010',
      studentId: '00000000-0000-4000-8000-000000000011',
      available: true,
      complete: true,
      passed: true,
      explanation: 'Named Redis and explained stampede and TTL trade-offs.',
      promptRef: 'skill-interview-grader@1',
      sendBlockedReason: null,
    });
    expect(parsed.passed).toBe(true);
    expect('score' in parsed).toBe(false);
  });
});
