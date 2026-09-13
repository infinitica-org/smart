import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema, WeightSchema } from '../../dto/common.js';
import { VerificationDecisionOutcomeSchema } from './enums.js';

export const VerificationDecisionSchema = z.object({
  decisionId: UuidSchema,
  claimId: UuidSchema,
  evidenceSummary: z.string().max(4000).optional(),
  assessmentSummary: z.string().max(4000).optional(),
  interviewSummary: z.string().max(4000).optional(),
  decision: VerificationDecisionOutcomeSchema,
  confidence: WeightSchema,
  reasons: z.array(z.string().max(500)).max(30).default([]),
  reviewerId: UuidSchema.nullable().optional(),
  createdAt: IsoDateTimeSchema,
});
export type VerificationDecision = z.infer<typeof VerificationDecisionSchema>;

export const CreateVerificationDecisionSchema = VerificationDecisionSchema.omit({
  decisionId: true,
  createdAt: true,
});
export type CreateVerificationDecision = z.infer<typeof CreateVerificationDecisionSchema>;
