import { BullModule } from '@nestjs/bullmq';
import { Global, Module, forwardRef } from '@nestjs/common';
import { env } from '../config/env.js';
import { EMAIL_QUEUE } from '../mailer/mailer.types.js';
import { EvidenceModule } from '../../modules/evidence/evidence.module.js';
import {
  AudioEvaluationProcessor,
  PdfGenerationProcessor,
  SandboxExecutionProcessor,
} from './async-job.processor.js';
import { RetentionSweepProcessor } from '../retention/retention-sweep.processor.js';
import { RetentionSweepService } from '../retention/retention-sweep.service.js';
import { StorageModule } from '../storage/storage.module.js';
import { EmailProcessor } from './email.processor.js';
import {
  AUDIO_EVALUATION_DLQ,
  AUDIO_EVALUATION_QUEUE,
  RETENTION_SWEEP_QUEUE,
  MESSAGE_MODERATION_PURGE_QUEUE,
  CREDENTIAL_VERIFICATION_DLQ,
  CREDENTIAL_VERIFICATION_QUEUE,
  EVIDENCE_EXPIRATION_QUEUE,
  EVIDENCE_RECONCILIATION_QUEUE,
  QLIX_POLL_DLQ,
  QLIX_POLL_QUEUE,
  QLIX_RECALIBRATION_DLQ,
  QLIX_RECALIBRATION_QUEUE,
  DEFAULT_JOB_OPTIONS,
  JD_PARSE_DLQ,
  DSR_EXPORT_DLQ,
  DSR_ERASURE_DLQ,
  DSR_ERASURE_QUEUE,
  DSR_EXPORT_QUEUE,
  JD_PARSE_QUEUE,
  SKILL_VERIFY_GRADE_DLQ,
  SKILL_VERIFY_GRADE_QUEUE,
  SCORE_RECALCULATION_DLQ,
  SCORE_RECALCULATION_QUEUE,
  MATCH_RUN_DLQ,
  MATCH_RUN_QUEUE,
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
  { name: RETENTION_SWEEP_QUEUE, defaultJobOptions: DEFAULT_JOB_OPTIONS },
  { name: MESSAGE_MODERATION_PURGE_QUEUE, defaultJobOptions: DEFAULT_JOB_OPTIONS },
  { name: EVIDENCE_EXPIRATION_QUEUE, defaultJobOptions: DEFAULT_JOB_OPTIONS },
  { name: EVIDENCE_RECONCILIATION_QUEUE, defaultJobOptions: DEFAULT_JOB_OPTIONS },
  { name: CREDENTIAL_VERIFICATION_QUEUE, defaultJobOptions: DEFAULT_JOB_OPTIONS },
  { name: QLIX_POLL_QUEUE, defaultJobOptions: DEFAULT_JOB_OPTIONS },
  { name: QLIX_RECALIBRATION_QUEUE, defaultJobOptions: DEFAULT_JOB_OPTIONS },
  { name: MATCH_RUN_QUEUE, defaultJobOptions: DEFAULT_JOB_OPTIONS },
  { name: JD_PARSE_QUEUE, defaultJobOptions: DEFAULT_JOB_OPTIONS },
  { name: SKILL_VERIFY_GRADE_QUEUE, defaultJobOptions: DEFAULT_JOB_OPTIONS },
  { name: SCORE_RECALCULATION_QUEUE, defaultJobOptions: DEFAULT_JOB_OPTIONS },
  { name: SANDBOX_EXECUTION_DLQ },
  { name: AUDIO_EVALUATION_DLQ },
  { name: PDF_GENERATION_DLQ },
  { name: CREDENTIAL_VERIFICATION_DLQ },
  { name: QLIX_POLL_DLQ },
  { name: QLIX_RECALIBRATION_DLQ },
  { name: MATCH_RUN_DLQ },
  { name: JD_PARSE_DLQ },
  { name: SKILL_VERIFY_GRADE_DLQ },
  { name: SCORE_RECALCULATION_DLQ },
  { name: DSR_EXPORT_QUEUE, defaultJobOptions: DEFAULT_JOB_OPTIONS },
  { name: DSR_EXPORT_DLQ },
  { name: DSR_ERASURE_QUEUE, defaultJobOptions: DEFAULT_JOB_OPTIONS },
  { name: DSR_ERASURE_DLQ },
];

@Global()
@Module({
  imports: [
    BullModule.forRoot({
      connection: { url: env.REDIS_URL },
    }),
    BullModule.registerQueue(...queues),
    forwardRef(() => EvidenceModule),
    StorageModule,
  ],
  providers: [
    EmailProcessor,
    SandboxExecutionProcessor,
    AudioEvaluationProcessor,
    PdfGenerationProcessor,
    RetentionSweepService,
    RetentionSweepProcessor,
  ],
  exports: [BullModule],
})
export class QueueModule {}
