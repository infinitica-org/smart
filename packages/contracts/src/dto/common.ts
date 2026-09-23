import { z } from 'zod';
export { z };

/** Primitives shared by every DTO. Owner: Tino. */

export const UuidSchema = z.uuid();
export const IsoDateTimeSchema = z.iso.datetime({ offset: true });
/** Calendar date (YYYY-MM-DD) for drive / deadline fields on job openings. */
export const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
export const EmailSchema = z.email().max(255).toLowerCase();

/** Percentage score, 0–100 with two decimals of precision in the DB. */
export const ScoreSchema = z.number().min(0).max(100);

/** Weight in [0,1]. Domain weights must sum to 1.0 per track. */
export const WeightSchema = z.number().min(0).max(1);

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  sortBy: z.string().max(60).optional(),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export function paginatedSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    data: z.array(item),
    meta: z.object({
      page: z.number().int(),
      pageSize: z.number().int(),
      total: z.number().int(),
      totalPages: z.number().int(),
    }),
  });
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

/**
 * Structured error body returned by every SMART API error. The frontend
 * switches on `error`, never on the human-readable `message`.
 */
export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  statusCode: z.number().int(),
  /** Correlation id — always include this when reporting a bug. */
  traceId: z.string().optional(),
  details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  /** Present only on 429 responses. */
  retryAfterSeconds: z.number().int().optional(),
  limit: z.number().int().optional(),
  window: z.string().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

/** Canonical `error` codes. Add here, not ad hoc in a module. */
export const API_ERROR_CODES = [
  'validation_failed',
  'unauthorized',
  'institution_held',
  'institution_deactivated',
  'account_held',
  'token_expired',
  'forbidden',
  'not_found',
  'conflict',
  'rate_limit_exceeded',
  'level_locked',
  'attempt_expired',
  'attempt_already_submitted',
  'integrity_hold',
  'cut_scores_unpublished',
  'ai_provider_unavailable',
  'sparse_agenda',
  'agenda_drift',
  'scoring_paused_low_agreement',
  'sandbox_timeout',
  'internal_error',
  'service_unavailable',
] as const;
export const ApiErrorCodeSchema = z.enum(API_ERROR_CODES);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

/** Async job acceptance envelope for `202 Accepted` responses. */
export const JobAcceptedSchema = z.object({
  jobId: z.string(),
  queue: z.string(),
  status: z.enum(['QUEUED', 'ACTIVE', 'COMPLETED', 'FAILED']),
  /** Advisory poll interval so clients don't hammer the status endpoint. */
  pollAfterMs: z.number().int().default(750),
  estimatedSlaSeconds: z.number().optional(),
});
export type JobAccepted = z.infer<typeof JobAcceptedSchema>;

export const HealthStatusSchema = z.object({
  status: z.enum(['ok', 'degraded', 'error']),
  version: z.string(),
  uptimeSeconds: z.number(),
  checks: z.record(
    z.string(),
    z.object({
      status: z.enum(['up', 'down', 'degraded']),
      latencyMs: z.number().optional(),
      message: z.string().optional(),
    }),
  ),
});
export type HealthStatus = z.infer<typeof HealthStatusSchema>;
