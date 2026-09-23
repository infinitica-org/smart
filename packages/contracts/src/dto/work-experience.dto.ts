import { z } from 'zod';
import {
  EmploymentTypeSchema,
  ExperienceDocumentTypeSchema,
  ManagerEndorsementStatusSchema,
  WorkExperienceDocumentAuthenticityStatusSchema,
  WorkExperienceVerificationStatusSchema,
} from '../domain/enums.js';
import {
  ContributionSchema,
  SkillMappingSchema,
  WorkExperienceEvidenceSchema,
  WorkExperienceResponsibilitySchema,
} from '../domain/evidence/index.js';
import { SkillsClaimedSnapshotSchema, TaxonomySkillCodeSchema } from './catalog.dto.js';
import { WorkExperienceLetterAuthenticityResultSchema } from './work-experience-letter-authenticity.dto.js';

/** Optional structured evidence metadata on create/update (Evidence Framework). */
export const WorkExperienceStructuredMetadataSchema = z.object({
  structuredResponsibilities: z.array(WorkExperienceResponsibilitySchema).max(50).optional(),
  deliverables: z.array(z.string().max(2000)).max(50).optional(),
  personalContributions: z.array(ContributionSchema).max(50).optional(),
  skillMappings: z.array(SkillMappingSchema).max(50).optional(),
});
export type WorkExperienceStructuredMetadata = z.infer<
  typeof WorkExperienceStructuredMetadataSchema
>;

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
  structuredResponsibilities: z.array(WorkExperienceResponsibilitySchema).max(50).optional(),
  deliverables: z.array(z.string().max(2000)).max(50).optional(),
  personalContributions: z.array(ContributionSchema).max(50).optional(),
  skillMappings: z.array(SkillMappingSchema).max(50).optional(),
});

export interface CompanyPublicIdentityParams {
  companyId?: string | null;
  companyWebsite?: string | null;
  companyLinkedinUrl?: string | null;
  catalogCompanyWebsite?: string | null;
  catalogCompanyLinkedinUrl?: string | null;
}

/** S6-VB-01 — public company identity required when employer has a known public presence. */
export function companyRequiresPublicIdentity(params: CompanyPublicIdentityParams): boolean {
  if (params.companyId) {
    return true;
  }
  if (params.catalogCompanyWebsite?.trim() || params.catalogCompanyLinkedinUrl?.trim()) {
    return true;
  }
  if (params.companyWebsite?.trim()) {
    return true;
  }
  return false;
}

export function validateCompanyPublicIdentity(params: {
  companyWebsite?: string | null;
  companyLinkedinUrl?: string | null;
  required: boolean;
}): { valid: boolean; message?: string; field?: 'companyWebsite' | 'companyLinkedinUrl' } {
  if (!params.required) {
    return { valid: true };
  }
  const website = params.companyWebsite?.trim();
  const linkedin = params.companyLinkedinUrl?.trim();
  if (!website) {
    return {
      valid: false,
      message:
        'Company website is required when the employer has a public presence or is matched in the catalog.',
      field: 'companyWebsite',
    };
  }
  if (!linkedin) {
    return {
      valid: false,
      message:
        'Company LinkedIn URL is required when the employer has a public presence or is matched in the catalog.',
      field: 'companyLinkedinUrl',
    };
  }
  return { valid: true };
}

function applyCompanyPublicIdentityRefinement(
  data: z.infer<typeof CreateWorkExperienceBaseSchema>,
  ctx: z.RefinementCtx,
): void {
  const required = companyRequiresPublicIdentity({
    companyId: data.companyId,
    companyWebsite: data.companyWebsite,
  });
  const result = validateCompanyPublicIdentity({
    companyWebsite: data.companyWebsite,
    companyLinkedinUrl: data.companyLinkedinUrl,
    required,
  });
  if (!result.valid && result.message) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: result.message,
      path: [result.field ?? 'companyWebsite'],
    });
  }
}

export interface WorkExperienceMandatoryFieldIssue {
  field: 'domain' | 'responsibilities' | 'skillsClaimed';
  message: string;
}

/** S6-VB-01 — always-required claim fields beyond base Zod string mins. */
export function validateWorkExperienceMandatoryFields(params: {
  domain?: string | null;
  responsibilities?: string | null;
  skillsClaimed?: string[] | null;
}): { valid: boolean; issues: WorkExperienceMandatoryFieldIssue[] } {
  const issues: WorkExperienceMandatoryFieldIssue[] = [];

  if (!params.domain?.trim()) {
    issues.push({
      field: 'domain',
      message: 'Professional domain is required.',
    });
  }
  if (!params.responsibilities?.trim()) {
    issues.push({
      field: 'responsibilities',
      message: 'Responsibilities and accomplishments are required.',
    });
  }
  if (!params.skillsClaimed || params.skillsClaimed.length < 1) {
    issues.push({
      field: 'skillsClaimed',
      message: 'At least one skill from the catalog is required.',
    });
  }

  return { valid: issues.length === 0, issues };
}

export interface WorkExperienceValidationInput {
  companyName?: string | null;
  role?: string | null;
  employmentType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
  domain?: string | null;
  responsibilities?: string | null;
  skillsClaimed?: string[] | null;
  companyId?: string | null;
  companyWebsite?: string | null;
  companyLinkedinUrl?: string | null;
  catalogCompanyWebsite?: string | null;
  catalogCompanyLinkedinUrl?: string | null;
  documents?: Array<{ documentType: string }> | null;
}

export interface WorkExperienceValidationIssue {
  path: string;
  message: string;
}

export interface WorkExperienceValidationResult {
  valid: boolean;
  issues: WorkExperienceValidationIssue[];
}

/** Merge an existing record with a partial update for effective validation. */
export function mergeWorkExperienceValidationInput(
  existing: WorkExperienceValidationInput,
  patch: Partial<WorkExperienceValidationInput>,
): WorkExperienceValidationInput {
  return {
    ...existing,
    ...patch,
    skillsClaimed: patch.skillsClaimed !== undefined ? patch.skillsClaimed : existing.skillsClaimed,
    documents: patch.documents !== undefined ? patch.documents : existing.documents,
  };
}

/**
 * S6-VB-01 — full submission validation for create and effective update paths.
 * Reuses company identity and letter-rule helpers; does not alter verification logic.
 */
export function validateWorkExperienceSubmission(
  input: WorkExperienceValidationInput,
): WorkExperienceValidationResult {
  const issues: WorkExperienceValidationIssue[] = [];
  const isCurrent = input.isCurrent ?? false;

  if (!input.companyName?.trim()) {
    issues.push({ path: 'companyName', message: 'Company name is required.' });
  }
  if (!input.role?.trim()) {
    issues.push({ path: 'role', message: 'Role/designation is required.' });
  }
  if (!EmploymentTypeSchema.safeParse(input.employmentType).success) {
    issues.push({ path: 'employmentType', message: 'Employment type is required.' });
  }
  if (!input.startDate?.trim()) {
    issues.push({ path: 'startDate', message: 'Start date is required.' });
  }

  for (const mandatoryIssue of validateWorkExperienceMandatoryFields({
    domain: input.domain,
    responsibilities: input.responsibilities,
    skillsClaimed: input.skillsClaimed,
  }).issues) {
    issues.push({ path: mandatoryIssue.field, message: mandatoryIssue.message });
  }

  if (!isCurrent && !input.endDate) {
    issues.push({
      path: 'endDate',
      message: 'End date is required if not currently employed',
    });
  }

  const identityRequired = companyRequiresPublicIdentity({
    companyId: input.companyId,
    companyWebsite: input.companyWebsite,
    catalogCompanyWebsite: input.catalogCompanyWebsite,
    catalogCompanyLinkedinUrl: input.catalogCompanyLinkedinUrl,
  });
  const identityResult = validateCompanyPublicIdentity({
    companyWebsite: input.companyWebsite,
    companyLinkedinUrl: input.companyLinkedinUrl,
    required: identityRequired,
  });
  if (!identityResult.valid && identityResult.message) {
    issues.push({
      path: identityResult.field ?? 'companyWebsite',
      message: identityResult.message,
    });
  }

  const letterResult = validateWorkExperienceLetterRules({
    isCurrent,
    endDate: input.endDate,
    documents: input.documents ?? [],
  });
  if (!letterResult.valid && letterResult.message) {
    issues.push({ path: 'documents', message: letterResult.message });
  }

  return { valid: issues.length === 0, issues };
}

export function validateWorkExperienceEffectiveUpdate(
  existing: WorkExperienceValidationInput,
  patch: Partial<WorkExperienceValidationInput>,
): WorkExperienceValidationResult {
  return validateWorkExperienceSubmission(mergeWorkExperienceValidationInput(existing, patch));
}

function applyWorkExperienceSubmissionRefinements(
  data: WorkExperienceValidationInput,
  ctx: z.RefinementCtx,
  options?: { skipDocumentRules?: boolean },
): void {
  const result = validateWorkExperienceSubmission({
    companyName: data.companyName,
    role: data.role,
    employmentType: data.employmentType,
    startDate: data.startDate,
    endDate: data.endDate,
    isCurrent: data.isCurrent,
    domain: data.domain,
    responsibilities: data.responsibilities,
    skillsClaimed: data.skillsClaimed,
    companyId: data.companyId,
    companyWebsite: data.companyWebsite,
    companyLinkedinUrl: data.companyLinkedinUrl,
    documents: data.documents,
  });
  const issues = options?.skipDocumentRules
    ? result.issues.filter((issue) => issue.path !== 'documents')
    : result.issues;
  for (const issue of issues) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: issue.message,
      path: [issue.path],
    });
  }
}

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

export const CreateWorkExperienceSchema = CreateWorkExperienceBaseSchema.superRefine(
  (data, ctx) => {
    const skipDocumentRules = (data.documents ?? []).length === 0;
    applyWorkExperienceSubmissionRefinements(data, ctx, { skipDocumentRules });
  },
);
export type CreateWorkExperienceDto = z.infer<typeof CreateWorkExperienceSchema>;

export const UpdateWorkExperienceSchema = CreateWorkExperienceBaseSchema.partial().superRefine(
  (data, ctx) => {
    if (data.isCurrent === false && data.endDate === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date is required if not currently employed',
        path: ['endDate'],
      });
    }
    if (
      data.companyId !== undefined ||
      data.companyWebsite !== undefined ||
      data.companyLinkedinUrl !== undefined
    ) {
      applyCompanyPublicIdentityRefinement(
        {
          companyId: data.companyId ?? null,
          companyWebsite: data.companyWebsite ?? null,
          companyLinkedinUrl: data.companyLinkedinUrl ?? null,
          companyName: data.companyName ?? '',
          role: data.role ?? '',
          startDate: data.startDate ?? '',
          isCurrent: data.isCurrent ?? false,
        } as z.infer<typeof CreateWorkExperienceBaseSchema>,
        ctx,
      );
    }
    // Full mandatory-field checks for updates use validateWorkExperienceEffectiveUpdate()
    // with the persisted record merged into the patch (see api-core service layer).
  },
);
export type UpdateWorkExperienceDto = z.infer<typeof UpdateWorkExperienceSchema>;

/** Latest manager endorsement request summary for student-facing work experience views. */
export const WorkExperienceManagerEndorsementSummarySchema = z.object({
  endorsementId: z.string().uuid(),
  status: ManagerEndorsementStatusSchema,
  managerEmail: z.string().email(),
  managerName: z.string().nullable(),
  sentAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});
export type WorkExperienceManagerEndorsementSummaryDto = z.infer<
  typeof WorkExperienceManagerEndorsementSummarySchema
>;

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
  /** Latest manager endorsement request, when one exists. */
  managerEndorsement: WorkExperienceManagerEndorsementSummarySchema.nullable().optional(),
  /** Evidence-framework projection of this work experience entry. */
  evidence: WorkExperienceEvidenceSchema.optional(),
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
  nextAction: z.string(),
  createdAt: z.string(),
});
export type WorkExperienceOpsDashboardItemDto = z.infer<
  typeof WorkExperienceOpsDashboardItemSchema
>;

/** S6-VB-01 — server/client guidance for the next verification action. */
export function deriveWorkExperienceNextAction(params: {
  status: z.infer<typeof WorkExperienceVerificationStatusSchema>;
  currentStep?: string;
  emailState?: string;
  timeRemainingHours?: number;
  hasFlaggedDocuments?: boolean;
  hasValidatedProof?: boolean;
  hasVerifierEmail?: boolean;
}): string {
  if (params.hasFlaggedDocuments) {
    return 'Review flagged proof documents before employer verification can proceed.';
  }
  if (params.status === 'VERIFIED') {
    return 'Work experience claim is fully verified and visible on the public profile.';
  }
  if (params.status === 'EXPIRED') {
    return 'Verification link expired — student must restart with a new employer attempt.';
  }
  if (params.status === 'REJECTED') {
    return 'Verification was rejected — student should update claim or verifier details and retry.';
  }
  if (params.status === 'VOIDED') {
    return 'Work experience voided for integrity reasons — no further verification.';
  }
  if (params.status === 'PENDING_EMPLOYER') {
    if (params.emailState === 'EXPIRED') {
      return 'Employer verification expired — student must restart verification.';
    }
    if (params.timeRemainingHours && params.timeRemainingHours > 0) {
      return `Awaiting employer response (${params.timeRemainingHours}h remaining). Reminders sent every 6 hours.`;
    }
    return 'Awaiting employer verification response.';
  }
  if (!params.hasValidatedProof) {
    return 'Student must upload and validate employment proof before sending employer verification.';
  }
  if (!params.hasVerifierEmail) {
    return 'Student must add an official company verifier email before dispatch.';
  }
  return 'Student can send employer verification when proof and verifier details are ready.';
}

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
  managerEmail: z
    .string()
    .trim()
    .email('Invalid manager email')
    .min(1, 'Manager email is required')
    .transform((value) => value.toLowerCase()),
  managerName: z
    .string()
    .trim()
    .min(2, 'Endorser name must be at least 2 characters')
    .max(120, 'Endorser name must be 120 characters or fewer'),
});
export type SendManagerEndorsementDto = z.infer<typeof SendManagerEndorsementSchema>;

/** Response returned after successfully dispatching the endorsement email. */
export const SendManagerEndorsementResponseSchema = z.object({
  success: z.boolean(),
  endorsementId: z.string().uuid(),
  managerEmail: z.string(),
  expiresAt: z.string().datetime(),
  message: z.string(),
  /** True when an active pending request already existed and was returned without re-sending. */
  idempotent: z.boolean().optional(),
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
