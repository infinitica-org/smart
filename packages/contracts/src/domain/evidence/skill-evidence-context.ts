import { z } from 'zod';
import { EvidenceTypeSchema } from './enums.js';
import { EvidenceVerificationStatusSchema } from './enums.js';

export const SkillEvidenceContextItemSchema = z.object({
  evidenceType: EvidenceTypeSchema,
  label: z.string().max(200),
  verificationStatus: EvidenceVerificationStatusSchema,
  qualifiesForDemonstration: z.boolean(),
});
export type SkillEvidenceContextItem = z.infer<typeof SkillEvidenceContextItemSchema>;

export const SkillEvidenceContextSchema = z.object({
  availableCount: z.number().int().nonnegative(),
  items: z.array(SkillEvidenceContextItemSchema).max(20).default([]),
});
export type SkillEvidenceContext = z.infer<typeof SkillEvidenceContextSchema>;
