import { z } from 'zod';
import { CorroborationReviewFlagSchema, CorroborationSnapshotSchema } from './signals.dto.js';
import { PaginationQuerySchema } from './common.js';

/**
 * HTTP DTOs for corroboration read APIs.
 * Owner: Ramansh (S6-RM-10).
 */

export const StudentCorroborationResponseSchema = CorroborationSnapshotSchema;
export type StudentCorroborationResponse = z.infer<typeof StudentCorroborationResponseSchema>;

export const AdminReviewFlagsQuerySchema = PaginationQuerySchema;
export type AdminReviewFlagsQuery = z.infer<typeof AdminReviewFlagsQuerySchema>;

export const AdminReviewFlagsResponseSchema = z.object({
  flags: z.array(CorroborationReviewFlagSchema),
  meta: z.object({
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});
export type AdminReviewFlagsResponse = z.infer<typeof AdminReviewFlagsResponseSchema>;

export const ResolveReviewFlagRequestSchema = z.object({
  resolutionNote: z.string().min(1).max(500),
});
export type ResolveReviewFlagRequest = z.infer<typeof ResolveReviewFlagRequestSchema>;

export const ResolveReviewFlagResponseSchema = CorroborationReviewFlagSchema;
export type ResolveReviewFlagResponse = z.infer<typeof ResolveReviewFlagResponseSchema>;
