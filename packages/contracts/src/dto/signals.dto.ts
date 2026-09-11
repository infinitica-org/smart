import { z } from 'zod';
import { ACTIVE_TAXONOMY_VERSION } from '../domain/skill-dimensions.js';
import { IsoDateTimeSchema, ScoreSchema, UuidSchema, WeightSchema } from './common.js';

/**
 * Passive/active signal contracts for the corroboration engine.
 * Owner: Ramansh (S6-RM-10).
 */

export const SIGNAL_SOURCE_IDS = ['GITHUB', 'HACKERRANK', 'LEETCODE', 'RESUME', 'MANUAL'] as const;
export type SignalSourceId = (typeof SIGNAL_SOURCE_IDS)[number];

export const SignalSourceIdSchema = z.enum(SIGNAL_SOURCE_IDS);

export const SkillDimensionRefSchema = z.object({
  taxonomyVersion: z.string().min(1).max(40).default(ACTIVE_TAXONOMY_VERSION),
  dimensionKey: z.string().min(1).max(80),
  skillCode: z.string().min(1).max(80).optional(),
  proficiencyLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL']).optional(),
});

export type SkillDimensionRefDto = z.infer<typeof SkillDimensionRefSchema>;

export const VectorizedSignalEntrySchema = z.object({
  dimension: SkillDimensionRefSchema,
  sourceId: SignalSourceIdSchema,
  /** Normalized passive strength in [0, 1]. */
  score: WeightSchema,
  confidence: WeightSchema,
});
export type VectorizedSignalEntry = z.infer<typeof VectorizedSignalEntrySchema>;

export const VectorizedSignalSchema = z.object({
  userId: UuidSchema,
  sourceId: SignalSourceIdSchema,
  taxonomyVersion: z.string().min(1).max(40),
  encodedAt: IsoDateTimeSchema,
  entries: z.array(VectorizedSignalEntrySchema).max(100),
  /** OAuth/consent scope under which this signal was collected. */
  consentScope: z.string().min(1).max(120).optional(),
  fetchedAt: IsoDateTimeSchema.optional(),
});
export type VectorizedSignal = z.infer<typeof VectorizedSignalSchema>;

export const AssessmentPerformanceEntrySchema = z.object({
  dimension: SkillDimensionRefSchema,
  scorePercent: ScoreSchema,
  passed: z.boolean(),
  proficiencyLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL']).optional(),
});
export type AssessmentPerformanceEntry = z.infer<typeof AssessmentPerformanceEntrySchema>;

export const AssessmentPerformanceVectorSchema = z.object({
  userId: UuidSchema,
  claimId: UuidSchema,
  skillCode: z.string().min(1).max(80),
  assessedAt: IsoDateTimeSchema,
  entries: z.array(AssessmentPerformanceEntrySchema).min(1).max(20),
});
export type AssessmentPerformanceVector = z.infer<typeof AssessmentPerformanceVectorSchema>;

export const TrustWeightedReadoutEntrySchema = z.object({
  dimension: SkillDimensionRefSchema,
  passiveScore: WeightSchema.nullable(),
  assessmentScore: ScoreSchema.nullable(),
  corroborationScore: ScoreSchema,
  confidence: WeightSchema,
  contradictionFlag: z.boolean(),
});
export type TrustWeightedReadoutEntry = z.infer<typeof TrustWeightedReadoutEntrySchema>;

export const CORROBORATION_REVIEW_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type CorroborationReviewSeverity = (typeof CORROBORATION_REVIEW_SEVERITIES)[number];

export const CorroborationReviewFlagSchema = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  /** Denormalized for institution-scoped admin queries (Redis v1). */
  institutionId: UuidSchema.nullable().optional(),
  claimId: UuidSchema.optional(),
  skillCode: z.string().min(1).max(80),
  severity: z.enum(CORROBORATION_REVIEW_SEVERITIES),
  reason: z.string().min(1).max(500),
  passiveScore: WeightSchema,
  assessmentScore: ScoreSchema,
  createdAt: IsoDateTimeSchema,
  resolvedAt: IsoDateTimeSchema.nullable(),
  resolutionNote: z.string().max(500).nullable(),
});
export type CorroborationReviewFlag = z.infer<typeof CorroborationReviewFlagSchema>;

export const CorroborationSnapshotSchema = z.object({
  userId: UuidSchema,
  taxonomyVersion: z.string().min(1).max(40),
  updatedAt: IsoDateTimeSchema,
  readouts: z.array(TrustWeightedReadoutEntrySchema).max(100),
  pendingFlagIds: z.array(UuidSchema).max(20),
});
export type CorroborationSnapshot = z.infer<typeof CorroborationSnapshotSchema>;

export const SignalWeightModelSchema = z.object({
  modelVersion: z.string().min(1).max(40),
  trainedAt: IsoDateTimeSchema.nullable(),
  cohortSize: z.number().int().nonnegative(),
  /** SHA-256 hex over version + weights JSON — tamper detection for learned models. */
  modelChecksum: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
  /** sourceId -> dimensionKey -> weight in [0, 1]. */
  weightsBySourceAndDimension: z.record(SignalSourceIdSchema, z.record(z.string(), WeightSchema)),
});
export type SignalWeightModel = z.infer<typeof SignalWeightModelSchema>;
