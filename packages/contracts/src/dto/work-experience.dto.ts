import { z } from 'zod';
import {
  EmploymentTypeSchema,
  ExperienceDocumentTypeSchema,
  ManagerEndorsementStatusSchema,
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
  documents: z.array(CreateWorkExperienceDocumentSchema).optional().default([]),
});

export interface WorkExperienceLetterValidationResult {
  valid: boolean;
  hasOfferLetter: boolean;
  hasCompletionLetter: boolean;
  missingDocuments: ('OFFER_LETTER' | 'COMPLETION_LETTER')[];
  message?: string;
}

export function validateWorkExperienceLetterRules(params: {
  isCurrent: boolean;
  endDate?: string | null;
  documents?: Array<{ documentType: string }>;
}): WorkExperienceLetterValidationResult {
  const docs = params.documents ?? [];
  const hasOfferLetter = docs.some((d) => d.documentType === 'OFFER_LETTER');
  const hasCompletionLetter = docs.some(
    (d) => d.documentType === 'RELIEVING_LETTER' || d.documentType === 'EXPERIENCE_LETTER',
  );
  const isEnded = !params.isCurrent && Boolean(params.endDate);

  const missingDocuments: ('OFFER_LETTER' | 'COMPLETION_LETTER')[] = [];
  if (!hasOfferLetter) {
    missingDocuments.push('OFFER_LETTER');
  }
  if (isEnded && !hasCompletionLetter) {
    missingDocuments.push('COMPLETION_LETTER');
  }

  const valid = missingDocuments.length === 0;
  let message: string | undefined;
  if (!valid) {
    if (
      missingDocuments.includes('OFFER_LETTER') &&
      missingDocuments.includes('COMPLETION_LETTER')
    ) {
      message =
        'An offer letter and a completion/relieving letter are both required for ended roles.';
    } else if (missingDocuments.includes('OFFER_LETTER')) {
      message = 'An offer letter is required for all work experience claims.';
    } else if (missingDocuments.includes('COMPLETION_LETTER')) {
      message = 'A completion or relieving letter is required when a role has ended.';
    }
  }

  return {
    valid,
    hasOfferLetter,
    hasCompletionLetter,
    missingDocuments,
    message,
  };
}

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

/* -------------------- WE-T03: Manager Endorsement -------------------- */

/**
 * Per-skill rating the manager provides in the endorsement survey.
 * Rating 1–5 (1 = not demonstrated, 5 = exceptional).
 */
export const ManagerSkillRatingSchema = z.object({
  skillCode: TaxonomySkillCodeSchema,
  rating: z.number().int().min(1).max(5),
});
export type ManagerSkillRatingDto = z.infer<typeof ManagerSkillRatingSchema>;

/**
 * Request body: candidate asks SMART to send a manager endorsement email.
 * manager_email must be a corporate address; server-side domain matching
 * against the offer-letter domain or Organization.domain is also performed.
 */
export const SendManagerEndorsementSchema = z.object({
  managerEmail: z.string().email('Invalid manager email').min(1, 'Manager email is required'),
  managerName: z.string().min(1).max(120).optional().nullable(),
});
export type SendManagerEndorsementDto = z.infer<typeof SendManagerEndorsementSchema>;

/** Response returned after successfully dispatching the endorsement email. */
export const SendManagerEndorsementResponseSchema = z.object({
  success: z.boolean(),
  endorsementId: z.string().uuid(),
  managerEmail: z.string(),
  expiresAt: z.string().datetime(),
  message: z.string(),
});
export type SendManagerEndorsementResponseDto = z.infer<
  typeof SendManagerEndorsementResponseSchema
>;

/**
 * The payload returned when the manager opens their magic link.
 * Only exposes fields the manager needs to make an informed decision;
 * no student PII beyond name + role + company + claimed skills.
 */
export const GetManagerEndorsementSurveySchema = z.object({
  endorsementId: z.string().uuid(),
  candidateName: z.string(),
  companyName: z.string(),
  role: z.string(),
  employmentType: EmploymentTypeSchema,
  startDate: z.string(),
  endDate: z.string().nullable(),
  isCurrent: z.boolean(),
  responsibilities: z.string().nullable(),
  /** Skills the candidate has claimed — manager rates them 1–5. */
  skillsClaimed: z.array(TaxonomySkillCodeSchema),
  managerEmail: z.string(),
  managerName: z.string().nullable(),
  status: ManagerEndorsementStatusSchema,
  expiresAt: z.string(),
  isExpired: z.boolean(),
  isAlreadyResponded: z.boolean(),
});
export type GetManagerEndorsementSurveyDto = z.infer<typeof GetManagerEndorsementSurveySchema>;

/**
 * Manager submits their endorsement decision.
 * `confirmed: true` → CONFIRMED  |  `confirmed: false` → DISPUTED
 * skillRatings are optional — manager may confirm holistically without
 * per-skill ratings.
 */
export const SubmitManagerEndorsementSchema = z.object({
  confirmed: z.boolean(),
  skillRatings: z.array(ManagerSkillRatingSchema).max(20).optional(),
  comments: z.string().max(2000).optional().nullable().or(z.literal('')),
});
export type SubmitManagerEndorsementDto = z.infer<typeof SubmitManagerEndorsementSchema>;

export const SubmitManagerEndorsementResponseSchema = z.object({
  success: z.boolean(),
  status: ManagerEndorsementStatusSchema,
  message: z.string(),
});
export type SubmitManagerEndorsementResponseDto = z.infer<
  typeof SubmitManagerEndorsementResponseSchema
>;
