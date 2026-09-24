import { z } from 'zod';
import { EvidenceRecordDtoSchema } from './evidence.dto.js';

export const EVIDENCE_REVIEW_DECISIONS = ['ACCEPTED', 'REJECTED', 'NEEDS_INFORMATION'] as const;
export const EvidenceReviewDecisionSchema = z.enum(EVIDENCE_REVIEW_DECISIONS);
export type EvidenceReviewDecision = z.infer<typeof EvidenceReviewDecisionSchema>;

export const ReviewEvidenceRequestSchema = z
  .object({
    decision: EvidenceReviewDecisionSchema,
    reason: z.string().max(2_000).optional(),
    requestedInformation: z.string().max(2_000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.decision === 'REJECTED') {
      const trimmed = value.reason?.trim() ?? '';
      if (trimmed.length < 8) {
        ctx.addIssue({
          code: 'custom',
          message: 'reason must be at least 8 characters when rejecting evidence.',
          path: ['reason'],
        });
      }
    }

    if (value.decision === 'NEEDS_INFORMATION') {
      const reasonOk = (value.reason?.trim().length ?? 0) >= 8;
      const requestedOk = (value.requestedInformation?.trim().length ?? 0) >= 8;
      if (!reasonOk && !requestedOk) {
        ctx.addIssue({
          code: 'custom',
          message:
            'Provide reason or requestedInformation (minimum 8 characters) when requesting more information.',
          path: ['requestedInformation'],
        });
      }
    }
  });
export type ReviewEvidenceRequest = z.infer<typeof ReviewEvidenceRequestSchema>;

export const EVIDENCE_RECONCILIATION_PROCESSING_STATUSES = [
  'QUEUED',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'NOT_ENQUEUED',
] as const;
export const EvidenceReconciliationProcessingStatusSchema = z.enum(
  EVIDENCE_RECONCILIATION_PROCESSING_STATUSES,
);
export type EvidenceReconciliationProcessingStatus = z.infer<
  typeof EvidenceReconciliationProcessingStatusSchema
>;

export const ReviewEvidenceResponseSchema = z.object({
  evidence: EvidenceRecordDtoSchema,
  decision: EvidenceReviewDecisionSchema,
  idempotent: z.boolean(),
  reconciliation: z.object({
    status: EvidenceReconciliationProcessingStatusSchema,
    jobId: z.string().optional(),
  }),
});
export type ReviewEvidenceResponse = z.infer<typeof ReviewEvidenceResponseSchema>;
