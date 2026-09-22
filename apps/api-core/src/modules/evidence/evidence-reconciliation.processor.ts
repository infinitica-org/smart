import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { EVIDENCE_RECONCILIATION_QUEUE } from '../../platform/queue/queue.names.js';
import { EvidenceReconciliationService } from './evidence-reconciliation.service.js';

export interface EvidenceReconciliationJobPayload {
  studentId: string;
  evidenceId: string;
  trigger: 'evidence_review';
}

@Processor(EVIDENCE_RECONCILIATION_QUEUE)
export class EvidenceReconciliationProcessor extends WorkerHost {
  private readonly logger = new Logger(EvidenceReconciliationProcessor.name);

  constructor(
    @Inject(EvidenceReconciliationService)
    private readonly reconciliation: EvidenceReconciliationService,
  ) {
    super();
  }

  async process(job: Job<EvidenceReconciliationJobPayload>): Promise<void> {
    const result = await this.reconciliation.reconcileForStudent(job.data.studentId);
    this.logger.log(
      `Reconciled evidence review for student ${job.data.studentId} (evidence ${job.data.evidenceId}): contradictions=${result.contradictionsDetected}, reviewRequired=${result.reviewRequired}`,
    );
  }
}

export function evidenceReconciliationJobId(studentId: string, evidenceId: string): string {
  return `evidence-reconciliation:${studentId}:${evidenceId}`;
}
