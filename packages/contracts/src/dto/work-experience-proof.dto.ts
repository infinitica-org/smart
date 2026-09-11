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

/** S6-VB-01 — proof validation reason codes (never auto-fraud). */
export const WORK_EXPERIENCE_PROOF_REASON_CODES = [
  'INVALID_DOCUMENT_TYPE',
  'PROOF_VALIDATED',
  'PROOF_REJECTED',
  'NEEDS_MANUAL_REVIEW',
] as const;
export const WorkExperienceProofReasonCodeSchema = z.enum(WORK_EXPERIENCE_PROOF_REASON_CODES);
export type WorkExperienceProofReasonCode = z.infer<typeof WorkExperienceProofReasonCodeSchema>;

/** Attachment or AI-classified types that cannot establish completed employment. */
export const INVALID_EMPLOYMENT_PROOF_ATTACHMENT_TYPES = ['OFFER_LETTER'] as const;

export function isInvalidEmploymentProofAttachmentType(documentType: string): boolean {
  return (INVALID_EMPLOYMENT_PROOF_ATTACHMENT_TYPES as readonly string[]).includes(documentType);
}

export function isInvalidEmploymentProofClassification(params: {
  documentType: string;
  isActualEmploymentProof: boolean;
  isOfferLetter?: boolean;
}): boolean {
  if (isInvalidEmploymentProofAttachmentType(params.documentType)) {
    return true;
  }
  if (params.isOfferLetter === true) {
    return true;
  }
  return !params.isActualEmploymentProof;
}

export const INVALID_EMPLOYMENT_PROOF_MESSAGE =
  'This document type establishes hiring intent, not completed employment. Upload a completion, relieving, service, or experience letter instead.';

export const WorkExperienceProofValidationResultSchema = z.object({
  validationStatus: z.enum(['VALIDATED', 'REJECTED', 'NEEDS_MANUAL_REVIEW']),
  documentType: ExperienceDocumentTypeSchema,
  isOfferLetter: z.boolean(),
  extractedData: WorkExperienceProofExtractedDataSchema,
  matchResult: WorkExperienceProofMatchResultSchema,
  rejectionReason: z.string().nullable(),
  reasonCode: WorkExperienceProofReasonCodeSchema.nullable().optional(),
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
