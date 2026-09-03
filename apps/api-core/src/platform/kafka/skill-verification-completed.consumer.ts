import type { OnModuleInit } from '@nestjs/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { SkillVerificationCompletedEventSchema, SMART_TOPICS } from '@smart/contracts';
import { runKafkaHandler } from '@smart/observability';
import { env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../../modules/notifications/notifications.service.js';
import { KafkaService } from './kafka.service.js';

/**
 * Consumes skill verification results and notifies the student asynchronously.
 */
@Injectable()
export class SkillVerificationCompletedConsumer implements OnModuleInit {
  private readonly logger = new Logger(SkillVerificationCompletedConsumer.name);

  constructor(
    @Inject(KafkaService) private readonly kafka: KafkaService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (env.NODE_ENV === 'test') return;
    try {
      await this.kafka.subscribe({
        topic: SMART_TOPICS.skillVerificationCompleted,
        module: 'notifications',
        handler: async (payload, headers) => {
          await runKafkaHandler(headers, async () => {
            const parsed = SkillVerificationCompletedEventSchema.safeParse(payload);
            if (!parsed.success) {
              this.logger.warn('Ignored malformed skill.verification.completed payload');
              return;
            }

            const event = parsed.data.data;
            const user = await this.prisma.user.findUnique({
              where: { id: event.userId },
              select: { id: true, email: true, fullName: true },
            });
            if (!user) {
              this.logger.warn(`User ${event.userId} not found for verification notification`);
              return;
            }

            await this.notifications.notifyVerificationResult({
              userId: user.id,
              email: user.email,
              fullName: user.fullName,
              skillName: event.skillName,
              status: event.status,
              detail: event.detail,
              claimId: event.claimId,
            });
          });
        },
      });
    } catch (error) {
      this.logger.warn(
        `skill.verification.completed consumer not started: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
