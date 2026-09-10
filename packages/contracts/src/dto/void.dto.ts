import { z } from 'zod';
import {
  CandidateCertificateStatusSchema,
  WorkExperienceVerificationStatusSchema,
} from '../domain/enums.js';
import { IsoDateTimeSchema, UuidSchema } from './common.js';

/**
 * SA-T08 — extends the v0.9 fraud/void action (previously assessment-attempt only,
 * see `ResolveIntegrityRequestSchema`) to a certification or work-experience row.
 * One-directional: there is no "un-void". Every void writes an immutable audit_logs row.
 */
export const VoidRequestSchema = z.object({
  reason: z.string().trim().min(8).max(500),
});
export type VoidRequest = z.infer<typeof VoidRequestSchema>;

export const VoidWorkExperienceResponseSchema = z.object({
  id: UuidSchema,
  status: WorkExperienceVerificationStatusSchema,
  voidedAt: IsoDateTimeSchema,
});
export type VoidWorkExperienceResponse = z.infer<typeof VoidWorkExperienceResponseSchema>;

export const VoidCandidateCertificateResponseSchema = z.object({
  id: UuidSchema,
  status: CandidateCertificateStatusSchema,
  voidedAt: IsoDateTimeSchema,
});
export type VoidCandidateCertificateResponse = z.infer<
  typeof VoidCandidateCertificateResponseSchema
>;
