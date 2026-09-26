import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger, type OnModuleInit } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { env } from '../config/env.js';
import {
  RETENTION_SWEEP_INTERVAL_MS,
  RETENTION_SWEEP_JOB_ID,
  RETENTION_SWEEP_QUEUE,
} from '../queue/queue.names.js';
import { RetentionSweepService } from './retention-sweep.service.js';

/**
 * S6-VV-118 — the daily retention sweep. It replaces the old audit-log purge, which hard-deleted
 * audit rows after 20 days. Nothing is removed unless RETENTION_DRY_RUN=false.
 */
@Processor(RETENTION_SWEEP_QUEUE)
export class RetentionSweepProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(RetentionSweepProcessor.name);

  constructor(
    @Inject(RetentionSweepService) private readonly sweep: RetentionSweepService,
    @InjectQueue(RETENTION_SWEEP_QUEUE) private readonly queue: Queue,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    if (env.NODE_ENV === 'test') return;
    try {
      await this.queue.upsertJobScheduler(
        RETENTION_SWEEP_JOB_ID,
        { every: RETENTION_SWEEP_INTERVAL_MS },
        { name: 'sweep' },
      );
    } catch (error) {
      this.logger.warn(
        `Could not schedule the retention sweep: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  async process(): Promise<void> {
    await this.sweep.run({ dryRun: env.RETENTION_DRY_RUN });
  }
}
