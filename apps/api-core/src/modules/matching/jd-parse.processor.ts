import { InjectQueue, Processor } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { DlqAwareProcessor } from '../../platform/queue/async-job.processor.js';
import { JD_PARSE_DLQ, JD_PARSE_QUEUE } from '../../platform/queue/queue.names.js';
import { OpeningJdParseService } from './opening-jd-parse.service.js';

export interface JdParseJobPayload {
  openingId: string;
}

@Processor(JD_PARSE_QUEUE)
export class JdParseProcessor extends DlqAwareProcessor {
  protected readonly logger = new Logger(JdParseProcessor.name);

  constructor(
    @Inject(OpeningJdParseService) private readonly parser: OpeningJdParseService,
    @InjectQueue(JD_PARSE_DLQ) protected readonly dlq: Queue,
  ) {
    super();
  }

  async process(job: Job<JdParseJobPayload>): Promise<void> {
    await this.parser.parseOpening(job.data.openingId);
  }
}
