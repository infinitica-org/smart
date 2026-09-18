import { InjectQueue, Processor } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { DlqAwareProcessor } from '../../platform/queue/async-job.processor.js';
import { QLIX_POLL_DLQ, QLIX_POLL_QUEUE } from '../../platform/queue/queue.names.js';
import { QlixPollService, type QlixPollJobPayload } from './qlix-poll.service.js';

@Processor(QLIX_POLL_QUEUE)
export class QlixPollProcessor extends DlqAwareProcessor {
  protected readonly logger = new Logger(QlixPollProcessor.name);

  constructor(
    @Inject(QlixPollService) private readonly pollService: QlixPollService,
    @InjectQueue(QLIX_POLL_DLQ) protected readonly dlq: Queue,
  ) {
    super();
  }

  async process(job: Job<QlixPollJobPayload>): Promise<void> {
    await this.pollService.handlePoll(job.data);
  }
}
