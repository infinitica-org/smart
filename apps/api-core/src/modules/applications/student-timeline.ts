import {
  studentStatusLabel,
  toApplicationStatus,
  type AtsStage,
  type StudentApplicationDetail,
} from '@smart/contracts';

/** The only fields of a stage event the student timeline is allowed to see. */
export const STUDENT_TIMELINE_EVENT_SELECT = { toStage: true, createdAt: true } as const;

/**
 * Th6-419 — the student sees only externally shareable status changes: what the status became and when.
 * Internal notes, recruiter assignment, outcome records, the actor and the employer's transition note
 * live elsewhere and are never selected here. Steps the student cannot tell apart (SHORTLISTED then
 * AI_VERIFIED are both "Under review") collapse to one entry.
 */
export function studentTimeline(
  events: readonly { toStage: string; createdAt: Date }[],
): StudentApplicationDetail['timeline'] {
  const timeline: StudentApplicationDetail['timeline'] = [];
  for (const event of events) {
    const status = toApplicationStatus(event.toStage as AtsStage);
    if (timeline.at(-1)?.status === status) continue;
    timeline.push({
      status,
      statusLabel: studentStatusLabel(event.toStage as AtsStage),
      at: event.createdAt.toISOString(),
    });
  }
  return timeline;
}
