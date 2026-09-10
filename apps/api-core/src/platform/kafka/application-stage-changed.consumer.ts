import type { OnModuleInit } from '@nestjs/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ApplicationStageChangedEventSchema, SMART_TOPICS } from '@smart/contracts';
import { runKafkaHandler } from '@smart/observability';
import { env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../../modules/notifications/notifications.service.js';
import { KafkaService } from './kafka.service.js';

/**
 * Consumes ATS stage changes and triggers in-app + email notifications asynchronously.
 */
@Injectable()
export class ApplicationStageChangedConsumer implements OnModuleInit {
  private readonly logger = new Logger(ApplicationStageChangedConsumer.name);

  constructor(
    @Inject(KafkaService) private readonly kafka: KafkaService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (env.NODE_ENV === 'test') return;
    try {
      await this.kafka.subscribe({
        topic: SMART_TOPICS.applicationStageChanged,
        module: 'notifications',
        handler: async (payload, headers) => {
          await runKafkaHandler(headers, () => this.handleStageChanged(payload));
        },
      });
    } catch (error) {
      this.logger.warn(
        `application.stage_changed consumer not started: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  /**
   * CO-T05: one notification per kanban movement, with content that matches
   * the actual target column (see `NotificationsService`) rather than a
   * generic "your application changed" message for every kind of move.
   * Split out from `onModuleInit` so tests can drive it directly without a
   * live Kafka subscription (the module skips subscribing in `NODE_ENV=test`).
   */
  async handleStageChanged(payload: unknown): Promise<void> {
    const parsed = ApplicationStageChangedEventSchema.safeParse(payload);
    if (!parsed.success) {
      this.logger.warn('Ignored malformed application.stage_changed payload');
      return;
    }

    const event = parsed.data.data;
    const application = await this.prisma.application.findUnique({
      where: { id: event.applicationId },
      include: { student: true, opening: true },
    });
    if (!application) {
      this.logger.warn(`Application ${event.applicationId} not found for notification`);
      return;
    }

    const fromStage = event.fromStage;
    const toStage = event.toStage;
    if (fromStage === toStage) return;

    const base = {
      userId: application.student.id,
      email: application.student.email,
      fullName: application.student.fullName,
      companyName: application.opening.companyName,
      roleTitle: application.opening.roleTitle,
      applicationId: application.id,
    };

    if (toStage === 'SHORTLISTED' && fromStage !== 'SHORTLISTED') {
      await this.notifications.notifyOpportunityShortlisted({
        ...base,
        openingId: application.openingId,
      });
      return;
    }

    await this.notifications.notifyStageChange({
      ...base,
      fromStage,
      toStage,
    });
  }
}
