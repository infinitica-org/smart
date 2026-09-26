import { ForbiddenException } from '@nestjs/common';
import type { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import type { PrismaService } from '../../platform/prisma/prisma.service.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';

/**
 * Th6-444 — university staff never get interview recordings by default.
 *
 * Default-deny: a university user gets a recording only through an unexpired, unrevoked
 * `recording_access_grants` row naming them and that recording. Every caller that serves a recording
 * must go through `canAccessRecording`; it is the only place that decides.
 */
export interface RecordingRef {
  readonly id: string;
  readonly studentId: string;
}

/** Roles that act for a university and therefore must never see a recording without a grant. */
const UNIVERSITY_ROLES: readonly string[] = ['INSTITUTION_ADMIN', 'PLACEMENT_STAFF'];

export async function canAccessRecording(
  user: RequestUser,
  recording: RecordingRef,
  prisma: Pick<PrismaService, 'recordingAccessGrant'>,
): Promise<boolean> {
  if (!UNIVERSITY_ROLES.includes(user.role)) return recording.studentId === user.sub;
  const grant = await prisma.recordingAccessGrant.findFirst({
    where: {
      recordingId: recording.id,
      studentId: recording.studentId,
      grantedToUserId: user.sub,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });
  return grant !== null;
}

/** Throws 403 and records the denied attempt. Call before serving any recording. */
export async function assertRecordingAccess(
  user: RequestUser,
  recording: RecordingRef,
  deps: {
    prisma: Pick<PrismaService, 'recordingAccessGrant'>;
    audit: Pick<AuditPublisherService, 'record'>;
  },
  source: string,
): Promise<void> {
  if (await canAccessRecording(user, recording, deps.prisma)) return;
  const { audit } = deps;
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
