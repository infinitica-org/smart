import type { OnModuleInit } from '@nestjs/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { AssessmentSubmittedEventSchema } from '@smart/contracts';
import { runKafkaHandler } from '@smart/observability';
import { env } from '../config/env.js';
import { RedisService } from '../redis/redis.service.js';
import { KafkaService } from './kafka.service.js';

/**
 * First real consumer: invalidate the live attempt session after submit.
 */
@Injectable()
export class AssessmentSubmittedConsumer implements OnModuleInit {
  private readonly logger = new Logger(AssessmentSubmittedConsumer.name);

  constructor(
    @Inject(KafkaService) private readonly kafka: KafkaService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (env.NODE_ENV === 'test') return;
    try {
      await this.kafka.subscribeAssessmentSubmitted(async (payload, headers) => {
        await runKafkaHandler(headers, async () => {
          const parsed = AssessmentSubmittedEventSchema.safeParse(payload);
          if (!parsed.success) {
            this.logger.warn('Ignored malformed assessment.submitted payload');
            return;
          }
          const key = `session:assessment:${parsed.data.data.attemptId}`;
          if (this.redis.status === 'wait' || this.redis.status === 'end') {
            await this.redis.connect();
          }
          await this.redis.del(key);
          this.logger.log(`Invalidated ${key}`);
        });
      });
    } catch (error) {
      this.logger.warn(
        `assessment.submitted consumer not started: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
