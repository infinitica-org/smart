import { describe, expect, it } from 'vitest';
import {
  collegePercentageFromCgpa,
  studentMeetsJobOpeningEligibility,
} from './job-opening-eligibility.js';

describe('studentMeetsJobOpeningEligibility', () => {
  it('passes when no criteria are set', () => {
    expect(
      studentMeetsJobOpeningEligibility(
        { cgpa: null, sscPercentage: null, hscPercentage: null, hasActiveBacklog: null },
        {},
      ).eligible,
    ).toBe(true);
  });

  it('enforces SSC, HSC, college, and backlog rules', () => {
    const criteria = {
      minSscPercentage: 60,
      minHscPercentage: 65,
      minCollegePercentage: 70,
      backlogsAllowed: false,
    };
    const ok = studentMeetsJobOpeningEligibility(
      {
        cgpa: 7.5,
        sscPercentage: 72,
        hscPercentage: 68,
        hasActiveBacklog: false,
      },
      criteria,
    );
    expect(ok.eligible).toBe(true);

    const lowSsc = studentMeetsJobOpeningEligibility(
      { cgpa: 8, sscPercentage: 55, hscPercentage: 70, hasActiveBacklog: false },
      criteria,
    );
    expect(lowSsc.eligible).toBe(false);

    const backlog = studentMeetsJobOpeningEligibility(
      { cgpa: 8, sscPercentage: 80, hscPercentage: 80, hasActiveBacklog: true },
      criteria,
    );
    expect(backlog.eligible).toBe(false);
  });

  it('maps CGPA to college percentage', () => {
    expect(collegePercentageFromCgpa(7)).toBe(70);
  });
});
