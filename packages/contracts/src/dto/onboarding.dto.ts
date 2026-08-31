import { z } from 'zod';
import {
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
});
export type BatchImportResultDto = z.infer<typeof BatchImportResultDtoSchema>;

export const SendBatchInvitesResultDtoSchema = z.object({
  enqueued: z.number().int().nonnegative(),
});
export type SendBatchInvitesResultDto = z.infer<typeof SendBatchInvitesResultDtoSchema>;
