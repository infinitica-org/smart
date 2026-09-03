import { z } from 'zod';
import {
  ExperienceDocumentTypeSchema,
  WorkExperienceVerificationStatusSchema,
} from '../domain/enums.js';

export const WorkExperienceProofExtractedDataSchema = z.object({
  documentType: ExperienceDocumentTypeSchema,
  isActualEmploymentProof: z.boolean(),
  candidateName: z.string().nullable(),
  companyName: z.string().nullable(),
  role: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});
export type WorkExperienceProofExtractedData = z.infer<
  typeof WorkExperienceProofExtractedDataSchema
>;

export const WorkExperienceProofMatchResultSchema = z.object({
  candidateNameMatch: z.boolean(),
  companyNameMatch: z.boolean(),
  roleMatch: z.boolean(),
  dateMatch: z.boolean(),
});
export type WorkExperienceProofMatchResult = z.infer<typeof WorkExperienceProofMatchResultSchema>;

export const WorkExperienceProofValidationResultSchema = z.object({
  validationStatus: z.enum(['VALIDATED', 'REJECTED']),
  documentType: ExperienceDocumentTypeSchema,
  isOfferLetter: z.boolean(),
  extractedData: WorkExperienceProofExtractedDataSchema,
  matchResult: WorkExperienceProofMatchResultSchema,
  rejectionReason: z.string().nullable(),
  validatedAt: z.string(),
});
export type WorkExperienceProofValidationResult = z.infer<
  typeof WorkExperienceProofValidationResultSchema
>;

export const ValidateWorkExperienceProofResponseSchema = z.object({
  experienceId: z.string().uuid(),
  documentId: z.string().uuid(),
  experienceStatus: WorkExperienceVerificationStatusSchema,
  validationResult: WorkExperienceProofValidationResultSchema,
});
export type ValidateWorkExperienceProofResponse = z.infer<
  typeof ValidateWorkExperienceProofResponseSchema
>;
