import { describe, expect, it } from 'vitest';
import {
  EMPTY_JOB_POSTING_FORM,
  JOB_POSTING_STEPS,
  UNSUPPORTED_JOB_POSTING_FIELDS,
  buildCreateOpeningPayload,
  isCreateOpeningPayload,
} from './job-posting';

describe('job posting payload', () => {
  it('exposes eight UI steps without adding an overview route', () => {
    expect(JOB_POSTING_STEPS.map((step) => step.id)).toEqual([
      'company-role',
      'about-company',
      'job-details',
      'requirements',
      'eligibility',
      'hiring-process',
      'drive-details',
      'review',
    ]);
  });

  it('builds the existing create-opening payload from wizard state', () => {
    const parsed = buildCreateOpeningPayload(
      {
        ...EMPTY_JOB_POSTING_FORM,
        companyName: 'Infinitica Labs',
        roleTitle: 'Backend Engineer',
        location: 'Coimbatore',
        minYearsExperience: '2',
        maxYearsExperience: '5',
        headcount: '3',
        categoryId: 'SOFTWARE_ARCHITECTURE_SYSTEM_DESIGN',
      },
      new Map([['ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION', 'ADVANCED']]),
    );

    expect(isCreateOpeningPayload(parsed)).toBe(true);
    if (!isCreateOpeningPayload(parsed)) return;
    expect(parsed.data).toEqual({
      companyName: 'Infinitica Labs',
      roleTitle: 'Backend Engineer',
      domain: 'SOFTWARE_IT',
      categoryId: 'SOFTWARE_ARCHITECTURE_SYSTEM_DESIGN',
      minYearsExperience: 2,
      maxYearsExperience: 5,
      location: 'Coimbatore',
      employmentType: 'FULL_TIME',
      headcount: 3,
      requiredSkills: [
        {
          skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
          minProficiency: 'ADVANCED',
        },
      ],
    });
    expect(parsed.data).not.toHaveProperty('salary');
    expect(parsed.data).not.toHaveProperty('driveDate');
  });

  it('rejects an inverted experience range with the shared contract', () => {
    const parsed = buildCreateOpeningPayload(
      {
        ...EMPTY_JOB_POSTING_FORM,
        companyName: 'Infinitica Labs',
        roleTitle: 'Backend Engineer',
        location: 'Coimbatore',
        minYearsExperience: '6',
        maxYearsExperience: '2',
      },
      new Map([['ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION', 'BEGINNER']]),
    );

    expect(parsed.success).toBe(false);
  });

  it('lists unsupported requested fields so the UI cannot pretend they persist', () => {
    expect(UNSUPPORTED_JOB_POSTING_FIELDS).toContain('Salary Details');
    expect(UNSUPPORTED_JOB_POSTING_FIELDS).toContain('Drive Date');
  });
});
