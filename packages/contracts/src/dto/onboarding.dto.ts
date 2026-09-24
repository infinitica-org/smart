import { z } from 'zod';
import {
  CandidateViewReasonCodeSchema,
  CompanyModeSchema,
  CompanyOnboardingStatusSchema,
  CompanyVerificationDocumentReviewStatusSchema,
  CompanyVerificationDocumentTypeSchema,
  InstitutionListStatusSchema,
  PlanCodeSchema,
  SkillClaimStatusSchema,
  SkillProficiencySchema,
  StudentInviteFilterSchema,
  TenantVerificationStatusSchema,
  UserRoleSchema,
} from '../domain/enums.js';
import { EmailSchema, IsoDateTimeSchema, UuidSchema } from './common.js';
import {
  CompanyAddressSchema,
  CompanyVerificationReviewDocumentSchema,
} from './company-onboarding.dto.js';
import { IntegrityScoreBandSchema } from './proctoring.dto.js';

/**
 * Institution onboarding, batches, and invitation contracts.
 * Implementation owner: Vishal V (`apps/api-core/src/modules/institutions`, `auth`).
 */

export const InvitationStatusSchema = z.enum(['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED']);
export type InvitationStatus = z.infer<typeof InvitationStatusSchema>;

/* ------------------------------ institutions ------------------------------ */

/** Strip URL noise and lowercase before domain validation. */
export function normalizeInstitutionDomain(raw: string): string {
  let value = raw.trim().toLowerCase();
  value = value.replace(/^https?:\/\//, '');
  value = value.replace(/\/.*$/, '');
  if (value.startsWith('www.')) value = value.slice(4);
  return value;
}

/** Hostname-style institution email domain; `localhost` allowed for local dev. */
export function isInstitutionDomain(value: string): boolean {
  if (value === 'localhost') return true;
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])*)+$/i.test(value);
}

export const InstitutionDomainSchema = z
  .string()
  .trim()
  .transform(normalizeInstitutionDomain)
  .pipe(
    z.string().min(3).max(255).refine(isInstitutionDomain, {
      message: 'Enter a valid email domain (e.g. psgtech.ac.in) or localhost for local dev.',
    }),
  );

export const CreateInstitutionRequestSchema = z.object({
  name: z.string().trim().min(2).max(200),
  domain: InstitutionDomainSchema,
});

export type CreateInstitutionRequest = z.infer<typeof CreateInstitutionRequestSchema>;

export const ConnectPartnerUniversityRequestSchema = z.object({
  institutionId: UuidSchema,
});
export type ConnectPartnerUniversityRequest = z.infer<typeof ConnectPartnerUniversityRequestSchema>;

export const PartnerUniversityOptionDtoSchema = z.object({
  institutionId: UuidSchema,
  name: z.string(),
  domain: z.string(),
});
export type PartnerUniversityOptionDto = z.infer<typeof PartnerUniversityOptionDtoSchema>;

export const StudentInstitutionPartnershipStatusDtoSchema = z.object({
  institutionId: UuidSchema.nullable(),
  institutionName: z.string().nullable(),
  isPartnered: z.boolean(),
});
export type StudentInstitutionPartnershipStatusDto = z.infer<
  typeof StudentInstitutionPartnershipStatusDtoSchema
>;

export const UniversityContactRequestStatusSchema = z.enum(['PENDING']);
export type UniversityContactRequestStatus = z.infer<typeof UniversityContactRequestStatusSchema>;

export const RequestUniversityContactRequestSchema = z.object({
  universityName: z.string().trim().min(2, 'Enter the university name.').max(200),
});
export type RequestUniversityContactRequest = z.infer<typeof RequestUniversityContactRequestSchema>;

export const UniversityContactRequestDtoSchema = z.object({
  id: UuidSchema,
  universityName: z.string(),
  status: UniversityContactRequestStatusSchema,
  createdAt: IsoDateTimeSchema,
});
export type UniversityContactRequestDto = z.infer<typeof UniversityContactRequestDtoSchema>;

export const ConfigureInstitutionSettingsSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  domains: z.array(InstitutionDomainSchema).min(1).optional(),
  campuses: z.array(z.string().trim().min(2).max(100)).optional(),
});
export type ConfigureInstitutionSettings = z.infer<typeof ConfigureInstitutionSettingsSchema>;

/** S6-VV-105 — the user behind a create / last change; null for rows that predate tracking. */
export const RecordActorDtoSchema = z.object({ userId: UuidSchema, email: z.string() }).nullable();
export type RecordActorDto = z.infer<typeof RecordActorDtoSchema>;

export const InstitutionDtoSchema = z.object({
  institutionId: UuidSchema,
  name: z.string(),
  domain: z.string(),
  planCode: PlanCodeSchema,
  verificationStatus: TenantVerificationStatusSchema,
  heldAt: IsoDateTimeSchema.nullable(),
  deactivatedAt: IsoDateTimeSchema.nullable(),
  studentCount: z.number().int().nonnegative(),
  adminCount: z.number().int().nonnegative(),
  batchCount: z.number().int().nonnegative(),
  invitePendingCount: z.number().int().nonnegative(),
  inviteAcceptedCount: z.number().int().nonnegative(),
  /**
   * Usage snapshot: distinct students with at least one assessment Attempt in the
   * trailing 30 days. A cheap, current-state proxy for tenant activity — not a
   * time series. Only populated on the single-institution detail response
   * (`getInstitution`); omitted from list responses to avoid fleet-wide cost.
   */
  activeStudents30d: z.number().int().nonnegative().optional(),
  createdAt: IsoDateTimeSchema,
  /** Detail response only (like activeStudents30d). */
  createdBy: RecordActorDtoSchema.optional(),
  updatedBy: RecordActorDtoSchema.optional(),
});
export type InstitutionDto = z.infer<typeof InstitutionDtoSchema>;

export const UpdateInstitutionRequestSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  domain: InstitutionDomainSchema.optional(),
  planCode: PlanCodeSchema.optional(),
});
export type UpdateInstitutionRequest = z.infer<typeof UpdateInstitutionRequestSchema>;

export const TenantActionReasonSchema = z.object({
  reason: z.string().trim().min(8).max(500),
});
export type TenantActionReason = z.infer<typeof TenantActionReasonSchema>;

export const ListInstitutionsQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  planCode: PlanCodeSchema.optional(),
  status: InstitutionListStatusSchema.optional(),
});
export type ListInstitutionsQuery = z.infer<typeof ListInstitutionsQuerySchema>;

export const ListInstitutionStudentsQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  inviteStatus: StudentInviteFilterSchema.optional(),
  batchId: UuidSchema.optional(),
});
export type ListInstitutionStudentsQuery = z.infer<typeof ListInstitutionStudentsQuerySchema>;

export const InstitutionStudentDtoSchema = z.object({
  userId: UuidSchema,
  email: EmailSchema,
  fullName: z.string(),
  batchId: UuidSchema.nullable(),
  batchName: z.string().nullable(),
  inviteStatus: InvitationStatusSchema.nullable(),
  lastSentAt: IsoDateTimeSchema.nullable(),
  acceptedAt: IsoDateTimeSchema.nullable(),
  heldAt: IsoDateTimeSchema.nullable(),
  /** From candidate onboarding profile when available. */
  linkedinUrl: z.string().nullable().default(null),
  githubUrl: z.string().nullable().default(null),
});
export type InstitutionStudentDto = z.infer<typeof InstitutionStudentDtoSchema>;

/** TPO "copy invite link" action — the raw URL is never persisted, only ever returned here to copy. */
export const StudentInviteLinkResponseSchema = z.object({
  inviteUrl: z.string(),
});
export type StudentInviteLinkResponse = z.infer<typeof StudentInviteLinkResponseSchema>;

/**
 * `q` (name/email) stays optional-but-validated so it can be combined with, or
 * replaced entirely by, the capability filters below — a TPO can search "AWS
 * skill, ADVANCED, verified" at one institution without typing a name.
 */
export const GlobalStudentSearchQuerySchema = z
  .object({
    q: z.string().trim().min(3).max(200).optional(),
    institutionId: UuidSchema.optional(),
    skillCode: z.string().trim().min(1).max(100).optional(),
    proficiency: SkillProficiencySchema.optional(),
    verificationStatus: SkillClaimStatusSchema.optional(),
  })
  .refine(
    (value) =>
      value.q !== undefined ||
      value.institutionId !== undefined ||
      value.skillCode !== undefined ||
      value.proficiency !== undefined ||
      value.verificationStatus !== undefined,
    {
      message:
        'Provide a search term or at least one filter (institution, skill, proficiency, verification status).',
    },
  );
export type GlobalStudentSearchQuery = z.infer<typeof GlobalStudentSearchQuerySchema>;

export const GlobalStudentHitDtoSchema = z.object({
  userId: UuidSchema,
  email: EmailSchema,
  fullName: z.string(),
  institutionId: UuidSchema,
  institutionName: z.string(),
  inviteStatus: InvitationStatusSchema.nullable(),
  heldAt: IsoDateTimeSchema.nullable(),
});
export type GlobalStudentHitDto = z.infer<typeof GlobalStudentHitDtoSchema>;

export const PlanEntitlementDtoSchema = z.object({
  key: z.string(),
  name: z.string(),
  enabled: z.boolean(),
});
export type PlanEntitlementDto = z.infer<typeof PlanEntitlementDtoSchema>;

export const SubscriptionPlanDtoSchema = z.object({
  planId: UuidSchema,
  code: PlanCodeSchema,
  name: z.string(),
  candidateCapacity: z.number().int().positive().nullable(),
  entitlements: z.array(PlanEntitlementDtoSchema),
  institutionCount: z.number().int().nonnegative(),
});
export type SubscriptionPlanDto = z.infer<typeof SubscriptionPlanDtoSchema>;

/** The `FeatureFlag` catalog itself — the flags that exist, independent of any plan or tenant. */
export const FeatureFlagDtoSchema = z.object({
  id: UuidSchema,
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
});
export type FeatureFlagDto = z.infer<typeof FeatureFlagDtoSchema>;

export const FeatureFlagOverrideTenantTypeSchema = z.enum(['institution', 'company']);
export type FeatureFlagOverrideTenantType = z.infer<typeof FeatureFlagOverrideTenantTypeSchema>;

/** A single per-tenant `FeatureFlagOverride` row, joined with the flag and tenant it targets. */
export const FeatureFlagOverrideDtoSchema = z.object({
  id: UuidSchema,
  flagKey: z.string(),
  flagName: z.string(),
  tenantType: FeatureFlagOverrideTenantTypeSchema,
  tenantId: UuidSchema,
  tenantName: z.string(),
  enabled: z.boolean(),
  createdAt: IsoDateTimeSchema,
});
export type FeatureFlagOverrideDto = z.infer<typeof FeatureFlagOverrideDtoSchema>;

/* ------------------------------- invitations ------------------------------ */

export const InviteUserRequestSchema = z.object({
  fullName: z.string().min(2).max(200),
  email: EmailSchema,
});
export type InviteUserRequest = z.infer<typeof InviteUserRequestSchema>;

export const StaffRoleSchema = z.enum(['PLACEMENT_STAFF', 'INSTITUTION_ADMIN']);
export type StaffRole = z.infer<typeof StaffRoleSchema>;

export const InviteStaffRequestSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  email: EmailSchema,
  role: StaffRoleSchema.default('PLACEMENT_STAFF'),
  department: z.string().trim().max(200).optional().nullable(),
});
export type InviteStaffRequest = z.infer<typeof InviteStaffRequestSchema>;

export const UpdateStaffRoleRequestSchema = z.object({
  role: StaffRoleSchema,
});
export type UpdateStaffRoleRequest = z.infer<typeof UpdateStaffRoleRequestSchema>;

export const UpdateStaffCampusRequestSchema = z.object({
  campus: z.string().trim().max(200).nullable().optional(),
});
export type UpdateStaffCampusRequest = z.infer<typeof UpdateStaffCampusRequestSchema>;

export const StaffMemberDtoSchema = z.object({
  userId: UuidSchema,
  email: EmailSchema,
  fullName: z.string(),
  role: StaffRoleSchema,
  groupLabel: z.string().nullable(),
  inviteStatus: InvitationStatusSchema.nullable(),
  lastSentAt: IsoDateTimeSchema.nullable(),
  acceptedAt: IsoDateTimeSchema.nullable(),
  heldAt: IsoDateTimeSchema.nullable().optional(),
  createdAt: IsoDateTimeSchema,
});
export type StaffMemberDto = z.infer<typeof StaffMemberDtoSchema>;

export const InvitationPreviewDtoSchema = z.object({
  fullName: z.string(),
  email: EmailSchema,
  role: UserRoleSchema,
  institutionName: z.string(),
  batchName: z.string().nullable(),
  expiresAt: IsoDateTimeSchema,
  status: InvitationStatusSchema,
});
export type InvitationPreviewDto = z.infer<typeof InvitationPreviewDtoSchema>;

export const AcceptInvitationRequestSchema = z.object({
  password: z.string().min(8).max(200),
});
export type AcceptInvitationRequest = z.infer<typeof AcceptInvitationRequestSchema>;

export const InvitationDtoSchema = z.object({
  invitationId: UuidSchema,
  email: EmailSchema,
  fullName: z.string(),
  role: UserRoleSchema,
  status: InvitationStatusSchema,
  batchId: UuidSchema.nullable(),
  groupLabel: z.string().nullable(),
  expiresAt: IsoDateTimeSchema,
  acceptedAt: IsoDateTimeSchema.nullable(),
  lastSentAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
});
export type InvitationDto = z.infer<typeof InvitationDtoSchema>;

export const InstitutionAdminDtoSchema = z.object({
  userId: UuidSchema,
  email: EmailSchema,
  fullName: z.string(),
  emailVerified: z.boolean(),
  invitation: InvitationDtoSchema.nullable(),
});
export type InstitutionAdminDto = z.infer<typeof InstitutionAdminDtoSchema>;

/* ----------------------------- platform admins ----------------------------- */

export const PlatformAdminDtoSchema = z.object({
  userId: UuidSchema,
  email: EmailSchema,
  fullName: z.string(),
  emailVerified: z.boolean(),
  invitation: InvitationDtoSchema.nullable(),
});
export type PlatformAdminDto = z.infer<typeof PlatformAdminDtoSchema>;

export const InvitePlatformAdminRequestSchema = z.object({
  fullName: z.string().min(2).max(200),
  email: EmailSchema,
  reason: z.string().trim().min(8).max(500),
});
export type InvitePlatformAdminRequest = z.infer<typeof InvitePlatformAdminRequestSchema>;

/* -------------------------------- batches --------------------------------- */

export const CreateBatchRequestSchema = z.object({
  name: z.string().min(2).max(120),
  code: z.string().min(1).max(40).optional(),
});
export type CreateBatchRequest = z.infer<typeof CreateBatchRequestSchema>;

export const UpdateBatchRequestSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  code: z.string().min(1).max(40).nullable().optional(),
});
export type UpdateBatchRequest = z.infer<typeof UpdateBatchRequestSchema>;

export const BatchDtoSchema = z.object({
  batchId: UuidSchema,
  institutionId: UuidSchema,
  name: z.string(),
  code: z.string().nullable(),
  memberCount: z.number().int().nonnegative(),
  pendingInviteCount: z.number().int().nonnegative(),
  createdAt: IsoDateTimeSchema,
});
export type BatchDto = z.infer<typeof BatchDtoSchema>;

/* ------------------------------ batch members ----------------------------- */

export const AddBatchMemberRequestSchema = z.object({
  fullName: z.string().min(2).max(200),
  email: EmailSchema,
  groupLabel: z.string().min(1).max(80).optional(),
});
export type AddBatchMemberRequest = z.infer<typeof AddBatchMemberRequestSchema>;

export const BatchMemberDtoSchema = z.object({
  userId: UuidSchema,
  email: EmailSchema,
  fullName: z.string(),
  groupLabel: z.string().nullable(),
  emailVerified: z.boolean(),
  invitation: InvitationDtoSchema.nullable(),
  heldAt: IsoDateTimeSchema.nullable(),
});
export type BatchMemberDto = z.infer<typeof BatchMemberDtoSchema>;

export const BatchImportMappingSchema = z
  .object({
    fullName: z.string().trim().min(1).max(200),
    email: z.string().trim().min(1).max(200),
    groupLabel: z.string().trim().min(1).max(200).optional(),
  })
  .superRefine((mapping, context) => {
    const selected = [mapping.fullName, mapping.email, mapping.groupLabel].filter(
      (value): value is string => value !== undefined,
    );
    if (new Set(selected).size !== selected.length) {
      context.addIssue({
        code: 'custom',
        message: 'Each SMART field must map to a different uploaded column.',
      });
    }
  });
export type BatchImportMapping = z.infer<typeof BatchImportMappingSchema>;

export const BatchImportPreviewRowDtoSchema = z.object({
  row: z.number().int().positive(),
  fullName: z.string(),
  email: z.string(),
  groupLabel: z.string().optional(),
  valid: z.boolean(),
  existingStudent: z.boolean(),
  message: z.string().optional(),
});
export type BatchImportPreviewRowDto = z.infer<typeof BatchImportPreviewRowDtoSchema>;

export const BatchImportResultDtoSchema = z.object({
  imported: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  errors: z.array(
    z.object({
      row: z.number().int().positive(),
      email: z.string().optional(),
      message: z.string(),
    }),
  ),
  headers: z.array(z.string()).optional(),
  preview: z.array(BatchImportPreviewRowDtoSchema).optional(),
  totalRows: z.number().int().nonnegative().optional(),
  validRows: z.number().int().nonnegative().optional(),
  invalidRows: z.number().int().nonnegative().optional(),
  existingStudents: z.number().int().nonnegative().optional(),
  newAccounts: z.number().int().nonnegative().optional(),
  pendingInvitations: z.number().int().nonnegative().optional(),
  previewTruncated: z.boolean().optional(),
});
export type BatchImportResultDto = z.infer<typeof BatchImportResultDtoSchema>;

export const SendBatchInvitesResultDtoSchema = z.object({
  enqueued: z.number().int().nonnegative(),
});
export type SendBatchInvitesResultDto = z.infer<typeof SendBatchInvitesResultDtoSchema>;

export const AuditLogDtoSchema = z.object({
  auditLogId: UuidSchema,
  actorId: UuidSchema.nullable(),
  actorEmail: EmailSchema.nullable(),
  actorRole: UserRoleSchema.nullable(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string().nullable(),
  reasonCode: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: IsoDateTimeSchema,
});
export type AuditLogDto = z.infer<typeof AuditLogDtoSchema>;

/** Groups the generic UserRole enum into the three tabs the audit log UI shows. */
export const AuditLogSectionSchema = z.enum(['STUDENT', 'TPO', 'SUPER_ADMIN']);
export type AuditLogSection = z.infer<typeof AuditLogSectionSchema>;

export const ListAuditLogsQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  action: z.string().trim().max(80).optional(),
  resourceType: z.string().trim().max(40).optional(),
  resourceId: z.string().trim().max(80).optional(),
  actorId: UuidSchema.optional(),
  section: AuditLogSectionSchema.optional(),
  /** Inclusive lower bound on createdAt. */
  from: IsoDateTimeSchema.optional(),
  /** Inclusive upper bound on createdAt. */
  to: IsoDateTimeSchema.optional(),
});
export type ListAuditLogsQuery = z.infer<typeof ListAuditLogsQuerySchema>;

export const AdminDashboardDtoSchema = z.object({
  institutions: z.object({
    total: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
    held: z.number().int().nonnegative(),
    deactivated: z.number().int().nonnegative(),
  }),
  companies: z.object({
    total: z.number().int().nonnegative(),
    pendingVerification: z.number().int().nonnegative(),
  }),
  students: z.object({
    total: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
    held: z.number().int().nonnegative(),
  }),
  planMix: z.array(z.object({ code: PlanCodeSchema, count: z.number().int().nonnegative() })),
  openHolds: z.object({
    institutions: z.number().int().nonnegative(),
    students: z.number().int().nonnegative(),
  }),
  pendingVerifications: z.number().int().nonnegative(),
  flaggedAttempts: z.number().int().nonnegative(),
  recentAudit: z.array(AuditLogDtoSchema),
});
export type AdminDashboardDto = z.infer<typeof AdminDashboardDtoSchema>;

export const ViewCandidateRequestSchema = z.object({
  reasonCode: CandidateViewReasonCodeSchema,
  reason: z.string().trim().min(8).max(500),
});
export type ViewCandidateRequest = z.infer<typeof ViewCandidateRequestSchema>;

export const CandidateBriefDtoSchema = z.object({
  userId: UuidSchema,
  email: EmailSchema,
  fullName: z.string(),
  institutionId: UuidSchema,
  institutionName: z.string(),
  inviteStatus: InvitationStatusSchema.nullable(),
  heldAt: IsoDateTimeSchema.nullable(),
  heldReason: z.string().nullable(),
  skillClaimCount: z.number().int().nonnegative(),
  verifiedSkillCount: z.number().int().nonnegative(),
  projectCount: z.number().int().nonnegative(),
  viewedAt: IsoDateTimeSchema,
});
export type CandidateBriefDto = z.infer<typeof CandidateBriefDtoSchema>;

export const UpdatePlanEntitlementsRequestSchema = z.object({
  entitlements: z.array(
    z.object({
      key: z.string().min(2).max(80),
      enabled: z.boolean(),
    }),
  ),
});
export type UpdatePlanEntitlementsRequest = z.infer<typeof UpdatePlanEntitlementsRequestSchema>;

export const UpdatePlanCapacityRequestSchema = z.object({
  candidateCapacity: z.number().int().positive().nullable(),
});
export type UpdatePlanCapacityRequest = z.infer<typeof UpdatePlanCapacityRequestSchema>;

export const SetFeatureFlagOverrideRequestSchema = z.object({
  key: z.string().min(2).max(80),
  enabled: z.boolean(),
});
export type SetFeatureFlagOverrideRequest = z.infer<typeof SetFeatureFlagOverrideRequestSchema>;

export const TenantEntitlementsDtoSchema = z.object({
  planCode: PlanCodeSchema.nullable(),
  flags: z.array(PlanEntitlementDtoSchema),
  institutionName: z.string().optional(),
  domain: z.string().optional(),
  verificationStatus: TenantVerificationStatusSchema.optional(),
  candidateCapacity: z.number().nullable().optional(),
  candidateUsage: z.number().int().nonnegative().optional(),
});
export type TenantEntitlementsDto = z.infer<typeof TenantEntitlementsDtoSchema>;

export const CreateCompanyRequestSchema = z.object({
  name: z.string().trim().min(2).max(200),
  /** Industry taxonomy domain (SA-09), e.g. Software/IT — not an email hostname. */
  domain: z.string().trim().min(1).max(80).optional(),
  website: z.string().trim().max(255).optional(),
  sector: z.string().trim().max(80).optional(),
  mode: CompanyModeSchema.optional(),
  sizeBand: z.string().trim().max(40).optional(),
  location: z.string().trim().max(120).optional(),
});
export type CreateCompanyRequest = z.infer<typeof CreateCompanyRequestSchema>;

export const UpdateCompanyRequestSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  domain: z.string().trim().min(1).max(80).nullable().optional(),
  website: z.string().trim().max(255).nullable().optional(),
  planCode: PlanCodeSchema.optional(),
  sector: z.string().trim().max(80).nullable().optional(),
  mode: CompanyModeSchema.nullable().optional(),
  sizeBand: z.string().trim().max(40).nullable().optional(),
  location: z.string().trim().max(120).nullable().optional(),
});
export type UpdateCompanyRequest = z.infer<typeof UpdateCompanyRequestSchema>;

export const CompanyDtoSchema = z.object({
  companyId: UuidSchema,
  organizationId: UuidSchema.nullable().optional(),
  name: z.string(),
  /** Industry taxonomy domain (SA-09), not an email hostname. */
  domain: z.string().nullable(),
  website: z.string().nullable(),
  planCode: PlanCodeSchema,
  sector: z.string().nullable(),
  mode: CompanyModeSchema.nullable(),
  sizeBand: z.string().nullable(),
  location: z.string().nullable(),
  verificationStatus: TenantVerificationStatusSchema,
  verificationReason: z.string().nullable(),
  heldAt: IsoDateTimeSchema.nullable(),
  deactivatedAt: IsoDateTimeSchema.nullable(),
  userCount: z.number().int().nonnegative(),
  createdAt: IsoDateTimeSchema,
  /** Detail response only. */
  createdBy: RecordActorDtoSchema.optional(),
  updatedBy: RecordActorDtoSchema.optional(),
});
export type CompanyDto = z.infer<typeof CompanyDtoSchema>;

export const ListCompaniesQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  planCode: PlanCodeSchema.optional(),
  status: InstitutionListStatusSchema.optional(),
  verificationStatus: TenantVerificationStatusSchema.optional(),
});
export type ListCompaniesQuery = z.infer<typeof ListCompaniesQuerySchema>;

export const VerificationQueueItemDtoSchema = z.object({
  tenantType: z.enum(['institution', 'company']),
  tenantId: UuidSchema,
  name: z.string(),
  domain: z.string().nullable(),
  verificationStatus: TenantVerificationStatusSchema,
  verificationReason: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
  /** Present for company tenants in self-onboarding review. */
  onboardingStatus: CompanyOnboardingStatusSchema.optional(),
  submissionId: UuidSchema.optional(),
  representativeEmail: EmailSchema.optional(),
  registrationCountry: z
    .string()
    .trim()
    .length(2)
    .regex(/^[A-Z]{2}$/)
    .optional(),
  documentCount: z.number().int().nonnegative().optional(),
  submittedAt: IsoDateTimeSchema.optional(),
});
export type VerificationQueueItemDto = z.infer<typeof VerificationQueueItemDtoSchema>;

/** SA review panel for a pending company verification submission. */
export const CompanyVerificationReviewDocumentDtoSchema = z.object({
  documentId: UuidSchema,
  documentType: CompanyVerificationDocumentTypeSchema,
  fileName: z.string(),
  mimeType: z.string(),
  fileSizeBytes: z.number().int().nonnegative(),
  uploadedAt: IsoDateTimeSchema,
  reviewStatus: CompanyVerificationDocumentReviewStatusSchema,
  reviewReason: z.string().nullable(),
  downloadUrl: z.string().url(),
});
export type CompanyVerificationReviewDocumentDto = z.infer<
  typeof CompanyVerificationReviewDocumentDtoSchema
>;

export const CompanyVerificationReviewDetailDtoSchema = z.object({
  tenantType: z.literal('company'),
  tenantId: UuidSchema,
  submissionId: UuidSchema,
  name: z.string(),
  website: z.string().nullable(),
  verificationStatus: TenantVerificationStatusSchema,
  onboardingStatus: CompanyOnboardingStatusSchema.nullable(),
  representativeEmail: EmailSchema.optional(),
  registrationCountry: z.string().trim().length(2).optional(),
  legalName: z.string(),
  submittedAt: IsoDateTimeSchema,
  registeredAddress: CompanyAddressSchema.optional(),
  businessRegistrationNumber: z.string().nullable().optional(),
  taxId: z.string().nullable().optional(),
  documents: z.array(CompanyVerificationReviewDocumentDtoSchema),
});
export type CompanyVerificationReviewDetailDto = z.infer<
  typeof CompanyVerificationReviewDetailDtoSchema
>;

export const GetVerificationReviewQuerySchema = z.object({
  tenantType: z.enum(['company']),
});
export type GetVerificationReviewQuery = z.infer<typeof GetVerificationReviewQuerySchema>;

export const ResolveVerificationRequestSchema = z.object({
  tenantType: z.enum(['institution', 'company']),
  decision: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().trim().min(8).max(500),
  /** Targets the open submission; rejects stale resolves when queue carried a newer submissionId. */
  submissionId: UuidSchema.optional(),
  /** Optional per-document SA review when tenantType is company. */
  documentReviews: z.array(CompanyVerificationReviewDocumentSchema).optional(),
  internalNotes: z.string().trim().max(2000).optional(),
});
export type ResolveVerificationRequest = z.infer<typeof ResolveVerificationRequestSchema>;

export const IntegrityQueueItemDtoSchema = z.object({
  attemptId: UuidSchema,
  userId: UuidSchema,
  studentName: z.string(),
  studentEmail: EmailSchema,
  integrityFlag: z.string(),
  status: z.string(),
  startedAt: IsoDateTimeSchema,
  completedAt: IsoDateTimeSchema.nullable(),
  /** Risk band computed from the attempt's recorded proctoring violations. */
  severity: IntegrityScoreBandSchema,
  /** Most recent violation kind on record for this attempt, if any (cheap evidence hint). */
  flagReason: z.string().nullable(),
});
export type IntegrityQueueItemDto = z.infer<typeof IntegrityQueueItemDtoSchema>;

/**
 * `PENDING` is the original flagged/under-review queue awaiting a decision.
 * `ESCALATED` is the durable destination for attempts an admin has escalated
 * — escalation has no dedicated RBAC route or notification, so this filter
 * is what keeps escalated cases visible/reviewable instead of disappearing
 * from the queue the way Dismiss/Void do.
 */
export const IntegrityQueueStatusSchema = z.enum(['PENDING', 'ESCALATED']);
export type IntegrityQueueStatus = z.infer<typeof IntegrityQueueStatusSchema>;

export const ResolveIntegrityRequestSchema = z.object({
  resolution: z.enum(['CLEAR', 'VOID', 'ESCALATE']),
  reason: z.string().trim().min(8).max(500),
});
export type ResolveIntegrityRequest = z.infer<typeof ResolveIntegrityRequestSchema>;
