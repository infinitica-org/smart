import { z } from 'zod';
import { LevelNumberSchema, TierSchema, TrackCodeSchema } from '../domain/enums.js';
import { CohortReadinessRowSchema } from './placement.dto.js';
import { IsoDateTimeSchema, ScoreSchema, UuidSchema } from './common.js';

/**
 * Analytics & reporting contracts.
 * Implementation owner: Vedika G (`apps/api-core/src/modules/analytics`).
 * Consumers: Satheswaran V (`web-tpo`), Vishal Bharath R (`web-admin`).
 */

export const CohortReadinessDtoSchema = z.object({
  institutionId: UuidSchema,
  institutionName: z.string(),
  cohortId: UuidSchema,
  cohortLabel: z.string(),
  generatedAt: IsoDateTimeSchema,
  rows: z.array(CohortReadinessRowSchema),
  totals: z.object({
    students: z.number().int(),
    certificatesIssued: z.number().int(),
    goldShare: z.number().min(0).max(1),
    completionRate: z.number().min(0).max(1),
  }),
});
export type CohortReadinessDto = z.infer<typeof CohortReadinessDtoSchema>;

/**
 * The batch gap report — the artifact that drives curriculum change and is a
 * major reason institutions renew. Ranked weakest-first.
 */
export const BatchGapReportDtoSchema = z.object({
  cohortId: UuidSchema,
  trackCode: TrackCodeSchema,
  generatedAt: IsoDateTimeSchema,
  gaps: z.array(
    z.object({
      competencyId: UuidSchema,
      competencyName: z.string(),
      domainCode: z.string(),
      cohortAverage: ScoreSchema,
      /** Share of the cohort scoring below the Bronze cut on this competency. */
      belowBronzeShare: z.number().min(0).max(1),
      studentsAffected: z.number().int(),
      severity: z.enum(['CRITICAL', 'HIGH', 'MODERATE', 'LOW']),
    }),
  ),
  strengths: z.array(z.object({ competencyName: z.string(), cohortAverage: ScoreSchema })),
  /** Sample size caveat so a 12-student batch is not read as a trend. */
  interpretationCaveat: z.string(),
});
export type BatchGapReportDto = z.infer<typeof BatchGapReportDtoSchema>;

/**
 * SMART's north-star metric: do Gold-tier candidates convert to interviews and
 * offers at a higher rate than the cohort baseline?
 *
 * HONESTY REQUIREMENT: this is only meaningful after 2+ placement cycles.
 * `statisticallyMeaningful` must gate any published claim.
 */
export const CorrelationReportDtoSchema = z.object({
  trackCode: TrackCodeSchema,
  placementCycles: z.array(z.string()),
  cyclesObserved: z.number().int(),
  byTier: z.array(
    z.object({
      tier: TierSchema,
      candidates: z.number().int(),
      interviewRate: z.number().min(0).max(1),
      offerRate: z.number().min(0).max(1),
      averagePackageLpa: z.number().nullable(),
    }),
  ),
  cohortBaseline: z.object({
    interviewRate: z.number().min(0).max(1),
    offerRate: z.number().min(0).max(1),
  }),
  /** Gold offer rate divided by baseline offer rate. */
  goldLiftMultiple: z.number().nullable(),
  statisticallyMeaningful: z.boolean(),
  caveat: z.string(),
  generatedAt: IsoDateTimeSchema,
});
export type CorrelationReportDto = z.infer<typeof CorrelationReportDtoSchema>;

/** Super Admin platform health surface. Consumer: `web-admin`. */
export const PlatformHealthDtoSchema = z.object({
  generatedAt: IsoDateTimeSchema,
  activeAttempts: z.number().int(),
  attemptsLastHour: z.number().int(),
  api: z.object({
    p50LatencyMs: z.number(),
    p95LatencyMs: z.number(),
    errorRate: z.number().min(0).max(1),
    rateLimitViolationsLastHour: z.number().int(),
  }),
  queues: z.array(
    z.object({
      name: z.string(),
      waiting: z.number().int(),
      active: z.number().int(),
      failed: z.number().int(),
      deadLettered: z.number().int(),
    }),
  ),
  redis: z.object({
    usedMemoryMb: z.number(),
    maxMemoryMb: z.number(),
    hitRate: z.number().min(0).max(1),
    evictedKeysLastHour: z.number().int(),
  }),
  ai: z.object({
    callsLastHour: z.number().int(),
    fallbackShare: z.number().min(0).max(1),
    spendTodayUsd: z.number(),
    automatedScoringPaused: z.boolean(),
  }),
  integrity: z.object({
    flaggedAttemptsAwaitingReview: z.number().int(),
    certificatesBlocked: z.number().int(),
  }),
});
export type PlatformHealthDto = z.infer<typeof PlatformHealthDtoSchema>;

export const LevelFunnelDtoSchema = z.object({
  trackCode: TrackCodeSchema,
  steps: z.array(
    z.object({
      levelNumber: LevelNumberSchema,
      attempted: z.number().int(),
      cleared: z.number().int(),
      clearRate: z.number().min(0).max(1),
    }),
  ),
});
export type LevelFunnelDto = z.infer<typeof LevelFunnelDtoSchema>;
