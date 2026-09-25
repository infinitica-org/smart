import type { AtsStage } from './enums.js';
import {
  EMPLOYER_APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
} from './application-status.js';

/**
 * APP-02 (Th6-415) — the ONE definition of how an application may move between statuses. The API
 * (hiringService) and every UI (pipeline board, status dropdown) import this file, so a move the UI
 * offers is exactly a move the server accepts.
 *
 * The database keeps the finer `AtsStage` the university board already uses; statuses are how the
 * hiring pipeline reasons about it (SHORTLISTED and AI_VERIFIED are both REVIEWING).
 */

/** Who is making the change. INSTITUTION is the university's own board, which keeps its own rules. */
export const ACTOR_TYPES = ['EMPLOYER', 'STUDENT', 'SYSTEM', 'INSTITUTION'] as const;
export type ActorType = (typeof ACTOR_TYPES)[number];

/** Forward moves and rejection. WITHDRAWN is separate: only the student can do it. */
export const ALLOWED_TRANSITIONS: Readonly<
  Record<ApplicationStatus, readonly ApplicationStatus[]>
> = {
  APPLIED: ['REVIEWING', 'REJECTED'],
  REVIEWING: ['INTERVIEWING', 'REJECTED'],
  INTERVIEWING: ['OFFERED', 'REJECTED'],
  OFFERED: ['HIRED', 'REJECTED'],
  HIRED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

const TERMINAL_STATUSES: readonly ApplicationStatus[] = ['HIRED', 'REJECTED', 'WITHDRAWN'];

export function isTerminal(status: ApplicationStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * Whether `actorType` may move an application from `from` to `to`.
 * - Employers and the system: the forward path and rejection in ALLOWED_TRANSITIONS.
 * - Students: only withdrawing, and only while the application is not finished.
 * - Anything out of a terminal status, or to the same status, is refused.
 */
export function canTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
  actorType: ActorType,
): boolean {
  if (isTerminal(from) || from === to) return false;
  if (to === 'WITHDRAWN') return actorType === 'STUDENT';
  if (actorType === 'STUDENT') return false;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** The statuses this actor may move an application to right now (drives drop targets and dropdowns). */
export function allowedNextStatuses(
  from: ApplicationStatus,
  actorType: ActorType,
): ApplicationStatus[] {
  const candidates: ApplicationStatus[] = [...ALLOWED_TRANSITIONS[from], 'WITHDRAWN'];
  return candidates.filter((to) => canTransition(from, to, actorType));
}

/** Plain-language refusal, e.g. "Can't move from Applied to Offered". */
export function transitionErrorMessage(from: ApplicationStatus, to: ApplicationStatus): string {
  if (isTerminal(from)) {
    return `This application is ${EMPLOYER_APPLICATION_STATUS_LABELS[from].toLowerCase()} and can no longer be moved.`;
  }
  if (from === to) return `It is already ${EMPLOYER_APPLICATION_STATUS_LABELS[from]}.`;
  return `Can't move from ${EMPLOYER_APPLICATION_STATUS_LABELS[from]} to ${EMPLOYER_APPLICATION_STATUS_LABELS[to]}`;
}

/** The stored stage that represents a status (REVIEWING is stored as SHORTLISTED). */
export const STAGE_FOR_STATUS: Readonly<Record<ApplicationStatus, AtsStage>> = {
  APPLIED: 'APPLIED',
  REVIEWING: 'SHORTLISTED',
  INTERVIEWING: 'INTERVIEW',
  OFFERED: 'OFFER',
  HIRED: 'HIRED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
};

/** Every stored stage that counts as this status (used to guard a conditional update). */
export const STAGES_FOR_STATUS: Readonly<Record<ApplicationStatus, readonly AtsStage[]>> = {
  APPLIED: ['APPLIED'],
  REVIEWING: ['SHORTLISTED', 'AI_VERIFIED'],
  INTERVIEWING: ['INTERVIEW'],
  OFFERED: ['OFFER'],
  HIRED: ['HIRED'],
  REJECTED: ['REJECTED'],
  WITHDRAWN: ['WITHDRAWN'],
};
