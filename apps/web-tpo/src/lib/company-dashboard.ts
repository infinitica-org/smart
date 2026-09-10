import {
  ATS_STAGES,
  type ApplicationDto,
  type AtsStage,
  type JobOpeningDto,
} from '@smart/contracts';

/** CO-T02 kanban column labeled "Applied / New Matches". */
export const NEW_MATCH_STAGE = 'APPLIED' as const satisfies AtsStage;

/** Canonical "Active" opening — Draft/Active/Closed on the CO-T01 list. */
export const ACTIVE_OPENING_STATUS = 'OPEN' as const;

export const RECENT_MATCHES_LIMIT = 8;

export const PIPELINE_LABELS: Record<AtsStage, string> = {
  APPLIED: 'Applied / New Matches',
  SHORTLISTED: 'Shortlisted',
  AI_VERIFIED: 'AI-Verified',
  INTERVIEW: 'Interviewing',
  OFFER: 'Offer',
  HIRED: 'Hired',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

export type RecentMatch = {
  applicationId: string;
  studentId: string;
  studentName: string;
  openingId: string;
  roleTitle: string;
  companyName: string;
  stage: AtsStage;
  matchScore: number | null;
  createdAt: string;
};

export function pipelineStages(): readonly AtsStage[] {
  return ATS_STAGES;
}

export function emptyStageCounts(): Record<AtsStage, number> {
  return {
    APPLIED: 0,
    SHORTLISTED: 0,
    AI_VERIFIED: 0,
    INTERVIEW: 0,
    OFFER: 0,
    HIRED: 0,
    REJECTED: 0,
    WITHDRAWN: 0,
  };
}

export function activeOpenings(openings: JobOpeningDto[]): JobOpeningDto[] {
  return openings.filter((opening) => opening.status === ACTIVE_OPENING_STATUS);
}

export function countNewMatches(applications: ApplicationDto[]): number {
  return applications.filter((application) => application.stage === NEW_MATCH_STAGE).length;
}

export function countApplicationsByStage(applications: ApplicationDto[]): Record<AtsStage, number> {
  const counts = emptyStageCounts();
  for (const application of applications) {
    counts[application.stage] += 1;
  }
  return counts;
}

/**
 * Recent ATS entries, newest `createdAt` first. Opening title/company come from
 * the CO-T01 list — applications whose opening is missing are dropped rather
 * than given invented metadata.
 */
export function recentMatches(
  applications: ApplicationDto[],
  openings: JobOpeningDto[],
  limit = RECENT_MATCHES_LIMIT,
): RecentMatch[] {
  const openingById = new Map(openings.map((opening) => [opening.openingId, opening]));
  return [...applications]
    .sort((left, right) => {
      const byCreated = right.createdAt.localeCompare(left.createdAt);
      return byCreated !== 0 ? byCreated : right.applicationId.localeCompare(left.applicationId);
    })
    .flatMap((application) => {
      const opening = openingById.get(application.openingId);
      if (!opening) return [];
      return [
        {
          applicationId: application.applicationId,
          studentId: application.studentId,
          studentName: application.studentName ?? `Student ${application.studentId.slice(0, 8)}`,
          openingId: application.openingId,
          roleTitle: opening.roleTitle,
          companyName: opening.companyName,
          stage: application.stage,
          matchScore: application.matchScore,
          createdAt: application.createdAt,
        },
      ];
    })
    .slice(0, limit);
}
