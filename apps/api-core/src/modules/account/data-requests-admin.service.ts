import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  DSR_SLA_CLOSE_DAYS,
  DSR_SLA_FIRST_RESPONSE_DAYS,
  type AdminDataRequestDto,
  type ListAdminDataRequestsQuery,
} from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import { env } from '../../platform/config/env.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { toDataRequest } from './account.service.js';

const DAY_MS = 86_400_000;
const WITH_USER = { user: { select: { email: true, fullName: true } } } as const;
type RequestRow = Prisma.DataSubjectRequestGetPayload<{ include: typeof WITH_USER }>;
type Outcome = 'COMPLETED' | 'REJECTED';

const STUDENT_MESSAGE: Record<'IN_REVIEW' | Outcome, string> = {
  IN_REVIEW: 'We have started working on your data request.',
  COMPLETED: 'Your data request has been completed.',
  REJECTED: 'Your data request was declined.',
};

/**
 * S6-VV-116 (#559) — the admin side of data-subject requests. OPEN → IN_REVIEW → COMPLETED or
 * REJECTED. Finished requests never change again. Exports complete themselves (S6-VV-115), and a
 * DELETION is carried out by the erasure job (S6-VV-117), so neither is completed by hand here.
 */
@Injectable()
export class DataRequestsAdminService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditPublisherService) private readonly auditPublisher: AuditPublisherService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  async list(query: ListAdminDataRequestsQuery = {}): Promise<AdminDataRequestDto[]> {
    const rows = await this.prisma.dataSubjectRequest.findMany({
      where: {
        ...(query.type ? { type: query.type } : {}),
        ...(query.status
          ? { status: query.status }
          : query.openOnly === false
            ? {}
            : { status: { in: ['OPEN', 'IN_REVIEW'] } }),
      },
      include: WITH_USER,
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    return rows.map(toAdminDto);
  }

  async get(requestId: string): Promise<AdminDataRequestDto> {
    return toAdminDto(await this.require(requestId));
  }

  async startReview(requestId: string, actorId: string): Promise<AdminDataRequestDto> {
    const request = await this.require(requestId);
    this.assertHandledByAdmin(request);
    if (request.status !== 'OPEN') {
      throw conflict('not_open', 'Only an open request can move into review.');
    }
    return this.transition(request, actorId, 'IN_REVIEW', null);
  }

  async resolve(
    requestId: string,
    actorId: string,
    outcome: Outcome,
    note: string,
  ): Promise<AdminDataRequestDto> {
    const request = await this.require(requestId);
    this.assertHandledByAdmin(request);
    if (request.status === 'COMPLETED' || request.status === 'REJECTED') {
      throw conflict('already_resolved', 'This request is already closed and cannot change.');
    }
    if (outcome === 'COMPLETED' && request.type === 'DELETION') {
      throw conflict(
        'use_erasure',
        'Deletion requests are completed by running the erasure, not by hand.',
      );
    }
    return this.transition(request, actorId, outcome, note);
  }

  private async transition(
    request: RequestRow,
    actorId: string,
    status: 'IN_REVIEW' | Outcome,
    note: string | null,
  ): Promise<AdminDataRequestDto> {
    const now = new Date();
    const closing = status !== 'IN_REVIEW';
    // Conditional on the prior status, so two admins acting at once can't both win.
    const { count } = await this.prisma.dataSubjectRequest.updateMany({
      where: { id: request.id, status: request.status },
      data: {
        status,
        firstRespondedAt: request.firstRespondedAt ?? now,
        ...(closing ? { resolvedAt: now, resolution: note, resolvedById: actorId } : {}),
      },
    });
    if (count === 0) throw conflict('changed', 'Someone else just updated this request. Reload.');

    await this.auditPublisher.record({
      actorId,
      action: `data_request.${status.toLowerCase()}`,
      resourceType: 'data_subject_request',
      resourceId: request.id,
      reasonCode: note,
      metadata: { userId: request.userId, type: request.type, prior: request.status, next: status },
    });
    await this.notifications.notify({
      userId: request.userId,
      kind: 'ACCOUNT',
      title: STUDENT_MESSAGE[status],
      body: note ?? 'You can follow it in Settings → Your data.',
      linkUrl: `${env.STUDENT_APP_URL}/settings`,
      dedupeKey: `dsr:${request.id}:${status}`,
    });
    return this.get(request.id);
  }

  private assertHandledByAdmin(request: RequestRow): void {
    if (request.type === 'EXPORT') {
      throw conflict('automatic', 'Exports are fulfilled automatically.');
    }
  }

  private async require(requestId: string): Promise<RequestRow> {
    const row = await this.prisma.dataSubjectRequest.findUnique({
      where: { id: requestId },
      include: WITH_USER,
    });
    if (!row) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Data request not found.',
        statusCode: 404,
      });
    }
    return row;
  }
}

function conflict(error: string, message: string): ConflictException {
  return new ConflictException({ error, message, statusCode: 409 });
}

export function toAdminDto(row: RequestRow, now = Date.now()): AdminDataRequestDto {
  const respondBy = new Date(row.createdAt.getTime() + DSR_SLA_FIRST_RESPONSE_DAYS * DAY_MS);
  const closeBy = new Date(row.createdAt.getTime() + DSR_SLA_CLOSE_DAYS * DAY_MS);
  const open = row.status === 'OPEN' || row.status === 'IN_REVIEW';
  const slaState =
    open && now > closeBy.getTime()
      ? 'close_overdue'
      : !row.firstRespondedAt && open && now > respondBy.getTime()
        ? 'response_overdue'
        : 'on_track';
  return {
    ...toDataRequest(row),
    userId: row.userId,
    userEmail: row.user.email,
    userFullName: row.user.fullName,
    firstRespondedAt: row.firstRespondedAt?.toISOString() ?? null,
    respondBy: respondBy.toISOString(),
    closeBy: closeBy.toISOString(),
    slaState,
  };
}
