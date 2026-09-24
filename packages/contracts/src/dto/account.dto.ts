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
export const DataRequestTypeSchema = z.enum(['CORRECTION', 'DELETION']);
export type DataRequestType = z.infer<typeof DataRequestTypeSchema>;

export const DataRequestStatusSchema = z.enum(['OPEN', 'IN_REVIEW', 'COMPLETED', 'REJECTED']);
export type DataRequestStatus = z.infer<typeof DataRequestStatusSchema>;

export const CreateDataRequestSchema = z.object({
  type: DataRequestTypeSchema,
  details: z
    .string()
    .trim()
    .min(10, 'Please describe the request in at least 10 characters.')
    .max(2000, 'Details must be at most 2000 characters.'),
});
export type CreateDataRequest = z.infer<typeof CreateDataRequestSchema>;

export const DataRequestResponseSchema = z.object({
  id: UuidSchema,
  type: DataRequestTypeSchema,
  status: DataRequestStatusSchema,
  details: z.string(),
  createdAt: IsoDateTimeSchema,
  resolvedAt: IsoDateTimeSchema.nullable(),
});
export type DataRequestResponse = z.infer<typeof DataRequestResponseSchema>;

export const DataRequestListResponseSchema = z.object({
  requests: z.array(DataRequestResponseSchema),
});
export type DataRequestListResponse = z.infer<typeof DataRequestListResponseSchema>;
