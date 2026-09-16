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

import { analyzeProctoringSnapshot } from './cv-client.js';

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

            const objectKey = parsed.data.data.objectKey;

            if (await this.proctoring.isSnapshotProcessed(objectKey)) return;

            const kinds = await this.analyze(objectKey);

            await this.proctoring.applyCheckpointKinds(parsed.data.data.attemptId, kinds);

            await this.proctoring.markSnapshotProcessed(objectKey);
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
    const result = await analyzeProctoringSnapshot(objectKey);

    return result.violations;
  }
}
