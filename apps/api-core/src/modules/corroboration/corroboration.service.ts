import { randomUUID } from 'node:crypto';
import {
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  ACTIVE_TAXONOMY_VERSION,
  AdminReviewFlagsQuerySchema,
  AdminReviewFlagsResponseSchema,
  ResolveReviewFlagResponseSchema,
  SMART_TOPICS,
  StudentCorroborationResponseSchema,
  isValidConsentScope,
  type AssessmentPerformanceVector,
  type CorroborationReviewFlag,
  type PassiveSignalSourceId,
  type VectorizedSignal,
} from '@smart/contracts';
import {
  DEFAULT_SIGNAL_WEIGHT_MODEL,
  fuseSignals,
  verifySignalWeightModel,
} from '@smart/scoring-engine';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import { KafkaOutboxService } from '../../platform/kafka/kafka-outbox.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { CorroborationRedisStore } from './corroboration-redis.store.js';
import type { CorroborationAdminActor } from './corroboration.types.js';

export interface FuseWithAssessmentOptions {
  readonly eventId?: string;
}

/**
 * Trust-weighted passive signal fusion. Never writes SkillClaim status.
 *
 * Owner: Ramansh.
 */
@Injectable()
export class CorroborationService {
  readonly owner = 'Ramansh';
  readonly purpose =
    'Fuse passive platform signals with assessment outcomes; flag contradictions for admin review.';

  constructor(
    @Inject(CorroborationRedisStore) private readonly store: CorroborationRedisStore,
    @Inject(KafkaOutboxService) private readonly outbox: KafkaOutboxService,
    @Inject(AuditPublisherService) private readonly auditPublisher: AuditPublisherService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async ingestPassiveSignal(signal: VectorizedSignal): Promise<void> {
    if (!signal.consentScope) {
      throw new ForbiddenException({
        error: 'missing_consent',
        message: 'Passive signal rejected: consentScope is required.',
      });
    }
    if (!isValidConsentScope(signal.sourceId as PassiveSignalSourceId, signal.consentScope)) {
      throw new ForbiddenException({
        error: 'invalid_consent_scope',
        message: `Passive signal rejected: consentScope "${signal.consentScope}" is not allowlisted for ${signal.sourceId}.`,
      });
    }
    await this.store.savePassiveSignal(signal);
    await this.recomputeSnapshot(signal.userId, null);
  }

  async fuseWithAssessment(
    assessment: AssessmentPerformanceVector,
    options: FuseWithAssessmentOptions = {},
  ): Promise<void> {
    if (options.eventId) {
      const claimed = await this.store.tryClaimProcessedEvent(assessment.claimId, options.eventId);
      if (!claimed) return;
    }
    await this.recomputeSnapshot(assessment.userId, assessment);
  }

  async getStudentSnapshot(userId: string) {
    const snapshot = await this.store.getSnapshot(userId);
    if (!snapshot) {
      return StudentCorroborationResponseSchema.parse({
        userId,
        taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
        updatedAt: new Date().toISOString(),
        readouts: [],
        pendingFlagIds: [],
      });
    }
    return StudentCorroborationResponseSchema.parse(snapshot);
  }

  async listReviewFlags(actor: CorroborationAdminActor, query: unknown) {
    const parsed = AdminReviewFlagsQuerySchema.parse(query ?? {});
    const allPending = await this.store.listPendingFlags();
    const scoped = await this.filterFlagsForActor(allPending, actor);
    const total = scoped.length;
    const start = (parsed.page - 1) * parsed.pageSize;
    const flags = scoped.slice(start, start + parsed.pageSize);
    const totalPages = total === 0 ? 0 : Math.ceil(total / parsed.pageSize);
    return AdminReviewFlagsResponseSchema.parse({
      flags,
      meta: {
        page: parsed.page,
        pageSize: parsed.pageSize,
        total,
        totalPages,
      },
    });
  }

  async resolveReviewFlag(actor: CorroborationAdminActor, flagId: string, resolutionNote: string) {
    const flag = await this.store.getFlag(flagId);
    if (!flag || flag.resolvedAt) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Review flag not found or already resolved.',
      });
    }
    await this.assertActorCanAccessFlag(actor, flag);

    const resolved = await this.store.resolveFlag(flagId, resolutionNote);
    if (!resolved) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Review flag not found or already resolved.',
      });
    }

    await this.auditPublisher.record({
      actorId: actor.sub,
      action: 'corroboration.review_flag.resolved',
      resourceType: 'corroboration_review_flag',
      resourceId: flagId,
      reasonCode: null,
      metadata: {
        userId: resolved.userId,
        claimId: resolved.claimId ?? null,
        skillCode: resolved.skillCode,
        resolutionNote,
      },
    });

    return ResolveReviewFlagResponseSchema.parse(resolved);
  }

  private async filterFlagsForActor(
    flags: CorroborationReviewFlag[],
    actor: CorroborationAdminActor,
  ): Promise<CorroborationReviewFlag[]> {
    if (actor.role === 'SUPER_ADMIN') return flags;
    if (!actor.inst) return [];

    return flags.filter((flag) => flag.institutionId === actor.inst);
  }

  private async assertActorCanAccessFlag(
    actor: CorroborationAdminActor,
    flag: CorroborationReviewFlag,
  ): Promise<void> {
    if (actor.role === 'SUPER_ADMIN') return;

    if (!actor.inst) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Institution context required for this action.',
      });
    }

    const institutionId =
      flag.institutionId ??
      (
        await this.prisma.user.findUnique({
          where: { id: flag.userId },
          select: { institutionId: true },
        })
      )?.institutionId;

    if (institutionId !== actor.inst) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'You cannot access review flags for students outside your institution.',
      });
    }
  }

  private async recomputeSnapshot(
    userId: string,
    assessment: AssessmentPerformanceVector | null,
  ): Promise<void> {
    if (!verifySignalWeightModel(DEFAULT_SIGNAL_WEIGHT_MODEL)) {
      throw new InternalServerErrorException({
        error: 'invalid_weight_model',
        message: 'Signal weight model failed integrity check.',
      });
    }

    const passiveX = await this.store.getPassiveSignal(userId);
    const { readouts, contradictionDimensions } = fuseSignals({
      passiveX,
      assessmentY: assessment,
      weights: DEFAULT_SIGNAL_WEIGHT_MODEL,
    });

    const existing = await this.store.getSnapshot(userId);
    const pendingFlagIds = [...(existing?.pendingFlagIds ?? [])];

    if (assessment && contradictionDimensions.length > 0) {
      const institutionId = await this.lookupInstitutionId(userId);

      for (const dimensionKey of contradictionDimensions) {
        const readout = readouts.find((r) => r.dimension.dimensionKey === dimensionKey);
        if (!readout?.contradictionFlag) continue;

        const existingFlagId = await this.store.getPendingFlagIdForClaim(
          assessment.claimId,
          assessment.skillCode,
        );
        if (existingFlagId) {
          if (!pendingFlagIds.includes(existingFlagId)) pendingFlagIds.push(existingFlagId);
          continue;
        }

        const flag: CorroborationReviewFlag = {
          id: randomUUID(),
          userId,
          institutionId,
          claimId: assessment.claimId,
          skillCode: assessment.skillCode,
          severity: readout.passiveScore !== null && readout.passiveScore < 0.1 ? 'HIGH' : 'MEDIUM',
          reason:
            'Assessment passed but passive GitHub/platform signal is far below expected proficiency.',
          passiveScore: readout.passiveScore ?? 0,
          assessmentScore: readout.assessmentScore ?? 0,
          createdAt: new Date().toISOString(),
          resolvedAt: null,
          resolutionNote: null,
        };
        await this.store.saveFlag(flag);
        pendingFlagIds.push(flag.id);

        await this.auditPublisher.record({
          actorId: null,
          action: 'corroboration.review_flag.created',
          resourceType: 'corroboration_review_flag',
          resourceId: flag.id,
          reasonCode: flag.severity,
          metadata: {
            userId,
            claimId: assessment.claimId,
            skillCode: assessment.skillCode,
            passiveScore: flag.passiveScore,
            assessmentScore: flag.assessmentScore,
          },
        });
      }
    }

    const snapshot = {
      userId,
      taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
      updatedAt: new Date().toISOString(),
      readouts: [...readouts],
      pendingFlagIds: [...new Set(pendingFlagIds)],
    };

    await this.store.saveSnapshot(snapshot);

    const shouldEmit = await this.store.tryAcquireOutboxDebounce(userId);
    if (!shouldEmit) return;

    await this.outbox.enqueueEnvelope({
      topic: SMART_TOPICS.corroborationUpdated,
      partitionKey: userId,
      eventType: SMART_TOPICS.corroborationUpdated,
      source: 'corroboration',
      data: snapshot,
    });
  }

  private async lookupInstitutionId(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { institutionId: true },
    });
    return user?.institutionId ?? null;
  }
}
