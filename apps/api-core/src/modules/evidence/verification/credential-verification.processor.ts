import { InjectQueue, Processor } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { DlqAwareProcessor } from '../../../platform/queue/async-job.processor.js';
import {
  CREDENTIAL_VERIFICATION_DLQ,
  CREDENTIAL_VERIFICATION_QUEUE,
} from '../../../platform/queue/queue.names.js';
import { CredentialVerificationService } from './credential-verification.service.js';

export interface CredentialVerificationJobPayload {
  credentialId: string;
}

@Processor(CREDENTIAL_VERIFICATION_QUEUE)
export class CredentialVerificationProcessor extends DlqAwareProcessor {
  protected readonly logger = new Logger(CredentialVerificationProcessor.name);

  constructor(
    @Inject(CredentialVerificationService)
    private readonly verificationService: CredentialVerificationService,
    @InjectQueue(CREDENTIAL_VERIFICATION_DLQ) protected readonly dlq: Queue,
  ) {
    super();
  }

  async process(job: Job<CredentialVerificationJobPayload>): Promise<void> {
    await this.verificationService.runVerification(job.data.credentialId);
  }
}
