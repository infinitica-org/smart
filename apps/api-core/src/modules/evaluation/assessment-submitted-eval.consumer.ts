import type { OnModuleInit } from '@nestjs/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { AssessmentSubmittedEventSchema, SMART_TOPICS } from '@smart/contracts';
import { runKafkaHandler } from '@smart/observability';
import { env } from '../../platform/config/env.js';
import { KafkaService } from '../../platform/kafka/kafka.service.js';

/**
 * Evaluation handoff consumer — receives assessment.submitted and queues grading.
 * Full eval.requested fan-out lands when the evaluation module ships.
 */
@Injectable()
export class AssessmentSubmittedEvalConsumer implements OnModuleInit {
  private readonly logger = new Logger(AssessmentSubmittedEvalConsumer.name);

  constructor(@Inject(KafkaService) private readonly kafka: KafkaService) {}

  async onModuleInit(): Promise<void> {
    if (env.NODE_ENV === 'test') return;
    try {
      await this.kafka.subscribe({
        topic: SMART_TOPICS.assessmentSubmitted,
        module: 'evaluation',
        handler: async (payload, headers) => {
          await runKafkaHandler(headers, async () => {
            const parsed = AssessmentSubmittedEventSchema.safeParse(payload);
            if (!parsed.success) {
              this.logger.warn('Ignored malformed assessment.submitted payload (eval handoff)');
              return;
            }
            this.logger.log(
              `Eval handoff queued for attempt ${parsed.data.data.attemptId} (${parsed.data.data.responses.length} responses)`,
            );
          });
        },
      });
    } catch (error) {
      this.logger.warn(
        `assessment.submitted eval consumer not started: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
