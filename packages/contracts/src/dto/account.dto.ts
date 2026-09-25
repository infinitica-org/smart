import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from './common.js';

/** STU-02 — edit personal information after onboarding. Phone changes need OTP, so are out of scope. */
const PersonalNameSchema = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(50, `${label} must be at most 50 characters.`);

export const UpdatePersonalInfoRequestSchema = z.object({
  firstName: PersonalNameSchema('First name'),
  lastName: PersonalNameSchema('Last name'),
  gender: z.string().trim().max(40, 'Gender must be at most 40 characters.').nullable().optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be a valid date (YYYY-MM-DD).')
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Date of birth must be a valid date.')
    .refine((value) => Date.parse(value) <= Date.now(), 'Date of birth cannot be in the future.')
    .nullable()
    .optional(),
  graduationYear: z
    .number()
    .int('Graduation year must be a whole number.')
    .min(2000, 'Graduation year must be 2000 or later.')
    .max(2100, 'Graduation year must be 2100 or earlier.')
    .nullable()
    .optional(),
});
export type UpdatePersonalInfoRequest = z.infer<typeof UpdatePersonalInfoRequestSchema>;

export const PersonalInfoResponseSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  fullName: z.string(),
  email: z.string(),
  gender: z.string().nullable(),
  dateOfBirth: z.string().nullable(),
  /** Read-only here; changing a phone number requires OTP verification. */
  phone: z.string().nullable(),
  graduationYear: z.number().int().nullable(),
});
export type PersonalInfoResponse = z.infer<typeof PersonalInfoResponseSchema>;

/** STU-02 — student-controlled employer messaging switch. */
export const UpdateMessagingPreferenceRequestSchema = z.object({
  allowEmployerMessages: z.boolean(),
});
export type UpdateMessagingPreferenceRequest = z.infer<
  typeof UpdateMessagingPreferenceRequestSchema
>;

export const MessagingPreferenceResponseSchema = z.object({
  allowEmployerMessages: z.boolean(),
});
export type MessagingPreferenceResponse = z.infer<typeof MessagingPreferenceResponseSchema>;

/**
 * S6-VV-113 (#552) — whether employers can find the student in match runs, shortlists and
 * candidate search. Their own institution (TPO) sees them either way.
 */
export const DiscoverabilityPreferenceSchema = z.object({
  discoverableToEmployers: z.boolean(),
});
export type DiscoverabilityPreference = z.infer<typeof DiscoverabilityPreferenceSchema>;

/** STU-02 — self-service account deactivation; the literal confirmation guards against misclicks. */
export const DeactivateAccountRequestSchema = z.object({
  confirmation: z.literal('DEACTIVATE', { message: 'Type DEACTIVATE to confirm.' }),
  reason: z.string().trim().max(500).optional(),
});
export type DeactivateAccountRequest = z.infer<typeof DeactivateAccountRequestSchema>;

export const DeactivateAccountResponseSchema = z.object({
  deactivatedAt: IsoDateTimeSchema,
});
export type DeactivateAccountResponse = z.infer<typeof DeactivateAccountResponseSchema>;

/** STU-02 — DPDP data-principal requests (correction / erasure). */
export const DataRequestTypeSchema = z.enum(['CORRECTION', 'DELETION', 'EXPORT']);
export type DataRequestType = z.infer<typeof DataRequestTypeSchema>;

export const DataRequestStatusSchema = z.enum(['OPEN', 'IN_REVIEW', 'COMPLETED', 'REJECTED']);
export type DataRequestStatus = z.infer<typeof DataRequestStatusSchema>;

/** Correction and deletion need a description; an EXPORT (S6-VV-115) needs none. */
export const CreateDataRequestSchema = z
  .object({
    type: DataRequestTypeSchema,
    details: z.string().trim().max(2000, 'Details must be at most 2000 characters.').default(''),
  })
  .superRefine((body, ctx) => {
    if (body.type !== 'EXPORT' && body.details.length < 10) {
      ctx.addIssue({
        code: 'custom',
        path: ['details'],
        message: 'Please describe the request in at least 10 characters.',
      });
    }
  });
export type CreateDataRequest = z.infer<typeof CreateDataRequestSchema>;

export const DataRequestResponseSchema = z.object({
  id: UuidSchema,
  type: DataRequestTypeSchema,
  status: DataRequestStatusSchema,
  details: z.string(),
  createdAt: IsoDateTimeSchema,
  resolvedAt: IsoDateTimeSchema.nullable(),
  /** S6-VV-115 — set on a finished EXPORT while its bundle can still be downloaded. */
  exportAvailableUntil: IsoDateTimeSchema.nullable(),
  /** S6-VV-116 — the admin's note when the request was completed or rejected. */
  resolution: z.string().nullable(),
});
export type DataRequestResponse = z.infer<typeof DataRequestResponseSchema>;

export const DataRequestListResponseSchema = z.object({
  requests: z.array(DataRequestResponseSchema),
});
export type DataRequestListResponse = z.infer<typeof DataRequestListResponseSchema>;

/** S6-VV-115 — short-lived links to the export bundle and to every file the student uploaded. */
export const DataExportDownloadSchema = z.object({
  bundleUrl: z.string(),
  files: z.array(z.object({ objectKey: z.string(), url: z.string() })),
  linksExpireInSeconds: z.number().int().positive(),
});
export type DataExportDownload = z.infer<typeof DataExportDownloadSchema>;

/* ---------------------- S6-VV-116 admin data-request queue ---------------------- */

/** Internal DPDP targets (decided 2026-09-25): first response within 7 days, closed within 30. */
export const DSR_SLA_FIRST_RESPONSE_DAYS = 7;
export const DSR_SLA_CLOSE_DAYS = 30;

export const ListAdminDataRequestsQuerySchema = z.object({
  type: DataRequestTypeSchema.optional(),
  status: DataRequestStatusSchema.optional(),
  /** Only requests still inside the queue (OPEN / IN_REVIEW). Default true. */
  openOnly: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});
export type ListAdminDataRequestsQuery = z.infer<typeof ListAdminDataRequestsQuerySchema>;

export const AdminDataRequestDtoSchema = DataRequestResponseSchema.extend({
  userId: UuidSchema,
  userEmail: z.string(),
  userFullName: z.string(),
  firstRespondedAt: IsoDateTimeSchema.nullable(),
  respondBy: IsoDateTimeSchema,
  closeBy: IsoDateTimeSchema,
  /** `response_overdue` / `close_overdue` once a target has passed without the step done. */
  slaState: z.enum(['on_track', 'response_overdue', 'close_overdue']),
});
export type AdminDataRequestDto = z.infer<typeof AdminDataRequestDtoSchema>;

/** Completing or rejecting needs a note; the student sees it. */
export const ResolveDataRequestSchema = z.object({
  note: z.string().trim().min(8, 'Write a note of at least 8 characters.').max(2000),
});
export type ResolveDataRequest = z.infer<typeof ResolveDataRequestSchema>;
