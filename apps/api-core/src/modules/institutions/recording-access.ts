import { ForbiddenException } from '@nestjs/common';
import type { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';

/**
 * Th6-444 — university staff never get interview recordings by default.
 *
 * There is no recording model or endpoint in the platform yet, and no grant table
 * (recording_access_grants). Until one exists this is default-deny: every caller that will one day
 * serve a recording must go through `canAccessRecording`, and the only place that decides is here.
 */
export interface RecordingRef {
  readonly id: string;
  readonly studentId: string;
}

/** Roles that act for a university and therefore must never see a recording without a grant. */
const UNIVERSITY_ROLES: readonly string[] = ['INSTITUTION_ADMIN', 'PLACEMENT_STAFF'];

export function canAccessRecording(user: RequestUser, recording: RecordingRef): boolean {
  if (!UNIVERSITY_ROLES.includes(user.role)) return recording.studentId === user.sub;
  // TODO: look up an unexpired recording_access_grants row for (recording, user) once that table exists.
  return false;
}

/** Throws 403 and records the denied attempt. Call before serving any recording. */
export async function assertRecordingAccess(
  user: RequestUser,
  recording: RecordingRef,
  audit: Pick<AuditPublisherService, 'record'>,
  source: string,
): Promise<void> {
  if (canAccessRecording(user, recording)) return;
  await audit.record({
    actorId: user.sub,
    action: 'university.recording_access_denied',
    resourceType: 'interview_recording',
    resourceId: recording.id,
    reasonCode: 'NO_GRANT',
    metadata: { orgId: user.inst, studentId: recording.studentId, source },
  });
  throw new ForbiddenException({
    error: 'recording_access_denied',
    message: 'Interview recordings are not available without an explicit grant.',
    statusCode: 403,
  });
}

const RECORDING_KEY = /recording/i;

/** Defence in depth: removes any recording-related key from a university-facing payload. */
export function stripRecordingFields<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => stripRecordingFields(item)) as T;
  if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !RECORDING_KEY.test(key))
        .map(([key, item]) => [key, stripRecordingFields(item)]),
    ) as T;
  }
  return value;
}
