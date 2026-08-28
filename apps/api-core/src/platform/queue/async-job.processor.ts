import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Job, Queue } from 'bullmq';
import {
  AUDIO_EVALUATION_DLQ,
  AUDIO_EVALUATION_QUEUE,
  PDF_GENERATION_DLQ,
  PDF_GENERATION_QUEUE,
  SANDBOX_EXECUTION_DLQ,
  SANDBOX_EXECUTION_QUEUE,
} from './queue.names.js';

export abstract class DlqAwareProcessor extends WorkerHost {
  protected abstract readonly logger: Logger;
  protected abstract readonly dlq: Queue;

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error): void {
    if (!job) return;
    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < maxAttempts) return;
    void this.dlq
      .add('dead', {
        originalQueue: job.queueName,
        originalJobId: job.id,
        data: job.data,
        error: error.message,
      })
      .catch((dlqError: unknown) => {
        this.logger.error(
          `Failed to write DLQ for ${job.queueName}:${job.id ?? '?'}: ${dlqError instanceof Error ? dlqError.message : 'unknown'}`,
        );
      });
  }
}

@Processor(SANDBOX_EXECUTION_QUEUE)
export class SandboxExecutionProcessor extends DlqAwareProcessor {
  protected readonly logger = new Logger(SandboxExecutionProcessor.name);

  constructor(@InjectQueue(SANDBOX_EXECUTION_DLQ) protected readonly dlq: Queue) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.warn(`sandbox_execution ${job.id ?? ''} is not implemented yet`);
    throw new Error('Sandbox runner is not wired yet');
  }
}

@Processor(AUDIO_EVALUATION_QUEUE)
export class AudioEvaluationProcessor extends DlqAwareProcessor {
  protected readonly logger = new Logger(AudioEvaluationProcessor.name);

  constructor(@InjectQueue(AUDIO_EVALUATION_DLQ) protected readonly dlq: Queue) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.warn(`audio_evaluation ${job.id ?? ''} is not implemented yet`);
    throw new Error('Audio evaluation worker is not wired yet');
  }
}

@Processor(PDF_GENERATION_QUEUE)
export class PdfGenerationProcessor extends DlqAwareProcessor {
  protected readonly logger = new Logger(PdfGenerationProcessor.name);

  constructor(@InjectQueue(PDF_GENERATION_DLQ) protected readonly dlq: Queue) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.warn(`pdf_generation ${job.id ?? ''} is not implemented yet`);
    throw new Error('PDF generation worker is not wired yet');
  }
}
