import type { OnModuleInit } from '@nestjs/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { AiCompletionRecordedEventSchema, SMART_TOPICS } from '@smart/contracts';
import { runKafkaHandler } from '@smart/observability';
import { env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { KafkaService } from './kafka.service.js';

@Injectable()
export class AiCompletionRecordedConsumer implements OnModuleInit {
  private readonly logger = new Logger(AiCompletionRecordedConsumer.name);

  constructor(
    @Inject(KafkaService) private readonly kafka: KafkaService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (env.NODE_ENV === 'test') return;
    try {
      await this.kafka.subscribe({
        topic: SMART_TOPICS.aiCompletionRecorded,
        module: 'ai-gateway',
        handler: async (payload, headers) => {
          await runKafkaHandler(headers, async () => {
            const parsed = AiCompletionRecordedEventSchema.safeParse(payload);
            if (!parsed.success) {
              this.logger.warn('Ignored malformed ai.completion.recorded payload');
              return;
            }

            const event = parsed.data.data;
            await this.prisma.aiEvaluationAudit.create({
              data: {
                promptRef: event.promptRef,
                provider: event.provider,
                model: event.model,
                promptTokens: event.promptTokens,
                completionTokens: event.completionTokens,
                latencyMs: event.latencyMs,
                usedFallback: event.usedFallback,
                estimatedCostUsd: event.estimatedCostUsd,
                responseId: event.responseId,
              },
            });
          });
        },
      });
    } catch (error) {
      this.logger.warn(
        `ai.completion.recorded consumer not started: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
