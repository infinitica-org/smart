import { z, IsoDateTimeSchema, UuidSchema } from './common.js';
import { APPLICATION_STATUSES } from '../domain/application-status.js';
import { JobFitSummarySchema } from './student-jobs.dto.js';
import { PublicCandidateProfileDtoSchema } from './public-candidate-profile.dto.js';

/** APP-01 — student applications (Th6-387 to Th6-395). Shared by client and server. */

export const ApplicationStatusSchema = z.enum(APPLICATION_STATUSES);

export const COVER_NOTE_MAX_LENGTH = 1000;
export const WITHDRAW_REASON_MAX_LENGTH = 500;
/** Bump when the employer-visible serializer changes shape; stored on every snapshot. */
export const APPLICATION_SNAPSHOT_VERSION = 1;

/* ------------------------------ apply (387/388/389) ----------------------------- */

/** What the employer will see, shown before the student confirms (Th6-388). */
export const ApplicationPreviewSchema = z.object({
  jobId: UuidSchema,
  roleTitle: z.string(),
  companyName: z.string(),
  /** The same employer-visible profile the student previews under My Profile (Th6-222). */
  profile: PublicCandidateProfileDtoSchema,
  fit: JobFitSummarySchema.nullable(),
  alreadyApplied: z.boolean(),
});
export type ApplicationPreview = z.infer<typeof ApplicationPreviewSchema>;

export const ApplyToJobRequestSchema = z.object({
  coverNote: z.string().trim().max(COVER_NOTE_MAX_LENGTH).optional(),
  /** The student confirmed they reviewed what the employer will see. Anything but true is a 422. */
  reviewedPreview: z
    .boolean()
    .refine((value) => value === true, { message: 'Review what the employer will see first.' }),
});
export type ApplyToJobRequest = z.infer<typeof ApplyToJobRequestSchema>;

export const ApplyToJobResponseSchema = z.object({
  applicationId: UuidSchema,
  /** Human-readable reference to quote to the university or employer. */
  referenceNumber: z.string(),
  jobId: UuidSchema,
  roleTitle: z.string(),
  companyName: z.string(),
  appliedAt: IsoDateTimeSchema,
  status: ApplicationStatusSchema,
  statusLabel: z.string(),
  /** True when this call returned an application that already existed. */
  alreadyApplied: z.boolean(),
});
export type ApplyToJobResponse = z.infer<typeof ApplyToJobResponseSchema>;

/* --------------------------- student status (392/393) --------------------------- */

export const StudentApplicationCardSchema = z.object({
  id: UuidSchema,
  referenceNumber: z.string(),
  jobId: UuidSchema,
  roleTitle: z.string(),
  companyName: z.string(),
  /** The company tenant behind the job, when there is one (links to the company page and reviews). */
  companyId: UuidSchema.nullable(),
  companyVerified: z.boolean(),
  companyVerifiedAt: IsoDateTimeSchema.nullable(),
  location: z.string().nullable(),
  status: ApplicationStatusSchema,
  statusLabel: z.string(),
  appliedAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type StudentApplicationCard = z.infer<typeof StudentApplicationCardSchema>;

export const ListStudentApplicationsResponseSchema = z.object({
  applications: z.array(StudentApplicationCardSchema),
});
export type ListStudentApplicationsResponse = z.infer<typeof ListStudentApplicationsResponseSchema>;

export const ApplicationTimelineEntrySchema = z.object({
  status: ApplicationStatusSchema,
  statusLabel: z.string(),
  at: IsoDateTimeSchema,
});

export const StudentApplicationDetailSchema = StudentApplicationCardSchema.extend({
  coverNote: z.string().nullable(),
  timeline: z.array(ApplicationTimelineEntrySchema),
  canWithdraw: z.boolean(),
});
export type StudentApplicationDetail = z.infer<typeof StudentApplicationDetailSchema>;

export const WithdrawApplicationRequestSchema = z.object({
  reason: z.string().trim().min(1).max(WITHDRAW_REASON_MAX_LENGTH).optional(),
});
export type WithdrawApplicationRequest = z.infer<typeof WithdrawApplicationRequestSchema>;

/* ------------------------------ employer (390/391) ------------------------------ */

/** Sort keys are a fixed whitelist: never a personal or protected attribute. */
export const APPLICANT_SORT_KEYS = ['fit', 'applied', 'status'] as const;
export const ApplicantSortKeySchema = z.enum(APPLICANT_SORT_KEYS);
export type ApplicantSortKey = z.infer<typeof ApplicantSortKeySchema>;

export const ListEmployerApplicantsQuerySchema = z.object({
  status: ApplicationStatusSchema.optional(),
  sort: ApplicantSortKeySchema.default('fit'),
  cursor: z.string().min(1).max(300).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListEmployerApplicantsQuery = z.infer<typeof ListEmployerApplicantsQuerySchema>;

export const EmployerApplicantCardSchema = z.object({
  applicationId: UuidSchema,
  candidateName: z.string(),
  /** Fit at the moment the student applied (from the snapshot). */
  fit: JobFitSummarySchema.nullable(),
  /** True when the student's fit today differs from the snapshot; a hint to review, not a re-sort. */
  fitRecalculated: z.boolean(),
  status: ApplicationStatusSchema,
  statusLabel: z.string(),
  /** The statuses an employer may move this application to right now (drives the board and dropdown). */
  allowedNext: z.array(ApplicationStatusSchema),
  appliedAt: IsoDateTimeSchema,
});
export type EmployerApplicantCard = z.infer<typeof EmployerApplicantCardSchema>;

export const ListEmployerApplicantsResponseSchema = z.object({
  job: z.object({ id: UuidSchema, roleTitle: z.string() }),
  applicants: z.array(EmployerApplicantCardSchema),
  nextCursor: z.string().nullable(),
  total: z.number().int().min(0),
});
export type ListEmployerApplicantsResponse = z.infer<typeof ListEmployerApplicantsResponseSchema>;

/* -------------------------- move candidates between stages (Th6-414) -------------------------- */

export const TRANSITION_NOTE_MAX_LENGTH = 1000;

export const TransitionApplicationRequestSchema = z.object({
  toStatus: ApplicationStatusSchema,
  /** The status the caller last saw. A different current status is a 409: someone else moved it. */
  expectedFromStatus: ApplicationStatusSchema,
  note: z.string().trim().min(1).max(TRANSITION_NOTE_MAX_LENGTH).optional(),
});
export type TransitionApplicationRequest = z.infer<typeof TransitionApplicationRequestSchema>;

export const TransitionApplicationResponseSchema = z.object({
  applicationId: UuidSchema,
  fromStatus: ApplicationStatusSchema,
  toStatus: ApplicationStatusSchema,
  statusLabel: z.string(),
  allowedNext: z.array(ApplicationStatusSchema),
  changedAt: IsoDateTimeSchema,
});
export type TransitionApplicationResponse = z.infer<typeof TransitionApplicationResponseSchema>;
