import type { AtsStage } from './enums.js';

/**
 * APP-01 — the ONE mapping from the stored pipeline stage (AtsStage) to the status names students and
 * employers see. Th6-419 (the employer pipeline board) reuses this file. Internal fields never travel
 * with it: only the status code and its label are exposed.
 *
 * SHORTLISTED and AI_VERIFIED are both "under review": the student-facing flow has one review step,
 * while the university's own board keeps its finer stages.
 */

export const APPLICATION_STATUSES = [
  'APPLIED',
  'REVIEWING',
  'INTERVIEWING',
  'OFFERED',
  'HIRED',
  'REJECTED',
  'WITHDRAWN',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABELS: Readonly<Record<ApplicationStatus, string>> = {
  APPLIED: 'Submitted',
  REVIEWING: 'Under review',
  INTERVIEWING: 'Interviewing',
  OFFERED: 'Offer',
  HIRED: 'Hired',
  REJECTED: 'Not selected',
  WITHDRAWN: 'Withdrawn',
};

/** Employers see the pipeline as it is, not the softened student wording. */
export const EMPLOYER_APPLICATION_STATUS_LABELS: Readonly<Record<ApplicationStatus, string>> = {
  APPLIED: 'Applied',
  REVIEWING: 'Reviewing',
  INTERVIEWING: 'Interviewing',
  OFFERED: 'Offered',
  HIRED: 'Hired',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

const STATUS_BY_STAGE: Readonly<Record<AtsStage, ApplicationStatus>> = {
  APPLIED: 'APPLIED',
  SHORTLISTED: 'REVIEWING',
  AI_VERIFIED: 'REVIEWING',
  INTERVIEW: 'INTERVIEWING',
  OFFER: 'OFFERED',
  HIRED: 'HIRED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
};

export function toApplicationStatus(stage: AtsStage): ApplicationStatus {
  return STATUS_BY_STAGE[stage];
}

export function studentStatusLabel(stage: AtsStage): string {
  return APPLICATION_STATUS_LABELS[toApplicationStatus(stage)];
}

/** Stages after which an application can no longer be withdrawn (or, for WITHDRAWN, moved). */
export const CLOSED_APPLICATION_STAGES: readonly AtsStage[] = ['HIRED', 'REJECTED', 'WITHDRAWN'];

export function canWithdrawFromStage(stage: AtsStage): boolean {
  return stage !== 'HIRED' && stage !== 'REJECTED' && stage !== 'WITHDRAWN';
}

/** Order used to sort by status: earlier in the pipeline first. */
export const APPLICATION_STATUS_RANK: Readonly<Record<ApplicationStatus, number>> = {
  APPLIED: 0,
  REVIEWING: 1,
  INTERVIEWING: 2,
  OFFERED: 3,
  HIRED: 4,
  REJECTED: 5,
  WITHDRAWN: 6,
};

/** Stable public reference for an application (derived from its id, never guessable from it alone). */
export function applicationReference(applicationId: string): string {
  return `APP-${applicationId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}
