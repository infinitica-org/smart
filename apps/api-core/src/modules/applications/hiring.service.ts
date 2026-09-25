import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ApplicationStageChangedDataSchema,
  EMPLOYER_APPLICATION_STATUS_LABELS,
  SMART_TOPICS,
  STAGE_FOR_STATUS,
  allowedNextStatuses,
  canTransition,
  toApplicationStatus,
  transitionErrorMessage,
  type ActorType,
  type ApplicationStatus,
  type AtsStage,
  type TransitionApplicationResponse,
} from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import { KafkaOutboxService } from '../../platform/kafka/kafka-outbox.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { IdempotencyService } from '../company-profile/idempotency.service.js';
import { ApplicationStageEventRepository, type StageEventInput } from './stage-event.repository.js';

export interface TransitionActor {
  readonly type: ActorType;
  readonly id: string;
  /** Required for EMPLOYER: the caller's company, used to scope the application. */
  readonly companyId?: string | null;
}

export interface TransitionParams {
  readonly applicationId: string;
  readonly toStatus: ApplicationStatus;
  /** What the caller last saw. A different current status is a 409. */
  readonly expectedFromStatus: ApplicationStatus;
  readonly note?: string;
  readonly actor: TransitionActor;
  readonly idempotencyKey: string;
  readonly source: string;
}

const STUDENT_ROW_SELECT = {
  fullName: true,
  email: true,
  primaryTrack: { select: { code: true } },
} as const;

function notFound() {
  return new NotFoundException({
    error: 'not_found',
    message: 'Application not found.',
    statusCode: 404,
  });
}

/** The organisation that owns an opening's applications. */
export function orgIdOf(opening: { companyId: string | null; institutionId: string }): string {
  return opening.companyId ?? opening.institutionId;
}

/**
 * Th6-414/418 — the ONLY place that moves an application between stages and the ONLY writer of stage
 * events. Every path (employer board, student withdraw, the university's board, apply and shortlist)
 * ends up here, so history, audit rows and the single status-changed event are never skipped.
 */
@Injectable()
export class HiringService {
  private readonly events: ApplicationStageEventRepository;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(IdempotencyService) private readonly idempotency: IdempotencyService,
    @Inject(KafkaOutboxService) private readonly outbox: KafkaOutboxService,
    events?: ApplicationStageEventRepository,
  ) {
    this.events = events ?? new ApplicationStageEventRepository(prisma);
  }

  /** Records a creation event (apply, shortlist) inside the caller's transaction. */
  appendEvent(tx: Prisma.TransactionClient, input: StageEventInput) {
    return this.events.append(tx, input);
  }

  /* --------------------------------- employer / student moves --------------------------------- */

  /**
   * Moves an application to another status in ONE transaction: ownership check, stale check (409),
   * rule check (422), conditional update, history event and audit row. The status-changed event goes
   * out after commit, so the student gets exactly one notification. Same idempotency key = same result.
   */
  async transition(params: TransitionParams): Promise<TransitionApplicationResponse> {
    return this.idempotency.run({
      userId: params.actor.id,
      scope: `hiring.transition:${params.applicationId}`,
      key: params.idempotencyKey,
      request: {
        toStatus: params.toStatus,
        expectedFromStatus: params.expectedFromStatus,
        note: params.note ?? null,
      },
      execute: async (tx) => {
        const application = await tx.application.findUnique({
          where: { id: params.applicationId },
          include: { opening: { select: { companyId: true, institutionId: true } } },
        });
        // Someone else's application is indistinguishable from a missing one.
        if (
          !application ||
          (params.actor.type === 'EMPLOYER' &&
            (!params.actor.companyId ||
              application.opening.companyId !== params.actor.companyId)) ||
          (params.actor.type === 'STUDENT' && application.studentId !== params.actor.id)
        ) {
          throw notFound();
        }

        const fromStage = application.stage as AtsStage;
        const from = toApplicationStatus(fromStage);
        if (from !== params.expectedFromStatus) {
          throw new ConflictException({
            error: 'stale_status',
            message: `This application is now ${EMPLOYER_APPLICATION_STATUS_LABELS[from]}. Refresh and try again.`,
            statusCode: 409,
            currentStatus: from,
          });
        }
        if (!canTransition(from, params.toStatus, params.actor.type)) {
          throw new UnprocessableEntityException({
            error: 'transition_not_allowed',
            message: transitionErrorMessage(from, params.toStatus),
            statusCode: 422,
            details: [{ path: 'toStatus', message: transitionErrorMessage(from, params.toStatus) }],
          });
        }

        const toStage = STAGE_FOR_STATUS[params.toStatus];
        // Conditional update: it only applies if nobody moved the application since we read it.
        const updated = await tx.application.updateMany({
          where: { id: params.applicationId, stage: fromStage },
          data: { stage: toStage },
        });
        if (updated.count === 0) {
          throw new ConflictException({
            error: 'stale_status',
            message: 'This application was just moved by someone else. Refresh and try again.',
            statusCode: 409,
          });
        }

        const orgId = orgIdOf(application.opening);
        const event = await this.events.append(tx, {
          applicationId: application.id,
          orgId,
          fromStage,
          toStage,
          actorId: params.actor.id,
          actorType: params.actor.type,
          note: params.note ?? null,
          source: params.source,
        });
        await tx.auditLog.create({
          data: {
            actorId: params.actor.id,
            action: 'application.status_changed',
            resourceType: 'application',
            resourceId: application.id,
            metadata: {
              orgId,
              source: params.source,
              actorType: params.actor.type,
              before: { status: from },
              after: { status: params.toStatus },
              note: params.note ?? null,
              at: event.createdAt.toISOString(),
            },
          },
        });

        return {
          result: {
            applicationId: application.id,
            fromStatus: from,
            toStatus: params.toStatus,
            statusLabel: EMPLOYER_APPLICATION_STATUS_LABELS[params.toStatus],
            allowedNext: allowedNextStatuses(params.toStatus, params.actor.type),
            changedAt: event.createdAt.toISOString(),
          },
          afterCommit: () =>
            this.publishStatusChanged(
              {
                id: application.id,
                openingId: application.openingId,
                studentId: application.studentId,
                createdAt: application.createdAt,
                updatedAt: event.createdAt,
              },
              fromStage,
              toStage,
            ),
        };
      },
    });
  }

  /* ------------------------------------ the university's board ------------------------------------ */

  /**
   * The university's own stage moves. Its board keeps its own (looser) rules, so `canTransition` is not
   * applied, but the history, audit and event still come from here. A withdrawn application cannot move.
   */
  async moveInstitutionStage(params: {
    applicationId: string;
    toStage: AtsStage;
    actorId: string | null;
    institutionId?: string;
    note?: string | null;
  }) {
    const before = await this.prisma.application.findUnique({
      where: { id: params.applicationId },
      include: {
        opening: { select: { institutionId: true, companyId: true } },
        student: { select: STUDENT_ROW_SELECT },
      },
    });
    if (
      !before ||
      (params.institutionId && before.opening.institutionId !== params.institutionId)
    ) {
      throw notFound();
    }
    const fromStage = before.stage as AtsStage;
    const orgId = orgIdOf(before.opening);
    if (fromStage === params.toStage) {
      return { row: before, fromStage, changed: false };
    }
    if (fromStage === 'WITHDRAWN') {
      throw new ConflictException({
        error: 'application_withdrawn',
        message: 'This application was withdrawn by the student and cannot be moved.',
        statusCode: 409,
      });
    }

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id: params.applicationId },
        data: { stage: params.toStage },
        include: { student: { select: STUDENT_ROW_SELECT } },
      });
      await this.appendMove(tx, {
        applicationId: params.applicationId,
        orgId,
        fromStage,
        toStage: params.toStage,
        actorId: params.actorId,
        actorType: params.actorId ? 'INSTITUTION' : 'SYSTEM',
        note: params.note ?? null,
        source: 'tpo_board',
      });
      return updated;
    });
    await this.publishStatusChanged(row, fromStage, params.toStage);
    return { row, fromStage, changed: true };
  }

  /** History + audit for a move that has already been applied to the application row. */
  private async appendMove(tx: Prisma.TransactionClient, input: StageEventInput): Promise<void> {
    await this.events.append(tx, input);
    await tx.auditLog.create({
      data: {
        actorId: input.actorId,
        action: 'application.status_changed',
        resourceType: 'application',
        resourceId: input.applicationId,
        reasonCode: input.note ?? null,
        metadata: {
          orgId: input.orgId,
          source: input.source,
          actorType: input.actorType,
          before: { stage: input.fromStage },
          after: { stage: input.toStage },
        },
      },
    });
  }

  /** `application.status_changed`: the consumer turns it into one in-app + email notification. */
  async publishStatusChanged(
    row: { id: string; openingId: string; studentId: string; updatedAt: Date; createdAt: Date },
    fromStage: AtsStage | null,
    toStage: AtsStage,
  ): Promise<void> {
    await this.outbox.enqueueEnvelope({
      topic: SMART_TOPICS.applicationStageChanged,
      partitionKey: row.id,
      eventType: SMART_TOPICS.applicationStageChanged,
      source: 'applications',
      data: ApplicationStageChangedDataSchema.parse({
        applicationId: row.id,
        openingId: row.openingId,
        studentId: row.studentId,
        fromStage,
        toStage,
        changedAt: (fromStage === null ? row.createdAt : row.updatedAt).toISOString(),
      }),
    });
  }
}
