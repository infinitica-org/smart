import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { NotificationKind } from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';

/** UNI-05 — helpers shared by the campus-access and career-event services. */

export type Db = Prisma.TransactionClient;

export interface StaffScope {
  readonly userId: string;
  readonly institutionId: string;
  readonly role: 'INSTITUTION_ADMIN' | 'PLACEMENT_STAFF';
}

export function forbidden(message = 'You do not have permission to perform this action.') {
  return new ForbiddenException({ error: 'forbidden', message, statusCode: 403 });
}

export function notFound(message = 'Not found.') {
  return new NotFoundException({ error: 'not_found', message, statusCode: 404 });
}

export function unprocessable(error: string, message: string, path?: string) {
  return new UnprocessableEntityException({
    error,
    message,
    statusCode: 422,
    ...(path ? { details: [{ path, message }] } : {}),
  });
}

/** The caller's own institution, from the verified JWT. Anyone else is a 403. */
export function staffScope(
  user: RequestUser,
  allowed: readonly StaffScope['role'][] = ['INSTITUTION_ADMIN', 'PLACEMENT_STAFF'],
): StaffScope {
  const role = user.role as StaffScope['role'];
  if (!user.inst || !allowed.includes(role)) throw forbidden();
  return { userId: user.sub, institutionId: user.inst, role };
}

export function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === 'P2002';
}

export interface InAppNotice {
  readonly userId: string;
  readonly kind: NotificationKind;
  readonly title: string;
  readonly body: string;
  readonly linkUrl?: string;
  /** The notification is created at most once per key, so a retry can never notify twice. */
  readonly dedupeKey: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Writes in-app notifications inside the caller's transaction. `skipDuplicates` on the unique dedupe
 * key makes a repeated call a no-op.
 * TODO(UNI-05): email delivery is not wired for these notices; in-app only.
 */
export async function createNotices(tx: Db, notices: readonly InAppNotice[]): Promise<void> {
  if (notices.length === 0) return;
  await tx.notification.createMany({
    data: notices.map((notice) => ({
      userId: notice.userId,
      kind: notice.kind,
      title: notice.title,
      body: notice.body,
      linkUrl: notice.linkUrl ?? null,
      dedupeKey: notice.dedupeKey,
      metadata: (notice.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    })),
    skipDuplicates: true,
  });
}

/** One audit row per state change: actor, org, source, prior and new state. */
export async function writeAudit(
  tx: Db,
  params: {
    actorId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    orgId: string;
    reason?: string | null;
    before: unknown;
    after: unknown;
  },
): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      reasonCode: params.reason ? 'reason_given' : null,
      metadata: {
        orgId: params.orgId,
        source: 'api',
        reason: params.reason ?? null,
        before: params.before,
        after: params.after,
      } as Prisma.InputJsonValue,
    },
  });
}
