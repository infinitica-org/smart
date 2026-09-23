import { z } from 'zod';
import { OrgTypeSchema, TenantVerificationStatusSchema } from '../domain/enums.js';
import { IsoDateTimeSchema, UuidSchema } from './common.js';

export const OrganizationDtoSchema = z.object({
  organizationId: UuidSchema,
  name: z.string().min(1).max(200),
  domain: z.string().nullable(),
  orgType: OrgTypeSchema,
  verificationStatus: TenantVerificationStatusSchema,
  verificationReason: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export type OrganizationDto = z.infer<typeof OrganizationDtoSchema>;

export const CreateOrganizationRequestSchema = z.object({
  name: z.string().trim().min(1).max(200),
  domain: z.string().trim().max(255).optional().nullable(),
});

export type CreateOrganizationRequest = z.infer<typeof CreateOrganizationRequestSchema>;
