import type { Prisma } from '../../generated/prisma/index.js';

/**
 * JOB-02 — the one place that decides which openings a student may see. The dashboard's top matches
 * (Th6-229) and the Jobs page (Th6-379) both go through here so they can never disagree.
 */

export function utcToday(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** A company-posted job needs an approved, active company; a job with no company is the institution's own. */
export const COMPANY_VISIBLE_WHERE: Prisma.JobOpeningWhereInput = {
  OR: [
    { companyId: null },
    { company: { verificationStatus: 'APPROVED', deactivatedAt: null, heldAt: null } },
  ],
};

/**
 * UNI-05 (Th6-446) — an employer's job reaches a campus only while that campus holds an ACTIVE
 * UniversityEmployerAccess for the employer. Jobs with no company are the institution's own and stay visible.
 * Revoking access hides the jobs; existing applications are never touched.
 */
export function campusApprovedWhere(institutionId: string): Prisma.JobOpeningWhereInput {
  return {
    OR: [
      { companyId: null },
      { company: { campusAccess: { some: { institutionId, status: 'ACTIVE' } } } },
    ],
  };
}

/** Healthy, verified company AND approved at this campus (see campusApprovedWhere). */
export function companyVisibleWhere(institutionId: string): Prisma.JobOpeningWhereInput {
  return { AND: [COMPANY_VISIBLE_WHERE, campusApprovedWhere(institutionId)] };
}

/** Open, published, not past its deadline, at the student's institution, and from a visible company. */
export function acceptingOpeningWhere(
  institutionId: string,
  today: Date = utcToday(),
): Prisma.JobOpeningWhereInput {
  return {
    institutionId,
    status: 'OPEN',
    AND: [
      { OR: [{ lastDateToApply: null }, { lastDateToApply: { gte: today } }] },
      companyVisibleWhere(institutionId),
    ],
  };
}

export function isAcceptingApplications(
  job: { status: string; lastDateToApply: Date | null },
  today: Date = utcToday(),
): boolean {
  return job.status === 'OPEN' && (job.lastDateToApply === null || job.lastDateToApply >= today);
}

export interface StudentEligibilityFacts {
  sscPercentage: unknown;
  hscPercentage: unknown;
  hasActiveBacklog: boolean | null;
}

export interface OpeningEligibilityRules {
  minSscPercentage: unknown;
  minHscPercentage: unknown;
  backlogsAllowed: boolean;
}

/** Academic minimums on the fields we store. Unknown student values never exclude a job. */
export function passesStudentEligibility(
  row: OpeningEligibilityRules,
  student: StudentEligibilityFacts,
): boolean {
  if (row.minSscPercentage !== null && student.sscPercentage !== null) {
    if (Number(student.sscPercentage) < Number(row.minSscPercentage)) return false;
  }
  if (row.minHscPercentage !== null && student.hscPercentage !== null) {
    if (Number(student.hscPercentage) < Number(row.minHscPercentage)) return false;
  }
  if (!row.backlogsAllowed && student.hasActiveBacklog === true) return false;
  return true;
}

/**
 * Per-job hook that runs after the query. The campus-access rule (Th6-446) is enforced in the query
 * itself (campusApprovedWhere), so it holds for lists, counts and single lookups alike.
 * TODO(Th6-367, Vedika): employer-side job approval / eligibility rules plug in here. Not built by UNI-05.
 */
export function isJobAllowedForStudent(
  _student: { id: string; institutionId: string },
  _job: { id: string; institutionId: string; companyId: string | null },
): boolean {
  return true;
}

/** True when the company behind a job is verified (only then does the VerifiedBadge show). */
export function isCompanyVerified(
  company: { verificationStatus: string; deactivatedAt: Date | null; heldAt: Date | null } | null,
): boolean {
  return company?.verificationStatus === 'APPROVED' && !company.deactivatedAt && !company.heldAt;
}
