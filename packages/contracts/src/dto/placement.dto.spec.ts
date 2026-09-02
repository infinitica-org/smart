import { describe, expect, it } from 'vitest';
import {
  CreateJobOpeningRequestSchema,
  JobOpeningDtoSchema,
  ListJobOpeningsResponseSchema,
  SKILL_CODES,
} from '../index.js';

const taxonomySkill = SKILL_CODES[0] ?? 'PROGRAMMING_FUNDAMENTALS_LOGIC';

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

  it('rejects JD proficiency values that are not BEGINNER/INTERMEDIATE/ADVANCED', () => {
    const parsed = CreateJobOpeningRequestSchema.safeParse(
      validCreate({
        requiredSkills: [{ skillCode: taxonomySkill, minProficiency: 'PROFESSIONAL' }],
      }),
    );
    expect(parsed.success).toBe(false);
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
