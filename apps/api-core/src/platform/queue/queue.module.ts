import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { env } from '../config/env.js';
import { EMAIL_QUEUE } from '../mailer/mailer.types.js';
import {
  AudioEvaluationProcessor,
  PdfGenerationProcessor,
  SandboxExecutionProcessor,
} from './async-job.processor.js';
import { EmailProcessor } from './email.processor.js';
import {
  AUDIO_EVALUATION_DLQ,
  AUDIO_EVALUATION_QUEUE,
  DEFAULT_JOB_OPTIONS,
  PDF_GENERATION_DLQ,
  PDF_GENERATION_QUEUE,
  SANDBOX_EXECUTION_DLQ,
  SANDBOX_EXECUTION_QUEUE,
} from './queue.names.js';

const queues = [
  { name: EMAIL_QUEUE },
  { name: SANDBOX_EXECUTION_QUEUE, defaultJobOptions: DEFAULT_JOB_OPTIONS },
  { name: AUDIO_EVALUATION_QUEUE, defaultJobOptions: DEFAULT_JOB_OPTIONS },
  { name: PDF_GENERATION_QUEUE, defaultJobOptions: DEFAULT_JOB_OPTIONS },
  { name: SANDBOX_EXECUTION_DLQ },
  { name: AUDIO_EVALUATION_DLQ },
  { name: PDF_GENERATION_DLQ },
];

@Global()
@Module({
  imports: [
    BullModule.forRoot({
      connection: { url: env.REDIS_URL },
    }),
    BullModule.registerQueue(...queues),
  ],
  providers: [
    EmailProcessor,
    SandboxExecutionProcessor,
    AudioEvaluationProcessor,
    PdfGenerationProcessor,
  ],
  exports: [BullModule],
})
export class QueueModule {}
