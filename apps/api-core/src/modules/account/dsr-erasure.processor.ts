import { InjectQueue, Processor } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { DlqAwareProcessor } from '../../platform/queue/async-job.processor.js';
import { DSR_ERASURE_DLQ, DSR_ERASURE_QUEUE } from '../../platform/queue/queue.names.js';
import { DataErasureService } from './data-erasure.service.js';

export interface DsrErasureJobPayload {
  requestId: string;
  actorId: string;
  note: string;
}

/** S6-VV-117 — runs an approved deletion off the request path; retries are safe. */
@Processor(DSR_ERASURE_QUEUE)
export class DsrErasureProcessor extends DlqAwareProcessor {
  protected readonly logger = new Logger(DsrErasureProcessor.name);

  constructor(
    @Inject(DataErasureService) private readonly erasure: DataErasureService,
    @InjectQueue(DSR_ERASURE_DLQ) protected readonly dlq: Queue,
  ) {
    super();
  }

  async process(job: Job<DsrErasureJobPayload>): Promise<void> {
    await this.erasure.execute(job.data.requestId, job.data.actorId, job.data.note);
  }
}
