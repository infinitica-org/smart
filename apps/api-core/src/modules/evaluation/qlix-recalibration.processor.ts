import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger, type OnModuleInit } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { env } from '../../platform/config/env.js';
import {
  QLIX_RECALIBRATION_INTERVAL_MS,
  QLIX_RECALIBRATION_JOB_ID,
  QLIX_RECALIBRATION_QUEUE,
} from '../../platform/queue/queue.names.js';
import { QlixRecalibrationService } from './qlix-recalibration.service.js';

@Processor(QLIX_RECALIBRATION_QUEUE)
export class QlixRecalibrationProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(QlixRecalibrationProcessor.name);

  constructor(
    @Inject(QlixRecalibrationService) private readonly recalibration: QlixRecalibrationService,
    @InjectQueue(QLIX_RECALIBRATION_QUEUE) private readonly queue: Queue,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    if (env.NODE_ENV === 'test') return;
    try {
      await this.queue.upsertJobScheduler(
        QLIX_RECALIBRATION_JOB_ID,
        { every: QLIX_RECALIBRATION_INTERVAL_MS },
        { name: 'recalibrate' },
      );
    } catch (error) {
      this.logger.warn(
        `Could not schedule QLIX recalibration job: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  async process(): Promise<void> {
    await this.recalibration.runBatch();
  }
}
