import { describe, expect, it } from 'vitest';
import {
  COMPANY_VISIBLE_WHERE,
  acceptingOpeningWhere,
  isAcceptingApplications,
  isCompanyVerified,
  isJobAllowedForStudent,
  passesStudentEligibility,
  utcToday,
} from './job-eligibility.js';

const today = new Date('2026-09-25T00:00:00Z');

describe('job eligibility (shared by Jobs page and dashboard top matches)', () => {
  it('only lists open, unexpired jobs of the institution from a visible company', () => {
    const where = acceptingOpeningWhere('inst-1', today);
    expect(where).toMatchObject({ institutionId: 'inst-1', status: 'OPEN' });
    expect(JSON.stringify(where)).toContain('"gte":"2026-09-25');
    expect(where.AND).toContainEqual(COMPANY_VISIBLE_WHERE);
  });

  it('shows a company-less university job but requires an approved active company otherwise', () => {
    expect(JSON.stringify(COMPANY_VISIBLE_WHERE)).toContain('"companyId":null');
    expect(JSON.stringify(COMPANY_VISIBLE_WHERE)).toContain('APPROVED');
    expect(isCompanyVerified(null)).toBe(false);
    expect(
      isCompanyVerified({ verificationStatus: 'PENDING', deactivatedAt: null, heldAt: null }),
    ).toBe(false);
    expect(
      isCompanyVerified({
        verificationStatus: 'APPROVED',
        deactivatedAt: null,
        heldAt: new Date(),
      }),
    ).toBe(false);
    expect(
      isCompanyVerified({ verificationStatus: 'APPROVED', deactivatedAt: null, heldAt: null }),
    ).toBe(true);
  });

  it('treats a job as closed once its status or deadline says so', () => {
    expect(isAcceptingApplications({ status: 'OPEN', lastDateToApply: null }, today)).toBe(true);
    expect(isAcceptingApplications({ status: 'OPEN', lastDateToApply: today }, today)).toBe(true);
    expect(
      isAcceptingApplications({ status: 'OPEN', lastDateToApply: new Date('2026-09-24') }, today),
    ).toBe(false);
    expect(isAcceptingApplications({ status: 'CLOSED', lastDateToApply: null }, today)).toBe(false);
    expect(isAcceptingApplications({ status: 'DRAFT', lastDateToApply: null }, today)).toBe(false);
  });

  it('applies academic minimums but never excludes on an unknown student value', () => {
    const rules = { minSscPercentage: 70, minHscPercentage: 60, backlogsAllowed: false };
    const ok = { sscPercentage: 80, hscPercentage: 75, hasActiveBacklog: false };
    expect(passesStudentEligibility(rules, ok)).toBe(true);
    expect(passesStudentEligibility(rules, { ...ok, sscPercentage: 65 })).toBe(false);
    expect(passesStudentEligibility(rules, { ...ok, hasActiveBacklog: true })).toBe(false);
    expect(
      passesStudentEligibility(rules, {
        sscPercentage: null,
        hscPercentage: null,
        hasActiveBacklog: null,
      }),
    ).toBe(true);
  });

  it('has a single allow-all university-employer access function until Th6-446/367', () => {
    expect(
      isJobAllowedForStudent(
        { id: 's', institutionId: 'i' },
        { id: 'j', institutionId: 'i', companyId: null },
      ),
    ).toBe(true);
  });

  it('computes today in UTC', () => {
    expect(utcToday(new Date('2026-09-25T23:59:59Z')).toISOString()).toBe(
      '2026-09-25T00:00:00.000Z',
    );
  });
});
