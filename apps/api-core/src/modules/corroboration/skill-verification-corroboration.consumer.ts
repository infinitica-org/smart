import type { OnModuleInit } from '@nestjs/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ACTIVE_TAXONOMY_VERSION,
  AssessmentPerformanceVectorSchema,
  SkillVerificationCompletedEventSchema,
  SMART_TOPICS,
} from '@smart/contracts';
import { runKafkaHandler } from '@smart/observability';
import { env } from '../../platform/config/env.js';
import { KafkaService } from '../../platform/kafka/kafka.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { CorroborationService } from './corroboration.service.js';

/**
 * Pairs assessment ground-truth Y with passive X on skill verification complete.
 *
 * Owner: Ramansh.
 */
@Injectable()
export class SkillVerificationCorroborationConsumer implements OnModuleInit {
  private readonly logger = new Logger(SkillVerificationCorroborationConsumer.name);

  constructor(
    @Inject(KafkaService) private readonly kafka: KafkaService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CorroborationService) private readonly corroboration: CorroborationService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (env.NODE_ENV === 'test') return;
    try {
      await this.kafka.subscribe({
        topic: SMART_TOPICS.skillVerificationCompleted,
        module: 'corroboration',
        handler: async (payload, headers) => {
          await runKafkaHandler(headers, async () => {
            const parsed = SkillVerificationCompletedEventSchema.safeParse(payload);
            if (!parsed.success) {
              this.logger.warn('Ignored malformed skill.verification.completed for corroboration');
              return;
            }

            const event = parsed.data.data;
            if (event.status !== 'VERIFIED') return;

            const attempt = await this.prisma.skillVerificationAttempt.findFirst({
              where: { claimId: event.claimId },
              orderBy: { createdAt: 'desc' },
              include: {
                claim: {
                  include: { skill: { select: { code: true } } },
                },
              },
            });

            if (!attempt) return;

            if (attempt.claim.studentId !== event.userId) {
              this.logger.warn(
                'Rejected skill.verification.completed: claimId does not belong to userId',
              );
              return;
            }

            const skillCode = event.skillCode ?? attempt.claim.skill.code;
            const scorePercent =
              event.scorePercent ??
              (attempt.scorePercent !== null && attempt.scorePercent !== undefined
                ? Number(attempt.scorePercent)
                : undefined);
            const passed = event.passed ?? attempt.passed ?? false;

            if (!skillCode || scorePercent === undefined) return;

            const assessment = AssessmentPerformanceVectorSchema.parse({
              userId: event.userId,
              claimId: event.claimId,
              skillCode,
              assessedAt: parsed.data.meta.occurredAt,
              entries: [
                {
                  dimension: {
                    taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
                    dimensionKey: skillCode,
                    skillCode,
                    proficiencyLevel: attempt.claimedProficiency,
                  },
                  scorePercent,
                  passed,
                  proficiencyLevel: attempt.claimedProficiency,
                },
              ],
            });

            await this.corroboration.fuseWithAssessment(assessment, {
              eventId: parsed.data.meta.eventId,
            });
          });
        },
      });
    } catch (error) {
      this.logger.warn(
        `corroboration verification consumer not started: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
