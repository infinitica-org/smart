import type { OnModuleInit } from '@nestjs/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CertificateIssuedEventSchema,
  PlacementMatchedEventSchema,
  SMART_TOPICS,
} from '@smart/contracts';
import { runKafkaHandler } from '@smart/observability';
import { env } from '../config/env.js';
import { WebhooksService } from '../../modules/webhooks/webhooks.service.js';
import { KafkaService } from './kafka.service.js';

@Injectable()
export class WebhookDispatchConsumer implements OnModuleInit {
  private readonly logger = new Logger(WebhookDispatchConsumer.name);

  constructor(
    @Inject(KafkaService) private readonly kafka: KafkaService,
    @Inject(WebhooksService) private readonly webhooks: WebhooksService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (env.NODE_ENV === 'test') return;
    try {
      await this.kafka.subscribe({
        topic: SMART_TOPICS.placementMatched,
        module: 'webhooks',
        handler: async (payload, headers) => {
          await runKafkaHandler(headers, async () => {
            const parsed = PlacementMatchedEventSchema.safeParse(payload);
            if (!parsed.success) {
              this.logger.warn('Ignored malformed placement.matched payload');
              return;
            }
            await this.webhooks.dispatch({
              institutionId: parsed.data.data.institutionId,
              eventType: SMART_TOPICS.placementMatched,
              payload: parsed.data,
            });
          });
        },
      });

      await this.kafka.subscribe({
        topic: SMART_TOPICS.certificateIssued,
        module: 'webhooks',
        handler: async (payload, headers) => {
          await runKafkaHandler(headers, async () => {
            const parsed = CertificateIssuedEventSchema.safeParse(payload);
            if (!parsed.success) {
              this.logger.warn('Ignored malformed certificate.issued payload');
              return;
            }
            const student = await this.webhooks.resolveStudentInstitution(
              parsed.data.data.studentId,
            );
            if (!student?.institutionId) return;
            await this.webhooks.dispatch({
              institutionId: student.institutionId,
              eventType: SMART_TOPICS.certificateIssued,
              payload: parsed.data,
            });
          });
        },
      });
    } catch (error) {
      this.logger.warn(
        `webhook dispatch consumer not started: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
