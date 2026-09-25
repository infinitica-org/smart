import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger, type OnModuleInit } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { env } from '../../platform/config/env.js';
import { MESSAGE_MODERATION_PURGE_QUEUE } from '../../platform/queue/queue.names.js';
import {
  MESSAGE_MODERATION_PURGE_INTERVAL_MS,
  MESSAGE_MODERATION_PURGE_JOB_ID,
} from './messaging.constants.js';
import { ModerationRetentionService } from './moderation-retention.service.js';

/** Th6-428 — runs the retention purge every hour. */
@Processor(MESSAGE_MODERATION_PURGE_QUEUE)
export class ModerationPurgeProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(ModerationPurgeProcessor.name);

  constructor(
    @Inject(ModerationRetentionService) private readonly retention: ModerationRetentionService,
    @InjectQueue(MESSAGE_MODERATION_PURGE_QUEUE) private readonly queue: Queue,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    if (env.NODE_ENV === 'test') return;
    try {
      // Keyed scheduler: restarts do not create a second schedule.
      await this.queue.upsertJobScheduler(
        MESSAGE_MODERATION_PURGE_JOB_ID,
        { every: MESSAGE_MODERATION_PURGE_INTERVAL_MS },
        { name: 'purge' },
      );
    } catch (error) {
      this.logger.warn(
        `Could not schedule moderation purge job: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  async process(): Promise<void> {
    await this.retention.purgeExpired();
  }
}
