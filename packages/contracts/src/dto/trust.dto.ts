import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/*                                Enums                                      */
/* -------------------------------------------------------------------------- */

export const TrustCaseStatusSchema = z.enum([
  'OPEN',
  'UNDER_INVESTIGATION',
  'ACTION_TAKEN',
  'DISMISSED',
]);
export type TrustCaseStatusDto = z.infer<typeof TrustCaseStatusSchema>;

export const TrustCaseSeveritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export type TrustCaseSeverityDto = z.infer<typeof TrustCaseSeveritySchema>;

export const EnforcementActionTypeSchema = z.enum([
  'DISMISS',
  'WARN',
  'RESTRICT_ASSESSMENTS',
  'SUSPEND_VERIFICATION',
  'VOID_CREDENTIAL',
  'VOID_ATTEMPT',
  'BAN_ACCOUNT',
]);
export type EnforcementActionTypeDto = z.infer<typeof EnforcementActionTypeSchema>;

export const EnforcementStatusSchema = z.enum(['ACTIVE', 'EXPIRED', 'REVERSED']);
export type EnforcementStatusDto = z.infer<typeof EnforcementStatusSchema>;

export const AppealStatusSchema = z.enum(['SUBMITTED', 'UNDER_REVIEW', 'UPHELD', 'REJECTED']);
export type AppealStatusDto = z.infer<typeof AppealStatusSchema>;

export const TrustReportStatusSchema = z.enum([
  'RECEIVED',
  'INVESTIGATING',
  'ACTION_TAKEN',
  'DISMISSED_INVALID',
]);
export type TrustReportStatusDto = z.infer<typeof TrustReportStatusSchema>;

export const TrustReportCategorySchema = z.enum([
  'FRAUD',
  'IMPERSONATION',
  'PLAGIARISM',
  'SPAM',
  'OTHER',
]);
export type TrustReportCategoryDto = z.infer<typeof TrustReportCategorySchema>;

/* -------------------------------------------------------------------------- */
/*                                DTO Schemas                                 */
/* -------------------------------------------------------------------------- */

export const TrustCaseDtoSchema = z.object({
  id: z.string().uuid(),
  candidateId: z.string().uuid(),
  candidateName: z.string().optional(),
  candidateEmail: z.string().optional(),
  status: TrustCaseStatusSchema,
  severity: TrustCaseSeveritySchema,
  summary: z.string(),
  assignedAdminId: z.string().uuid().nullable().optional(),
  openedAt: z.string(),
  closedAt: z.string().nullable().optional(),
  resolutionNotes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  integrityEvents: z.array(z.any()).optional(),
  corroborationFlags: z.array(z.any()).optional(),
  enforcementActions: z.array(z.any()).optional(),
  trustReports: z.array(z.any()).optional(),
});
export type TrustCaseDto = z.infer<typeof TrustCaseDtoSchema>;

export const CreateTrustCaseRequestSchema = z.object({
  candidateId: z.string().uuid(),
  severity: TrustCaseSeveritySchema.default('MEDIUM'),
  summary: z.string().min(3).max(500),
});
export type CreateTrustCaseRequestDto = z.infer<typeof CreateTrustCaseRequestSchema>;

export const AssignTrustCaseRequestSchema = z.object({
  adminId: z.string().uuid(),
});
export type AssignTrustCaseRequestDto = z.infer<typeof AssignTrustCaseRequestSchema>;

export const EnforcementActionDtoSchema = z.object({
  id: z.string().uuid(),
  trustCaseId: z.string().uuid(),
  candidateId: z.string().uuid(),
  actionType: EnforcementActionTypeSchema,
  status: EnforcementStatusSchema,
  reason: z.string(),
  appliedBy: z.string().uuid(),
  appliedAt: z.string(),
  expiresAt: z.string().nullable().optional(),
  reversedAt: z.string().nullable().optional(),
  reversedBy: z.string().uuid().nullable().optional(),
  reversalReason: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
});
export type EnforcementActionDto = z.infer<typeof EnforcementActionDtoSchema>;

export const ApplyEnforcementRequestSchema = z.object({
  actionType: EnforcementActionTypeSchema,
  reason: z.string().min(5),
  expiresAt: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});
export type ApplyEnforcementRequestDto = z.infer<typeof ApplyEnforcementRequestSchema>;

export const ReverseEnforcementRequestSchema = z.object({
  reversalReason: z.string().min(5),
});
export type ReverseEnforcementRequestDto = z.infer<typeof ReverseEnforcementRequestSchema>;

export const SubmitTrustAppealRequestSchema = z.object({
  enforcementActionId: z.string().uuid(),
  reason: z.string().min(10),
  supportingDocKeys: z.array(z.string()).optional(),
});
export type SubmitTrustAppealRequestDto = z.infer<typeof SubmitTrustAppealRequestSchema>;

export const TrustAppealDtoSchema = z.object({
  id: z.string().uuid(),
  enforcementActionId: z.string().uuid(),
  candidateId: z.string().uuid(),
  reason: z.string(),
  supportingDocKeys: z.array(z.string()),
  status: AppealStatusSchema,
  reviewedBy: z.string().uuid().nullable().optional(),
  reviewNotes: z.string().nullable().optional(),
  submittedAt: z.string(),
  resolvedAt: z.string().nullable().optional(),
});
export type TrustAppealDto = z.infer<typeof TrustAppealDtoSchema>;

export const ResolveTrustAppealRequestSchema = z.object({
  decision: z.enum(['UPHELD', 'REJECTED']),
  reviewNotes: z.string().min(5),
});
export type ResolveTrustAppealRequestDto = z.infer<typeof ResolveTrustAppealRequestSchema>;

export const SubmitTrustReportRequestSchema = z.object({
  targetUserId: z.string().uuid().optional(),
  targetResourceType: z.string().optional(),
  targetResourceId: z.string().optional(),
  reporterEmail: z.string().email().optional(),
  category: TrustReportCategorySchema.default('OTHER'),
  description: z.string().min(10),
  evidenceUrls: z.array(z.string().url()).optional(),
});
export type SubmitTrustReportRequestDto = z.infer<typeof SubmitTrustReportRequestSchema>;

export const TrustReportDtoSchema = z.object({
  id: z.string().uuid(),
  reporterId: z.string().uuid().nullable().optional(),
  reporterEmail: z.string().nullable().optional(),
  targetUserId: z.string().uuid().nullable().optional(),
  targetResourceType: z.string().nullable().optional(),
  targetResourceId: z.string().nullable().optional(),
  category: TrustReportCategorySchema,
  description: z.string(),
  evidenceUrls: z.array(z.string()),
  status: TrustReportStatusSchema,
  trustCaseId: z.string().uuid().nullable().optional(),
  resolvedAt: z.string().nullable().optional(),
  resolutionSummary: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TrustReportDto = z.infer<typeof TrustReportDtoSchema>;

export const ResolveTrustReportRequestSchema = z.object({
  status: z.enum(['INVESTIGATING', 'ACTION_TAKEN', 'DISMISSED_INVALID']),
  resolutionSummary: z.string().min(5),
  createTrustCase: z.boolean().optional(),
});
export type ResolveTrustReportRequestDto = z.infer<typeof ResolveTrustReportRequestSchema>;

export const ProfileAccessLogDtoSchema = z.object({
  id: z.string().uuid(),
  candidateId: z.string().uuid(),
  viewerId: z.string().uuid().nullable().optional(),
  viewerIp: z.string(),
  userAgent: z.string().nullable().optional(),
  accessedSlug: z.string(),
  createdAt: z.string(),
});
export type ProfileAccessLogDto = z.infer<typeof ProfileAccessLogDtoSchema>;
