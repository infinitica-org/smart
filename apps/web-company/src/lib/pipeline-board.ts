import {
  APPLICATION_STATUSES,
  EMPLOYER_APPLICATION_STATUS_LABELS,
  allowedNextStatuses,
  canTransition,
  type ApplicationStatus,
  type EmployerApplicantCard,
} from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';

/**
 * Pipeline board logic (Th6-414). Which columns exist and which moves are offered comes from the shared
 * `pipeline` module, the same one the API enforces, so the board can never offer a move the server refuses.
 */

/** Board columns, in pipeline order. */
export const BOARD_COLUMNS: readonly ApplicationStatus[] = APPLICATION_STATUSES;

export function groupByStatus(
  applicants: readonly EmployerApplicantCard[],
): Record<ApplicationStatus, EmployerApplicantCard[]> {
  const groups = Object.fromEntries(
    BOARD_COLUMNS.map((status) => [status, []]),
  ) as unknown as Record<ApplicationStatus, EmployerApplicantCard[]>;
  for (const applicant of applicants) groups[applicant.status].push(applicant);
  return groups;
}

/** The columns a dragged card may be dropped on (highlighted while dragging). */
export function dropTargets(applicant: Pick<EmployerApplicantCard, 'status'>): ApplicationStatus[] {
  // Employers never withdraw an applicant, so WITHDRAWN is never a drop target.
  return allowedNextStatuses(applicant.status, 'EMPLOYER');
}

export function canDrop(
  applicant: Pick<EmployerApplicantCard, 'status'>,
  to: ApplicationStatus,
): boolean {
  return canTransition(applicant.status, to, 'EMPLOYER');
}

/** The board's optimistic update: the card jumps to its new column before the server answers. */
export function moveApplicant(
  applicants: readonly EmployerApplicantCard[],
  applicationId: string,
  to: ApplicationStatus,
): EmployerApplicantCard[] {
  return applicants.map((applicant) =>
    applicant.applicationId === applicationId
      ? {
          ...applicant,
          status: to,
          statusLabel: EMPLOYER_APPLICATION_STATUS_LABELS[to],
          allowedNext: allowedNextStatuses(to, 'EMPLOYER'),
        }
      : applicant,
  );
}

export type MoveFailure =
  | { kind: 'conflict'; message: string }
  | { kind: 'not_allowed'; message: string }
  | { kind: 'other'; message: string };

/** Turns a failed move into the toast text: 409 means someone else moved it, 422 means the rules refused. */
export function describeMoveFailure(error: unknown): MoveFailure {
  if (isSmartApiError(error)) {
    if (error.statusCode === 409) {
      return {
        kind: 'conflict',
        message:
          error.message || 'Someone else just moved this candidate. The board was refreshed.',
      };
    }
    if (error.statusCode === 422) {
      return { kind: 'not_allowed', message: error.message || 'That move is not allowed.' };
    }
  }
  return { kind: 'other', message: 'Could not move the candidate. Please try again.' };
}
