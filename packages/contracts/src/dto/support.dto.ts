import { z } from 'zod';
import { AuditLogDtoSchema } from './onboarding.dto.js';

export const SUPPORT_TICKET_ID_REGEX = /^[A-Za-z0-9_-]{3,64}$/;

export const SupportGrantRequestSchema = z.object({
  targetUserId: z.string().uuid(),
  ticketId: z
    .string()
    .regex(
      SUPPORT_TICKET_ID_REGEX,
      'Ticket ID must be 3-64 alphanumeric, hyphen, or underscore characters.',
    ),
  rationale: z.string().min(8, 'Rationale must be at least 8 characters.'),
  ttlSeconds: z.number().int().min(60).max(3600).optional().default(900),
});
export type SupportGrantRequest = z.infer<typeof SupportGrantRequestSchema>;

export const SupportGrantResponseSchema = z.object({
  grantId: z.string().uuid(),
  expiresAt: z.string(),
});
export type SupportGrantResponse = z.infer<typeof SupportGrantResponseSchema>;

export const ImpersonateRequestSchema = z.object({
  grantId: z.string().uuid(),
});
export type ImpersonateRequest = z.infer<typeof ImpersonateRequestSchema>;

export const SupportSessionResponseSchema = z.object({
  sessionId: z.string().uuid(),
  grantId: z.string().uuid(),
  targetUserId: z.string().uuid(),
  delegatedAccessToken: z.string(),
  expiresAt: z.string(),
});
export type SupportSessionResponse = z.infer<typeof SupportSessionResponseSchema>;

export const SupportDiagnosticResponseSchema = z.object({
  userId: z.string().uuid(),
  email: z.string(),
  fullName: z.string(),
  role: z.string(),
  accountState: z.enum(['ACTIVE', 'HELD', 'DEACTIVATED']),
  heldAt: z.string().nullable(),
  institutionId: z.string().nullable(),
  onboardingCompleted: z.boolean(),
  verifiedSkillCount: z.number().optional(),
  enrolledTracks: z.array(z.string()).optional(),
});
export type SupportDiagnosticResponse = z.infer<typeof SupportDiagnosticResponseSchema>;

export const SupportHistoryQuerySchema = z.object({
  actorId: z.string().uuid().optional(),
  targetUserId: z.string().uuid().optional(),
  ticketId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  take: z.number().int().min(1).max(100).optional(),
});
export type SupportHistoryQuery = z.infer<typeof SupportHistoryQuerySchema>;

export const SupportHistoryResponseSchema = z.object({
  items: z.array(AuditLogDtoSchema),
});
export type SupportHistoryResponse = z.infer<typeof SupportHistoryResponseSchema>;
