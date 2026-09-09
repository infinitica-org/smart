import { z } from 'zod';

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
