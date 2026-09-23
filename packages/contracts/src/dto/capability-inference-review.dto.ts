import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from './common.js';
import { PROFICIENCY_LEVEL_ORDER } from '../domain/skill-levels.js';

export const CorrectStudentCapabilityRequestSchema = z.object({
  proficiency: z.enum(PROFICIENCY_LEVEL_ORDER).optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
  reviewerNote: z.string().min(5).max(2000),
});
export type CorrectStudentCapabilityRequest = z.infer<typeof CorrectStudentCapabilityRequestSchema>;

export const CorrectStudentCapabilityResponseSchema = z.object({
  capabilityId: UuidSchema,
  proficiency: z.enum(PROFICIENCY_LEVEL_ORDER),
  confidenceScore: z.number().min(0).max(1),
  reviewerId: UuidSchema,
  correctedAt: IsoDateTimeSchema,
});
export type CorrectStudentCapabilityResponse = z.infer<
  typeof CorrectStudentCapabilityResponseSchema
>;
