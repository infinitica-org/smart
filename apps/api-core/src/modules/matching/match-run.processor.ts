import { InjectQueue, Processor } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { DlqAwareProcessor } from '../../platform/queue/async-job.processor.js';
import { MATCH_RUN_DLQ, MATCH_RUN_QUEUE } from '../../platform/queue/queue.names.js';
import { MatchingService } from './matching.service.js';

export interface MatchRunJobPayload {
  matchRunId: string;
}

@Processor(MATCH_RUN_QUEUE)
export class MatchRunProcessor extends DlqAwareProcessor {
  protected readonly logger = new Logger(MatchRunProcessor.name);

  constructor(
    @Inject(MatchingService) private readonly matching: MatchingService,
    @InjectQueue(MATCH_RUN_DLQ) protected readonly dlq: Queue,
  ) {
    super();
  }

  async process(job: Job<MatchRunJobPayload>): Promise<void> {
    await this.matching.runMatchRun(job.data.matchRunId);
  }
}
