import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from './common.js';

/**
 * STU-03 — the single read model behind the student dashboard.
 *
 * Every section comes from a real source. When a source has nothing to show the array is
 * empty (or `null`), never a placeholder: the client renders an explicit empty state.
 */

export const DASHBOARD_PROFILE_VIEW_WINDOW_DAYS = 30;

/** Authenticated roles whose public-profile views count as an "employer view". Institution staff are audited separately. */
export const EMPLOYER_VIEWER_ROLES = ['COMPANY'] as const;

export const DashboardCompletionSchema = z.object({
  percent: z.number().int().min(0).max(100),
  completedAreas: z.array(z.string()),
  incompleteAreas: z.array(z.string()),
});
export type DashboardCompletion = z.infer<typeof DashboardCompletionSchema>;

export const DashboardAttentionKindSchema = z.enum([
  'CREDENTIAL',
  'EDUCATION',
  'WORK_EXPERIENCE',
  'SKILL',
]);
export type DashboardAttentionKind = z.infer<typeof DashboardAttentionKindSchema>;

/** NEEDS_ACTION = the student must act; PROCESSING = we are working on it; FAILED = it did not pass. */
export const DashboardAttentionStateSchema = z.enum(['NEEDS_ACTION', 'PROCESSING', 'FAILED']);
export type DashboardAttentionState = z.infer<typeof DashboardAttentionStateSchema>;

export const DashboardAttentionItemSchema = z.object({
  id: z.string(),
  kind: DashboardAttentionKindSchema,
  state: DashboardAttentionStateSchema,
  title: z.string(),
  detail: z.string(),
  href: z.string(),
});
export type DashboardAttentionItem = z.infer<typeof DashboardAttentionItemSchema>;

/** A system-scored match: `matchPercent` is the score persisted on the student's application. */
export const DashboardMatchSchema = z.object({
  applicationId: UuidSchema,
  openingId: UuidSchema,
  roleTitle: z.string(),
  companyName: z.string(),
  location: z.string().nullable(),
  matchPercent: z.number().int().min(0).max(100),
  stage: z.string(),
});
export type DashboardMatch = z.infer<typeof DashboardMatchSchema>;

export const DashboardOpportunitySchema = z.object({
  openingId: UuidSchema,
  roleTitle: z.string(),
  companyName: z.string(),
  location: z.string().nullable(),
  employmentType: z.string().nullable(),
  lastDateToApply: z.string().nullable(),
  postedAt: IsoDateTimeSchema,
});
export type DashboardOpportunity = z.infer<typeof DashboardOpportunitySchema>;

export const DashboardApplicationSchema = z.object({
  applicationId: UuidSchema,
  openingId: UuidSchema,
  roleTitle: z.string(),
  companyName: z.string(),
  stage: z.string(),
  updatedAt: IsoDateTimeSchema,
});
export type DashboardApplication = z.infer<typeof DashboardApplicationSchema>;

export const DashboardActivityItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  occurredAt: IsoDateTimeSchema,
});
export type DashboardActivityItem = z.infer<typeof DashboardActivityItemSchema>;

export const DashboardNextActionSchema = z.object({
  title: z.string(),
  description: z.string(),
  ctaLabel: z.string(),
  href: z.string(),
});
export type DashboardNextAction = z.infer<typeof DashboardNextActionSchema>;

/** `employerViews` is `null` unless the student has opted in to see it. */
export const DashboardProfileViewsSchema = z.object({
  visible: z.boolean(),
  employerViews: z.number().int().min(0).nullable(),
  windowDays: z.number().int().positive(),
});
export type DashboardProfileViews = z.infer<typeof DashboardProfileViewsSchema>;

export const StudentDashboardSummarySchema = z.object({
  generatedAt: IsoDateTimeSchema,
  completion: DashboardCompletionSchema,
  nextAction: DashboardNextActionSchema.nullable(),
  attentionItems: z.array(DashboardAttentionItemSchema),
  topMatches: z.array(DashboardMatchSchema),
  opportunities: z.object({
    total: z.number().int().min(0),
    items: z.array(DashboardOpportunitySchema),
  }),
  activeApplications: z.object({
    total: z.number().int().min(0),
    items: z.array(DashboardApplicationSchema),
  }),
  recentActivity: z.array(DashboardActivityItemSchema),
  profileViews: DashboardProfileViewsSchema,
});
export type StudentDashboardSummary = z.infer<typeof StudentDashboardSummarySchema>;

/** STU-03 — student opt-in for the employer profile-view count. */
export const ProfileViewSettingSchema = z.object({
  showEmployerViewCount: z.boolean(),
});
export type ProfileViewSetting = z.infer<typeof ProfileViewSettingSchema>;

export const UpdateProfileViewSettingRequestSchema = ProfileViewSettingSchema;
export type UpdateProfileViewSettingRequest = z.infer<typeof UpdateProfileViewSettingRequestSchema>;
