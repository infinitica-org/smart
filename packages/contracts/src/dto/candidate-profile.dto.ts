import { z } from 'zod';
import { EducationDocumentTypeSchema, SharedVerificationStatusSchema } from '../domain/enums.js';
import { CandidateAcademicScoresSchema } from './candidate-onboarding.dto.js';

export const CandidateEducationDocumentSchema = z.object({
  id: z.string().uuid(),
  educationId: z.string().uuid(),
  documentType: EducationDocumentTypeSchema,
  fileUrl: z.string().min(1),
  fileName: z.string().min(1),
  fileSizeBytes: z.number().int().positive(),
  mimeType: z.string().min(1),
  createdAt: z.string(),
});
export type CandidateEducationDocumentDto = z.infer<typeof CandidateEducationDocumentSchema>;

export const CreateCandidateEducationDocumentSchema = z.object({
  documentType: EducationDocumentTypeSchema,
  fileUrl: z.string().min(1, 'File URL is required'),
  fileName: z.string().min(1, 'File name is required'),
  fileSizeBytes: z.number().int().positive('File size must be positive'),
  mimeType: z.string().min(1, 'MIME type is required'),
});
export type CreateCandidateEducationDocumentDto = z.infer<
  typeof CreateCandidateEducationDocumentSchema
>;

export const CandidateEducationSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  institutionName: z.string().min(1, 'Institution name is required').max(200),
  degree: z.string().max(120).nullable().optional(),
  fieldOfStudy: z.string().max(120).nullable().optional(),
  startDate: z.string().max(32).nullable().optional(),
  endDate: z.string().max(32).nullable().optional(),
  current: z.boolean().default(false),
  grade: z.string().max(40).nullable().optional(),
  status: SharedVerificationStatusSchema.default('unverified'),
  rejectionReason: z.string().max(500).nullable().optional(),
  documents: z.array(CandidateEducationDocumentSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CandidateEducationDto = z.infer<typeof CandidateEducationSchema>;

export const CreateCandidateEducationSchema = z.object({
  institutionName: z.string().min(1, 'Institution name is required').max(200),
  degree: z.string().max(120).optional().nullable().or(z.literal('')),
  fieldOfStudy: z.string().max(120).optional().nullable().or(z.literal('')),
  startDate: z.string().max(32).optional().nullable().or(z.literal('')),
  endDate: z.string().max(32).optional().nullable().or(z.literal('')),
  current: z.boolean().default(false).optional(),
  grade: z.string().max(40).optional().nullable().or(z.literal('')),
});
export type CreateCandidateEducationDto = z.infer<typeof CreateCandidateEducationSchema>;

export const UpdateCandidateEducationSchema = CreateCandidateEducationSchema.partial();
export type UpdateCandidateEducationDto = z.infer<typeof UpdateCandidateEducationSchema>;

export const RejectCandidateEducationSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required').max(500),
});
export type RejectCandidateEducationDto = z.infer<typeof RejectCandidateEducationSchema>;

/** S6-VV-75 — profile-page PATCH for the `User`-level CGPA/10th/12th fields. */
export const UpdateAcademicScoresRequestSchema = CandidateAcademicScoresSchema;
export type UpdateAcademicScoresRequest = z.infer<typeof UpdateAcademicScoresRequestSchema>;

export const CandidateLanguageSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  language: z.string().min(1, 'Language is required').max(80),
  proficiency: z.string().min(1, 'Proficiency is required').max(40),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CandidateLanguageDto = z.infer<typeof CandidateLanguageSchema>;

export const CreateCandidateLanguageSchema = z.object({
  language: z.string().min(1, 'Language is required').max(80),
  proficiency: z.string().min(1, 'Proficiency is required').max(40),
});
export type CreateCandidateLanguageDto = z.infer<typeof CreateCandidateLanguageSchema>;

export const UpdateCandidateLanguageSchema = CreateCandidateLanguageSchema.partial();
export type UpdateCandidateLanguageDto = z.infer<typeof UpdateCandidateLanguageSchema>;
