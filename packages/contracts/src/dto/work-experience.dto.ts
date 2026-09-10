import { z } from 'zod';
import {
  EmploymentTypeSchema,
  ExperienceDocumentTypeSchema,
  WorkExperienceDocumentAuthenticityStatusSchema,
  WorkExperienceVerificationStatusSchema,
} from '../domain/enums.js';
import { SkillsClaimedSnapshotSchema, TaxonomySkillCodeSchema } from './catalog.dto.js';
import { WorkExperienceLetterAuthenticityResultSchema } from './work-experience-letter-authenticity.dto.js';

export const WorkExperienceDocumentSchema = z.object({
  id: z.string().uuid(),
  experienceId: z.string().uuid(),
  documentType: ExperienceDocumentTypeSchema,
  fileUrl: z.string().min(1),
  fileName: z.string().min(1),
  fileSizeBytes: z.number().int().positive(),
  mimeType: z.string().min(1),
  authenticityStatus: WorkExperienceDocumentAuthenticityStatusSchema.default('pending'),
  authenticityResult: WorkExperienceLetterAuthenticityResultSchema.nullable().optional(),
  createdAt: z.string().datetime(),
});
export type WorkExperienceDocumentDto = z.infer<typeof WorkExperienceDocumentSchema>;

export const CreateWorkExperienceDocumentSchema = z.object({
  documentType: ExperienceDocumentTypeSchema,
  fileUrl: z.string().min(1, 'File URL is required'),
  fileName: z.string().min(1, 'File name is required'),
  fileSizeBytes: z.number().int().positive('File size must be positive'),
  mimeType: z.string().min(1, 'MIME type is required'),
});
export type CreateWorkExperienceDocumentDto = z.infer<typeof CreateWorkExperienceDocumentSchema>;

export const CreateWorkExperienceBaseSchema = z.object({
  organizationId: z.string().uuid().optional().nullable(),
  companyId: z.string().uuid().optional().nullable(),
  companyName: z.string().min(1, 'Company name is required').max(200),
  companyWebsite: z
    .string()
    .url('Invalid company website URL')
    .optional()
    .nullable()
    .or(z.literal('')),
  companyLinkedinUrl: z
    .string()
    .url('Invalid company LinkedIn URL')
    .optional()
    .nullable()
    .or(z.literal('')),
  role: z.string().min(1, 'Role/designation is required').max(200),
  employmentType: EmploymentTypeSchema.default('FULL_TIME'),
  department: z.string().max(120).optional().nullable().or(z.literal('')),
  domain: z.string().max(120).optional().nullable().or(z.literal('')),
  workLocation: z.string().max(120).optional().nullable().or(z.literal('')),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional().nullable().or(z.literal('')),
  isCurrent: z.boolean().default(false),
  responsibilities: z.string().max(4000).optional().nullable().or(z.literal('')),
  /** Taxonomy skill codes from GET /catalog/skills — never free text (SK-T01). */
  skillsClaimed: z.array(TaxonomySkillCodeSchema).max(20).default([]),
  projects: z.unknown().optional().nullable(),
  candidateLinkedin: z
    .string()
    .url('Invalid candidate LinkedIn URL')
    .optional()
    .nullable()
    .or(z.literal('')),
  verifierName: z.string().max(120).optional().nullable().or(z.literal('')),
  verifierEmail: z
    .string()
    .email('Invalid verifier email format')
    .optional()
    .nullable()
    .or(z.literal('')),
  verifierDesignation: z.string().max(120).optional().nullable().or(z.literal('')),
  verifierPhone: z.string().max(32).optional().nullable().or(z.literal('')),
});

export const CreateWorkExperienceSchema = CreateWorkExperienceBaseSchema.refine(
  (data) => {
    if (!data.isCurrent && !data.endDate) {
      return false;
    }
    return true;
  },
  {
    message: 'End date is required if not currently employed',
    path: ['endDate'],
  },
);
export type CreateWorkExperienceDto = z.infer<typeof CreateWorkExperienceSchema>;

export const UpdateWorkExperienceSchema = CreateWorkExperienceBaseSchema.partial();
export type UpdateWorkExperienceDto = z.infer<typeof UpdateWorkExperienceSchema>;

export const WorkExperienceSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  organizationId: z.string().uuid().nullable().optional(),
  companyId: z.string().uuid().nullable(),
  companyName: z.string(),
  companyNameRaw: z.string().nullable().optional(),
  companyWebsite: z.string().nullable(),
  companyLinkedinUrl: z.string().nullable(),
  role: z.string(),
  employmentType: EmploymentTypeSchema,
  department: z.string().nullable(),
  domain: z.string().nullable(),
  workLocation: z.string().nullable(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  isCurrent: z.boolean(),
  responsibilities: z.string().nullable(),
  skillsClaimed: z.array(TaxonomySkillCodeSchema),
  /** Frozen at employer verification — codes + taxonomy version at verify time. */
  skillsClaimedSnapshot: SkillsClaimedSnapshotSchema.nullable().optional(),
  projects: z.unknown().nullable(),
  candidateLinkedin: z.string().nullable(),
  verifierName: z.string().nullable(),
  verifierEmail: z.string().nullable(),
  verifierDesignation: z.string().nullable(),
  verifierPhone: z.string().nullable(),
  status: WorkExperienceVerificationStatusSchema,
  rejectionReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  documents: z.array(WorkExperienceDocumentSchema).default([]),
});
export type WorkExperienceDto = z.infer<typeof WorkExperienceSchema>;

export const SendWorkExperienceVerificationResponseSchema = z.object({
  success: z.boolean(),
  experienceId: z.string().uuid(),
  status: WorkExperienceVerificationStatusSchema,
  message: z.string(),
  expiresAt: z.string(),
});
export type SendWorkExperienceVerificationResponseDto = z.infer<
  typeof SendWorkExperienceVerificationResponseSchema
>;

export const GetWorkExperienceVerificationResponseSchema = z.object({
  experienceId: z.string().uuid(),
  candidateName: z.string(),
  companyName: z.string(),
  role: z.string(),
  employmentType: EmploymentTypeSchema,
  startDate: z.string(),
  endDate: z.string().nullable(),
  isCurrent: z.boolean(),
  responsibilities: z.string().nullable(),
  verifierName: z.string().nullable(),
  verifierEmail: z.string(),
  verifierDesignation: z.string().nullable(),
  status: WorkExperienceVerificationStatusSchema,
  expiresAt: z.string(),
  isExpired: z.boolean(),
  isAlreadyResponded: z.boolean(),
});
export type GetWorkExperienceVerificationResponseDto = z.infer<
  typeof GetWorkExperienceVerificationResponseSchema
>;

export const EmployerVerificationDecisionSchema = z.enum([
  'YES',
  'NO',
  'PARTIAL',
  'NEED_CLARIFICATION',
]);
export type EmployerVerificationDecision = z.infer<typeof EmployerVerificationDecisionSchema>;

export const SubmitWorkExperienceVerificationSchema = z.object({
  approved: z.boolean().optional(),
  decision: EmployerVerificationDecisionSchema.optional(),
  comments: z.string().max(2000).optional().nullable().or(z.literal('')),
});
export type SubmitWorkExperienceVerificationDto = z.infer<
  typeof SubmitWorkExperienceVerificationSchema
>;

export const SubmitWorkExperienceVerificationResponseSchema = z.object({
  success: z.boolean(),
  status: WorkExperienceVerificationStatusSchema,
  message: z.string(),
});
export type SubmitWorkExperienceVerificationResponseDto = z.infer<
  typeof SubmitWorkExperienceVerificationResponseSchema
>;

export const WorkExperienceOpsDashboardItemSchema = z.object({
  experienceId: z.string().uuid(),
  candidateId: z.string().uuid(),
  candidateName: z.string(),
  candidateEmail: z.string(),
  companyName: z.string(),
  companyWebsite: z.string().nullable(),
  role: z.string(),
  status: WorkExperienceVerificationStatusSchema,
  currentStep: z.string(),
  emailState: z.string(),
  timeRemainingHours: z.number(),
  flaggedDocumentCount: z.number().int().nonnegative(),
  hasFlaggedDocuments: z.boolean(),
  createdAt: z.string(),
});
export type WorkExperienceOpsDashboardItemDto = z.infer<
  typeof WorkExperienceOpsDashboardItemSchema
>;
