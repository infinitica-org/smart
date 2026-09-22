import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger, type OnModuleInit } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { env } from '../../platform/config/env.js';
import {
  EVIDENCE_EXPIRATION_INTERVAL_MS,
  EVIDENCE_EXPIRATION_JOB_ID,
  EVIDENCE_EXPIRATION_QUEUE,
} from '../../platform/queue/queue.names.js';
import { EvidenceExpirationService } from './evidence-expiration.service.js';

/**
 * Daily scan for credential evidence past ProfessionalCredential.expiryDate.
 * Uses upsertJobScheduler — same pattern as audit-log-purge.processor.ts.
 */
@Processor(EVIDENCE_EXPIRATION_QUEUE)
export class EvidenceExpirationProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(EvidenceExpirationProcessor.name);

  constructor(
    @Inject(EvidenceExpirationService)
    private readonly expiration: EvidenceExpirationService,
    @InjectQueue(EVIDENCE_EXPIRATION_QUEUE) private readonly queue: Queue,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    if (env.NODE_ENV === 'test') return;
    try {
      await this.queue.upsertJobScheduler(
        EVIDENCE_EXPIRATION_JOB_ID,
        { every: EVIDENCE_EXPIRATION_INTERVAL_MS },
        { name: 'scan-due-credentials' },
      );
    } catch (error) {
      this.logger.warn(
        `Could not schedule evidence expiration job: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  async process(job: { name?: string }): Promise<void> {
    if (job.name !== 'scan-due-credentials') {
      return;
    }
    const result = await this.expiration.scanAndExpireDueCredentials();
    if (result.expired > 0) {
      this.logger.log(
        `Expired ${result.expired} credential evidence record(s) (${result.scanned} credential(s) scanned)`,
      );
    }
  }
}
