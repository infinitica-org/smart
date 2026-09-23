import type { OnModuleInit } from '@nestjs/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { SkillInferenceUpdatedEventSchema, SMART_TOPICS } from '@smart/contracts';
import { runKafkaHandler } from '@smart/observability';
import { env } from '../../platform/config/env.js';
import { KafkaService } from '../../platform/kafka/kafka.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class SkillInferenceUpdatedConsumer implements OnModuleInit {
  private readonly logger = new Logger(SkillInferenceUpdatedConsumer.name);

  constructor(
    @Inject(KafkaService) private readonly kafka: KafkaService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (env.NODE_ENV === 'test') return;
    try {
      await this.kafka.subscribe({
        topic: SMART_TOPICS.skillInferenceUpdated,
        module: 'evidence',
        handler: async (payload, headers) => {
          await runKafkaHandler(headers, async () => {
            const parsed = SkillInferenceUpdatedEventSchema.safeParse(payload);
            if (!parsed.success) {
              this.logger.warn('Ignored malformed skill.inference.updated payload');
              return;
            }

            const event = parsed.data.data;
            const previous = event.previousInferredProficiency ?? null;
            const next = event.inferredProficiency ?? null;
            if (previous === next) return;

            const user = await this.prisma.user.findUnique({
              where: { id: event.userId },
              select: { id: true, email: true, fullName: true },
            });
            if (!user) return;

            await this.notifications.notifySkillInferenceLevelChange({
              userId: user.id,
              email: user.email,
              fullName: user.fullName,
              skillCode: event.skillCode,
              previousLevel: event.previousInferredProficiency ?? null,
              newLevel: event.inferredProficiency,
              confidence: event.confidence,
              outcome: event.outcome,
            });
          });
        },
      });
    } catch (error) {
      this.logger.warn(
        `skill.inference.updated consumer not started: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
