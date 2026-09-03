import type { OnModuleInit } from '@nestjs/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ProctoringSnapshotReadyEventSchema,
  SMART_TOPICS,
  type ProctoringViolationKind,
} from '@smart/contracts';
import { runKafkaHandler } from '@smart/observability';
import { env } from '../../platform/config/env.js';
import { KafkaService } from '../../platform/kafka/kafka.service.js';
import { ProctoringService } from './proctoring.service.js';

@Injectable()
export class ProctoringSnapshotConsumer implements OnModuleInit {
  private readonly logger = new Logger(ProctoringSnapshotConsumer.name);

  constructor(
    @Inject(KafkaService) private readonly kafka: KafkaService,
    @Inject(ProctoringService) private readonly proctoring: ProctoringService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (env.NODE_ENV === 'test') return;
    try {
      await this.kafka.subscribe({
        topic: SMART_TOPICS.proctoringSnapshotReady,
        module: 'proctoring',
        handler: async (payload, headers) => {
          await runKafkaHandler(headers, async () => {
            const parsed = ProctoringSnapshotReadyEventSchema.safeParse(payload);
            if (!parsed.success) return;
            const kinds = await this.analyze(parsed.data.data.objectKey);
            await this.proctoring.applyCheckpointKinds(parsed.data.data.attemptId, kinds);
          });
        },
      });
    } catch (error) {
      this.logger.warn(
        `proctoring snapshot consumer not started: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  private async analyze(objectKey: string): Promise<ProctoringViolationKind[]> {
    try {
      const response = await fetch(`${env.PROCTORING_CV_URL}/analyze`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ objectKey }),
        signal: AbortSignal.timeout(3_000),
      });
      if (!response.ok) return [];
      const body = (await response.json()) as { violations?: ProctoringViolationKind[] };
      return body.violations ?? [];
    } catch {
      return [];
    }
  }
}
