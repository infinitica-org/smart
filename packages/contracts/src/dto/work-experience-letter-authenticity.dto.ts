import { z } from 'zod';
import { WorkExperienceDocumentAuthenticityStatusSchema } from '../domain/enums.js';
import { IsoDateTimeSchema, UuidSchema } from './common.js';
import type { WorkExperienceDocumentDto } from './work-experience.dto.js';

export const WorkExperienceLetterAuthenticityExtractSchema = z.object({
  candidateName: z.string().nullable(),
  companyName: z.string().nullable(),
  companyDomain: z.string().nullable(),
  hasLetterhead: z.boolean(),
  hasSignatureBlock: z.boolean(),
  confidence: z.number().min(0).max(1),
});
export type WorkExperienceLetterAuthenticityExtract = z.infer<
  typeof WorkExperienceLetterAuthenticityExtractSchema
>;

export const WorkExperienceLetterAuthenticityResultSchema = z.object({
  companyNameMatch: z.boolean(),
  domainMatch: z.boolean(),
  hasLetterhead: z.boolean(),
  hasSignatureBlock: z.boolean(),
  ocrConfidence: z.number().min(0).max(1),
  flagReasons: z.array(z.string()),
});
export type WorkExperienceLetterAuthenticityResult = z.infer<
  typeof WorkExperienceLetterAuthenticityResultSchema
>;

export const WorkExperienceDocumentAuthenticitySchema = z.object({
  status: WorkExperienceDocumentAuthenticityStatusSchema,
  result: WorkExperienceLetterAuthenticityResultSchema.nullable(),
  checkedAt: IsoDateTimeSchema.nullable(),
});
export type WorkExperienceDocumentAuthenticity = z.infer<
  typeof WorkExperienceDocumentAuthenticitySchema
>;

export const WorkExperienceDocumentPublicSchema = z.object({
  id: UuidSchema,
  experienceId: UuidSchema,
  documentType: z.string(),
  fileName: z.string(),
  fileSizeBytes: z.number().int().positive(),
  mimeType: z.string(),
  authenticityStatus: WorkExperienceDocumentAuthenticityStatusSchema,
  createdAt: IsoDateTimeSchema,
});
export type WorkExperienceDocumentPublicDto = z.infer<typeof WorkExperienceDocumentPublicSchema>;

export const AdminWorkExperienceReviewRequestSchema = z.object({
  reason: z.string().trim().min(8).max(500),
});
export type AdminWorkExperienceReviewRequest = z.infer<
  typeof AdminWorkExperienceReviewRequestSchema
>;

export const ApproveWorkExperienceAuthenticityResponseSchema = z.object({
  id: UuidSchema,
  flaggedDocumentsCleared: z.number().int().nonnegative(),
  approvedAt: IsoDateTimeSchema,
});
export type ApproveWorkExperienceAuthenticityResponse = z.infer<
  typeof ApproveWorkExperienceAuthenticityResponseSchema
>;

/** Company-lite / B2B surfaces — metadata only, never the raw letter file. */
export function toWorkExperienceDocumentPublicDto(
  doc: WorkExperienceDocumentDto,
): WorkExperienceDocumentPublicDto {
  return WorkExperienceDocumentPublicSchema.parse({
    id: doc.id,
    experienceId: doc.experienceId,
    documentType: doc.documentType,
    fileName: doc.fileName,
    fileSizeBytes: doc.fileSizeBytes,
    mimeType: doc.mimeType,
    authenticityStatus: doc.authenticityStatus,
    createdAt: doc.createdAt,
  });
}
