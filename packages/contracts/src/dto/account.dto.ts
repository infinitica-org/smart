import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from './common.js';

/** STU-02 — edit personal information after onboarding. */
export const UpdatePersonalInfoRequestSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters.')
    .max(100, 'Full name must be at most 100 characters.'),
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
  fullName: z.string(),
  email: z.string(),
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
