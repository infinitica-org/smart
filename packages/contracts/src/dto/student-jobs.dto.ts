import { z, IsoDateTimeSchema, UuidSchema } from './common.js';
import { EmploymentTypeSchema, SkillProficiencySchema } from '../domain/enums.js';

/** JOB-02 — student job discovery (Th6-379 to Th6-386). One set of schemas for client and server. */

export const JOB_WORK_MODES = ['ONSITE', 'HYBRID', 'REMOTE'] as const;
export const JobWorkModeSchema = z.enum(JOB_WORK_MODES);
export type JobWorkMode = z.infer<typeof JobWorkModeSchema>;

/** Fit bands come from the matching service; the UI never derives them. */
export const JOB_FIT_BANDS = ['STRONG', 'MODERATE', 'STRETCH'] as const;
export const JobFitBandSchema = z.enum(JOB_FIT_BANDS);
export type JobFitBand = z.infer<typeof JobFitBandSchema>;

/** Tabs: Strong fit = STRONG, Good fit = MODERATE, All = every band (STRETCH and unscored appear only here). */
export const JOB_FIT_TABS = ['STRONG', 'GOOD', 'ALL'] as const;
export const JobFitTabSchema = z.enum(JOB_FIT_TABS);
export type JobFitTab = z.infer<typeof JobFitTabSchema>;

export const JOB_LIST_MAX_LIMIT = 50;
export const JOB_LOCATION_MAX_LENGTH = 120;

export const ListStudentJobsQuerySchema = z.object({
  fit: JobFitTabSchema.default('ALL'),
  type: EmploymentTypeSchema.optional(),
  location: z.string().trim().min(1).max(JOB_LOCATION_MAX_LENGTH).optional(),
  mode: JobWorkModeSchema.optional(),
  cursor: z.string().min(1).max(300).optional(),
  limit: z.coerce.number().int().min(1).max(JOB_LIST_MAX_LIMIT).default(20),
});
export type ListStudentJobsQuery = z.infer<typeof ListStudentJobsQuerySchema>;

export const JobFitSummarySchema = z.object({
  band: JobFitBandSchema,
  matchPercent: z.number().int().min(0).max(100),
  /** The strongest "why it matches" reason, or null when nothing specific can be said. */
  topReason: z.string().nullable(),
});
export type JobFitSummary = z.infer<typeof JobFitSummarySchema>;

export const StudentJobCardSchema = z.object({
  id: UuidSchema,
  roleTitle: z.string(),
  companyName: z.string(),
  companyId: UuidSchema.nullable(),
  /** True only for a job posted by a verified company; university-posted jobs are false. */
  companyVerified: z.boolean(),
  companyVerifiedAt: IsoDateTimeSchema.nullable(),
  location: z.string().nullable(),
  employmentType: z.string().nullable(),
  workMode: JobWorkModeSchema.nullable(),
  lastDateToApply: z.string().nullable(),
  postedAt: IsoDateTimeSchema,
  /** Null when the job lists no required skills or the student has no verified skills yet. */
  fit: JobFitSummarySchema.nullable(),
  applied: z.boolean(),
  saved: z.boolean(),
});
export type StudentJobCard = z.infer<typeof StudentJobCardSchema>;

export const StudentJobCountsSchema = z.object({
  strong: z.number().int().min(0),
  good: z.number().int().min(0),
  all: z.number().int().min(0),
});
export type StudentJobCounts = z.infer<typeof StudentJobCountsSchema>;

export const ListStudentJobsResponseSchema = z.object({
  jobs: z.array(StudentJobCardSchema),
  nextCursor: z.string().nullable(),
  /** Counts for the current filters (type/location/mode) across the three tabs. */
  counts: StudentJobCountsSchema,
});
export type ListStudentJobsResponse = z.infer<typeof ListStudentJobsResponseSchema>;

/* --------------------------------- detail --------------------------------- */

export const JOB_REQUIREMENT_STATUSES = ['MET', 'PARTIAL', 'MISSING'] as const;
export const JobRequirementStatusSchema = z.enum(JOB_REQUIREMENT_STATUSES);
export type JobRequirementStatus = z.infer<typeof JobRequirementStatusSchema>;

export const JobRequirementRowSchema = z.object({
  skillCode: z.string(),
  skillName: z.string(),
  requiredProficiency: SkillProficiencySchema,
  /** Every listed skill is a hard minimum today; preferred skills are not modelled on openings. */
  importance: z.enum(['MANDATORY', 'PREFERRED']),
  studentProficiency: z.string().nullable(),
  status: JobRequirementStatusSchema,
  evidenceRequired: z.number().int().min(0),
  evidenceMet: z.number().int().min(0),
  /** Where to close the gap: the Th6-337 recommendation for this skill, else the profile Skills page. */
  action: z.object({ label: z.string(), href: z.string() }).nullable(),
});
export type JobRequirementRow = z.infer<typeof JobRequirementRowSchema>;

export const StudentJobDetailSchema = StudentJobCardSchema.extend({
  description: z.string().nullable(),
  aboutCompany: z.string().nullable(),
  companyOffers: z.string().nullable(),
  salaryDetails: z.string().nullable(),
  logoUrl: z.string().nullable(),
  /** False for a closed or expired job the student applied to or saved: show "No longer accepting". */
  acceptingApplications: z.boolean(),
  applicationId: UuidSchema.nullable(),
  hidden: z.boolean(),
  whyItMatches: z.array(z.string()),
  requirements: z.array(JobRequirementRowSchema),
});
export type StudentJobDetail = z.infer<typeof StudentJobDetailSchema>;

/* -------------------------- saved / hidden / reports -------------------------- */

export const HIDE_REASON_MAX_LENGTH = 200;
export const HideJobRequestSchema = z.object({
  reason: z.string().trim().min(1).max(HIDE_REASON_MAX_LENGTH).optional(),
});
export type HideJobRequest = z.infer<typeof HideJobRequestSchema>;

export const JobFlagResponseSchema = z.object({ jobId: UuidSchema, active: z.boolean() });
export type JobFlagResponse = z.infer<typeof JobFlagResponseSchema>;

export const ListSavedJobsResponseSchema = z.object({ jobs: z.array(StudentJobCardSchema) });
export type ListSavedJobsResponse = z.infer<typeof ListSavedJobsResponseSchema>;

export const REPORT_REASONS = ['SCAM', 'DISCRIMINATORY', 'MISLEADING', 'OTHER'] as const;
export const ReportReasonSchema = z.enum(REPORT_REASONS);
export type ReportReason = z.infer<typeof ReportReasonSchema>;

export const REPORT_DETAILS_MAX_LENGTH = 1000;
export const CreateReportRequestSchema = z
  .object({
    targetType: z.enum(['JOB', 'MESSAGE']),
    targetId: UuidSchema,
    reason: ReportReasonSchema,
    details: z.string().trim().max(REPORT_DETAILS_MAX_LENGTH).optional(),
  })
  .refine((value) => value.reason !== 'OTHER' || (value.details ?? '').length >= 10, {
    path: ['details'],
    message: 'Tell us what is wrong (at least 10 characters).',
  });
export type CreateReportRequest = z.infer<typeof CreateReportRequestSchema>;

export const ReportSchema = z.object({
  id: UuidSchema,
  targetType: z.enum(['JOB', 'MESSAGE']),
  targetId: UuidSchema,
  reason: ReportReasonSchema,
  status: z.enum(['OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED']),
  createdAt: IsoDateTimeSchema,
  /** True when this repeat request returned the report already on file. */
  alreadyReported: z.boolean(),
});
export type Report = z.infer<typeof ReportSchema>;

/** Open reports on one job that trigger moderation review. */
export const REPORT_ESCALATION_THRESHOLD = 3;
