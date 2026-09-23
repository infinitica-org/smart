import type { OnModuleInit } from '@nestjs/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { AssessmentSubmittedEventSchema, SMART_TOPICS } from '@smart/contracts';
import { runKafkaHandler } from '@smart/observability';
import { env } from '../../platform/config/env.js';
import { KafkaService } from '../../platform/kafka/kafka.service.js';
import { CorroborationService } from '../corroboration/corroboration.service.js';

/**
 * Evaluation handoff consumer — receives assessment.submitted and triggers
 * post-assessment workflows: corroboration refusion for verified claims.
 * Full eval.requested fan-out lands when the evaluation module ships.
 */
@Injectable()
export class AssessmentSubmittedEvalConsumer implements OnModuleInit {
  private readonly logger = new Logger(AssessmentSubmittedEvalConsumer.name);

  constructor(
    @Inject(KafkaService) private readonly kafka: KafkaService,
    @Inject(CorroborationService) private readonly corroboration: CorroborationService,
  ) {}

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
            const { studentId } = parsed.data.data;
            this.logger.log(
              `Eval handoff: triggering corroboration refusion for user ${studentId}`,
            );

            await this.corroboration.refusionVerifiedSkillClaims(studentId);
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
