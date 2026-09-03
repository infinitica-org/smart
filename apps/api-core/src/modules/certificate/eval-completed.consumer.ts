import type { OnModuleInit } from '@nestjs/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { EvalCompletedEventSchema, SMART_TOPICS } from '@smart/contracts';
import { runKafkaHandler } from '@smart/observability';
import { env } from '../../platform/config/env.js';
import { KafkaService } from '../../platform/kafka/kafka.service.js';
import { CertificateService } from '../../modules/certificate/certificate.service.js';

@Injectable()
export class EvalCompletedConsumer implements OnModuleInit {
  private readonly logger = new Logger(EvalCompletedConsumer.name);

  constructor(
    @Inject(KafkaService) private readonly kafka: KafkaService,
    @Inject(CertificateService) private readonly certificates: CertificateService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (env.NODE_ENV === 'test') return;
    try {
      await this.kafka.subscribe({
        topic: SMART_TOPICS.evalCompleted,
        module: 'certificate',
        handler: async (payload, headers) => {
          await runKafkaHandler(headers, async () => {
            const parsed = EvalCompletedEventSchema.safeParse(payload);
            if (!parsed.success) {
              this.logger.warn('Ignored malformed eval.completed payload');
              return;
            }
            await this.certificates.issueFromEvalCompleted(parsed.data);
          });
        },
      });
    } catch (error) {
      this.logger.warn(
        `eval.completed consumer not started: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
