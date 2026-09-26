import { InjectQueue, Processor } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { DlqAwareProcessor } from '../../platform/queue/async-job.processor.js';
import { DSR_EXPORT_DLQ, DSR_EXPORT_QUEUE } from '../../platform/queue/queue.names.js';
import { DataExportService } from './data-export.service.js';

export interface DsrExportJobPayload {
  requestId: string;
}

/** S6-VV-115 — builds a student's data export off the request path. */
@Processor(DSR_EXPORT_QUEUE)
export class DsrExportProcessor extends DlqAwareProcessor {
  protected readonly logger = new Logger(DsrExportProcessor.name);

  constructor(
    @Inject(DataExportService) private readonly exports: DataExportService,
    @InjectQueue(DSR_EXPORT_DLQ) protected readonly dlq: Queue,
  ) {
    super();
  }

  async process(job: Job<DsrExportJobPayload>): Promise<void> {
    await this.exports.build(job.data.requestId);
  }
}
