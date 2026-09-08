import { z } from 'zod';
import {
  CandidateViewReasonCodeSchema,
  CompanyModeSchema,
  InstitutionListStatusSchema,
  PlanCodeSchema,
  StudentInviteFilterSchema,
  TenantVerificationStatusSchema,
  UserRoleSchema,
} from '../domain/enums.js';
import { EmailSchema, IsoDateTimeSchema, UuidSchema } from './common.js';

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
  createdAt: IsoDateTimeSchema,
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
});
export type InstitutionStudentDto = z.infer<typeof InstitutionStudentDtoSchema>;

/** TPO "copy invite link" action — the raw URL is never persisted, only ever returned here to copy. */
export const StudentInviteLinkResponseSchema = z.object({
  inviteUrl: z.string(),
});
export type StudentInviteLinkResponse = z.infer<typeof StudentInviteLinkResponseSchema>;

export const GlobalStudentSearchQuerySchema = z.object({
  q: z.string().trim().min(3).max(200),
});
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
  entitlements: z.array(PlanEntitlementDtoSchema),
  institutionCount: z.number().int().nonnegative(),
});
export type SubscriptionPlanDto = z.infer<typeof SubscriptionPlanDtoSchema>;

/* ------------------------------- invitations ------------------------------ */

export const InviteUserRequestSchema = z.object({
  fullName: z.string().min(2).max(200),
  email: EmailSchema,
});
export type InviteUserRequest = z.infer<typeof InviteUserRequestSchema>;

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
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string().nullable(),
  reasonCode: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: IsoDateTimeSchema,
});
export type AuditLogDto = z.infer<typeof AuditLogDtoSchema>;

export const ListAuditLogsQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  action: z.string().trim().max(80).optional(),
  resourceType: z.string().trim().max(40).optional(),
  resourceId: z.string().trim().max(80).optional(),
  actorId: UuidSchema.optional(),
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
  candidateCapacity: z.number().optional(),
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
});
export type VerificationQueueItemDto = z.infer<typeof VerificationQueueItemDtoSchema>;

export const ResolveVerificationRequestSchema = z.object({
  tenantType: z.enum(['institution', 'company']),
  decision: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().trim().min(8).max(500),
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
});
export type IntegrityQueueItemDto = z.infer<typeof IntegrityQueueItemDtoSchema>;

export const ResolveIntegrityRequestSchema = z.object({
  resolution: z.enum(['CLEAR', 'VOID']),
  reason: z.string().trim().min(8).max(500),
});
export type ResolveIntegrityRequest = z.infer<typeof ResolveIntegrityRequestSchema>;
