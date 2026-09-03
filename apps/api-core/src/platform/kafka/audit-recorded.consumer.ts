import type { OnModuleInit } from '@nestjs/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { AuditRecordedEventSchema, SMART_TOPICS } from '@smart/contracts';
import { runKafkaHandler } from '@smart/observability';
import type { Prisma } from '../../generated/prisma/index.js';
import { env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { KafkaService } from './kafka.service.js';

@Injectable()
export class AuditRecordedConsumer implements OnModuleInit {
  private readonly logger = new Logger(AuditRecordedConsumer.name);

  constructor(
    @Inject(KafkaService) private readonly kafka: KafkaService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (env.NODE_ENV === 'test') return;
    try {
      await this.kafka.subscribe({
        topic: SMART_TOPICS.auditRecorded,
        module: 'platform',
        handler: async (payload, headers) => {
          await runKafkaHandler(headers, async () => {
            const parsed = AuditRecordedEventSchema.safeParse(payload);
            if (!parsed.success) {
              this.logger.warn('Ignored malformed audit.recorded payload');
              return;
            }

            const event = parsed.data.data;
            await this.prisma.auditLog.create({
              data: {
                actorId: event.actorId,
                action: event.action,
                resourceType: event.resourceType,
                resourceId: event.resourceId,
                reasonCode: event.reasonCode,
                metadata: event.metadata as Prisma.InputJsonValue,
              },
            });
          });
        },
      });
    } catch (error) {
      this.logger.warn(
        `audit.recorded consumer not started: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
