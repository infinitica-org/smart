import { z } from 'zod';
import { SkillProficiencySchema } from '../domain/enums.js';
import { CandidateResumeFileSchema } from './candidate-onboarding.dto.js';

/**
 * CN-T02 — LLM resume parse for onboarding pre-fill.
 *
 * Implementation owner: Ramansh (`ai-gateway` + prompts). Consumers:
 * Satheswaran V (`web-student` wizard) and Vishal Bharath R (profile persist).
 *
 * Parse output is a **draft**. The student can always edit. The model must not
 * invent catalog skill codes, verification status, or row ids — those are
 * assigned after pre-fill.
 */

export const LANGUAGE_FLUENCIES = ['NATIVE', 'FLUENT', 'CONVERSATIONAL', 'BASIC'] as const;
export const LanguageFluencySchema = z.enum(LANGUAGE_FLUENCIES);
export type LanguageFluency = z.infer<typeof LanguageFluencySchema>;

export const RESUME_PARSE_STATUSES = ['PARSED', 'FAILED'] as const;
export const ResumeParseStatusSchema = z.enum(RESUME_PARSE_STATUSES);
export type ResumeParseStatus = z.infer<typeof ResumeParseStatusSchema>;

/** Header fields the resume may contain; all optional so a sparse header is valid. */
export const ResumeParseBasicInfoSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phoneNumber: z.string().min(1).max(32).optional(),
  phoneCountryCode: z.string().min(1).max(8).optional(),
  linkedinUrl: z.union([z.url(), z.literal('')]).optional(),
  currentCollege: z.string().min(1).max(200).optional(),
  summary: z.string().min(1).max(4000).optional(),
});
export type ResumeParseBasicInfo = z.infer<typeof ResumeParseBasicInfoSchema>;

export const ResumeParseEducationSchema = z.object({
  institutionName: z.string().min(1).max(200),
  degree: z.string().min(1).max(120).optional(),
  fieldOfStudy: z.string().min(1).max(120).optional(),
  startDate: z.string().min(1).max(32).optional(),
  endDate: z.string().min(1).max(32).optional(),
  current: z.boolean().optional(),
  grade: z.string().min(1).max(40).optional(),
});
export type ResumeParseEducation = z.infer<typeof ResumeParseEducationSchema>;

export const ResumeParseExperienceSchema = z.object({
  role: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  location: z.string().min(1).max(120).optional(),
  startDate: z.string().min(1).max(32).optional(),
  endDate: z.string().min(1).max(32).optional(),
  description: z.string().min(1).max(4000).optional(),
  tags: z.array(z.string().min(1).max(100)).max(20).default([]),
});
export type ResumeParseExperience = z.infer<typeof ResumeParseExperienceSchema>;

export const ResumeParseTechnicalSkillSchema = z.object({
  type: z.literal('technical'),
  name: z.string().min(1).max(80),
  proficiency: SkillProficiencySchema,
});

export const ResumeParseLanguageSkillSchema = z.object({
  type: z.literal('language'),
  name: z.string().min(1).max(80),
  proficiency: LanguageFluencySchema,
});

export const ResumeParseSkillSchema = z.discriminatedUnion('type', [
  ResumeParseTechnicalSkillSchema,
  ResumeParseLanguageSkillSchema,
]);
export type ResumeParseSkill = z.infer<typeof ResumeParseSkillSchema>;

/** Professional licenses and certifications (Product Owner, 1 Sep 2026 — was missing). */
export const LicenseCredentialSchema = z.object({
  name: z.string().min(1).max(200),
  issuer: z.string().min(1).max(200),
  credentialId: z.string().min(1).max(120).optional(),
  issuedOn: z.string().min(1).max(32).optional(),
  expiresOn: z.string().min(1).max(32).optional(),
  url: z.union([z.url(), z.literal('')]).optional(),
});
export type LicenseCredential = z.infer<typeof LicenseCredentialSchema>;

/**
 * Schema-validated LLM JSON. Empty arrays are a valid parse (nothing extractable).
 * `FAILED` is reserved for gateway/schema exhaustion — the UI then skips pre-fill.
 */
export const ResumeParseDraftSchema = z.object({
  basicInfo: ResumeParseBasicInfoSchema.optional(),
  education: z.array(ResumeParseEducationSchema).max(20).default([]),
  experiences: z.array(ResumeParseExperienceSchema).max(30).default([]),
  skills: z.array(ResumeParseSkillSchema).max(40).default([]),
  licenses: z.array(LicenseCredentialSchema).max(20).default([]),
  parseConfidence: z.number().min(0).max(1),
  /** Dotted paths the model could not fill (e.g. `education.0.endDate`). */
  missingFields: z.array(z.string().min(1).max(120)).max(80).default([]),
});
export type ResumeParseDraft = z.infer<typeof ResumeParseDraftSchema>;

export const ParseResumeRequestSchema = z
  .object({
    /** Extracted plain text. v1 path while resume object storage is still open. */
    rawText: z.string().min(40).max(80_000).optional(),
    /** R2/MinIO object key once CN-T01 upload persists a blob. */
    objectKey: z.string().min(1).max(512).optional(),
  })
  .refine((value) => Boolean(value.rawText?.trim()) || Boolean(value.objectKey?.trim()), {
    message: 'Provide resume rawText or objectKey.',
  });
export type ParseResumeRequest = z.infer<typeof ParseResumeRequestSchema>;

export const ParseResumeResponseSchema = z.object({
  status: ResumeParseStatusSchema,
  draft: ResumeParseDraftSchema.nullable(),
});
export type ParseResumeResponse = z.infer<typeof ParseResumeResponseSchema>;

/** Maximum resume files a candidate may store on their profile. */
export const CANDIDATE_RESUME_FILES_MAX = 5;

export const CandidateResumeFilesSchema = z
  .array(CandidateResumeFileSchema)
  .max(CANDIDATE_RESUME_FILES_MAX);

export const CandidateResumeStateResponseSchema = z.object({
  /** Most recently uploaded file — kept for older clients. */
  resumeFile: CandidateResumeFileSchema.nullable(),
  resumeFiles: CandidateResumeFilesSchema.default([]),
});
export type CandidateResumeStateResponse = z.infer<typeof CandidateResumeStateResponseSchema>;

export const UploadResumeResponseSchema = z.object({
  resumeFile: CandidateResumeFileSchema,
  resumeFiles: CandidateResumeFilesSchema,
});
export type UploadResumeResponse = z.infer<typeof UploadResumeResponseSchema>;

export const DeleteResumeRequestSchema = z.object({
  objectKey: z.string().min(1).max(512),
});
export type DeleteResumeRequest = z.infer<typeof DeleteResumeRequestSchema>;

export const DeleteResumeResponseSchema = z.object({
  resumeFiles: CandidateResumeFilesSchema,
});
export type DeleteResumeResponse = z.infer<typeof DeleteResumeResponseSchema>;
