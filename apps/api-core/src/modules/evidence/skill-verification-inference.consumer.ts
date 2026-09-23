import type { OnModuleInit } from '@nestjs/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { SkillVerificationCompletedEventSchema, SMART_TOPICS } from '@smart/contracts';
import { runKafkaHandler } from '@smart/observability';
import { env } from '../../platform/config/env.js';
import { KafkaService } from '../../platform/kafka/kafka.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { EvidenceSkillInferenceService } from './evidence-skill-inference.service.js';

/**
 * Recomputes evidence-fused skill inference when verification completes (SKL-02 / I311).
 */
@Injectable()
export class SkillVerificationInferenceConsumer implements OnModuleInit {
  private readonly logger = new Logger(SkillVerificationInferenceConsumer.name);

  constructor(
    @Inject(KafkaService) private readonly kafka: KafkaService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EvidenceSkillInferenceService)
    private readonly skillInference: EvidenceSkillInferenceService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (env.NODE_ENV === 'test') return;
    try {
      await this.kafka.subscribe({
        topic: SMART_TOPICS.skillVerificationCompleted,
        module: 'evidence',
        handler: async (payload, headers) => {
          await runKafkaHandler(headers, async () => {
            const parsed = SkillVerificationCompletedEventSchema.safeParse(payload);
            if (!parsed.success) {
              this.logger.warn('Ignored malformed skill.verification.completed for inference');
              return;
            }

            const event = parsed.data.data;
            const claim = await this.prisma.skillClaim.findUnique({
              where: { id: event.claimId },
              include: { skill: { select: { code: true } } },
            });
            if (!claim || claim.studentId !== event.userId) return;

            await this.skillInference.recomputeForSkill(claim.studentId, claim.skill.code);
          });
        },
      });
    } catch (error) {
      this.logger.warn(
        `skill verification inference consumer not started: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
