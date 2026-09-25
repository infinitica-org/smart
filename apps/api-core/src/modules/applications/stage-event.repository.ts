import { Inject, Injectable } from '@nestjs/common';
import { toApplicationStatus, type ActorType, type AtsStage } from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

export interface StageEventInput {
  readonly applicationId: string;
  /** The organisation that owns the application: the company, or the institution for university postings. */
  readonly orgId: string;
  readonly fromStage: AtsStage | null;
  readonly toStage: AtsStage;
  readonly actorId: string | null;
  readonly actorType: ActorType;
  readonly note?: string | null;
  /** apply, shortlist, employer_board, student_withdraw, tpo_board, ... */
  readonly source: string;
}

/**
 * Th6-418 — the transition log. APPEND-ONLY by construction: the only write is `append`, and there is
 * no update or delete method here or anywhere else. HiringService is the only caller; a test scans the
 * source to keep it that way, and the database rejects UPDATE on the table.
 */
@Injectable()
export class ApplicationStageEventRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Adds one event inside the caller's transaction. */
  append(tx: Prisma.TransactionClient, input: StageEventInput) {
    return tx.applicationStageEvent.create({
      data: {
        applicationId: input.applicationId,
        orgId: input.orgId,
        fromStage: input.fromStage,
        toStage: input.toStage,
        fromStatus: input.fromStage ? toApplicationStatus(input.fromStage) : null,
        toStatus: toApplicationStatus(input.toStage),
        actorId: input.actorId,
        actorType: input.actorType,
        note: input.note ?? null,
        source: input.source,
      },
    });
  }

  /** Oldest first. */
  listForApplication(applicationId: string) {
    return this.prisma.applicationStageEvent.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
