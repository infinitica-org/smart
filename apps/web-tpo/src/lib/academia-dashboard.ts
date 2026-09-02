import {
  ATS_STAGES,
  SKILL_CLAIM_STATUSES,
  type ApplicationDto,
  type AtsStage,
  type BatchDto,
  type InstitutionStudentDto,
  type SkillClaimDto,
  type SkillClaimStatus,
} from '@smart/contracts';

export const PIPELINE_LABELS: Record<AtsStage, string> = {
  APPLIED: 'Applied',
  SHORTLISTED: 'Shortlisted',
  INTERVIEW: 'Interviewing',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

export type InviteSnapshot = {
  total: number;
  accepted: number;
  pending: number;
  expired: number;
  revoked: number;
  none: number;
  held: number;
};

export function emptyStageCounts(): Record<AtsStage, number> {
  return {
    APPLIED: 0,
    SHORTLISTED: 0,
    INTERVIEW: 0,
    OFFER: 0,
    REJECTED: 0,
    WITHDRAWN: 0,
  };
}

export function countApplicationsByStage(applications: ApplicationDto[]): Record<AtsStage, number> {
  const counts = emptyStageCounts();
  for (const application of applications) {
    counts[application.stage] += 1;
  }
  return counts;
}

export function emptySkillClaimCounts(): Record<SkillClaimStatus, number> {
  return {
    DECLARED: 0,
    VERIFIED: 0,
    BEGINNER_REATTEMPT: 0,
    LOCKED: 0,
  };
}

export function countSkillClaimsByStatus(
  claims: SkillClaimDto[],
): Record<SkillClaimStatus, number> {
  const counts = emptySkillClaimCounts();
  for (const claim of claims) {
    counts[claim.status] += 1;
  }
  return counts;
}

export function countInviteSnapshot(students: InstitutionStudentDto[]): InviteSnapshot {
  const snapshot: InviteSnapshot = {
    total: students.length,
    accepted: 0,
    pending: 0,
    expired: 0,
    revoked: 0,
    none: 0,
    held: 0,
  };
  for (const student of students) {
    if (student.heldAt) snapshot.held += 1;
    switch (student.inviteStatus) {
      case 'ACCEPTED':
        snapshot.accepted += 1;
        break;
      case 'PENDING':
        snapshot.pending += 1;
        break;
      case 'EXPIRED':
        snapshot.expired += 1;
        break;
      case 'REVOKED':
        snapshot.revoked += 1;
        break;
      default:
        snapshot.none += 1;
    }
  }
  return snapshot;
}

export function pipelineStages(): readonly AtsStage[] {
  return ATS_STAGES;
}

export function skillClaimStatuses(): readonly SkillClaimStatus[] {
  return SKILL_CLAIM_STATUSES;
}

export function sortBatchesByName(batches: BatchDto[]): BatchDto[] {
  return [...batches].sort((left, right) => left.name.localeCompare(right.name));
}
