import { z } from 'zod';
import { IsoDateTimeSchema, ScoreSchema, UuidSchema } from './common.js';

/**
 * SE-T04 / S3-RM-10 — person-level cognitive & communication narrative.
 * Independent of skill claims. Implementation: Ramansh (`evaluation` + prompts).
 */

export const COGNITIVE_PROFILE_PROMPT_REF = 'cognitive-comm-profile@1' as const;
export const COGNITIVE_PROFILE_REFRESH_DAYS = 90;
export const COGNITIVE_PROFILE_NARRATIVE_MIN = 40;
export const COGNITIVE_PROFILE_NARRATIVE_MAX = 2000;
export const COGNITIVE_PROFILE_BULLET_MIN = 12;
export const COGNITIVE_PROFILE_BULLET_MAX = 240;
export const COGNITIVE_PROFILE_BULLET_MAX_ITEMS = 5;
export const COGNITIVE_PROFILE_BIO_DIGEST_MAX = 12_000;

const BulletSchema = z.string().min(COGNITIVE_PROFILE_BULLET_MIN).max(COGNITIVE_PROFILE_BULLET_MAX);

const BulletListSchema = z.array(BulletSchema).min(1).max(COGNITIVE_PROFILE_BULLET_MAX_ITEMS);

const NarrativeSchema = z
  .string()
  .min(COGNITIVE_PROFILE_NARRATIVE_MIN)
  .max(COGNITIVE_PROFILE_NARRATIVE_MAX);

export const CognitiveCommLlmOutputSchema = z.object({
  cognitiveNarrative: NarrativeSchema,
  communicationNarrative: NarrativeSchema,
  cognitiveStrengths: BulletListSchema,
  cognitiveWeaknesses: BulletListSchema,
  communicationStrengths: BulletListSchema,
  communicationWeaknesses: BulletListSchema,
  cognitiveScore: ScoreSchema.optional(),
  communicationScore: ScoreSchema.optional(),
});
export type CognitiveCommLlmOutput = z.infer<typeof CognitiveCommLlmOutputSchema>;

export const RefreshCognitiveProfileRequestSchema = z.object({
  force: z.boolean().optional().default(false),
});
export type RefreshCognitiveProfileRequest = z.infer<typeof RefreshCognitiveProfileRequestSchema>;

export const CognitiveProfileAxisSchema = z.object({
  narrative: NarrativeSchema,
  strengths: BulletListSchema,
  weaknesses: BulletListSchema,
  score: ScoreSchema.nullable(),
});
export type CognitiveProfileAxis = z.infer<typeof CognitiveProfileAxisSchema>;

export const CognitiveProfileSnapshotSchema = z.object({
  studentId: UuidSchema,
  refreshedAt: IsoDateTimeSchema,
  promptRef: z.string().regex(/^[a-z0-9-]+@\d+$/),
  cognitive: CognitiveProfileAxisSchema,
  communication: CognitiveProfileAxisSchema,
});
export type CognitiveProfileSnapshot = z.infer<typeof CognitiveProfileSnapshotSchema>;

export const RefreshCognitiveProfileResponseSchema = z.object({
  status: z.enum(['queued', 'ready']),
  studentId: UuidSchema,
  refreshedAt: IsoDateTimeSchema.nullable(),
  snapshot: CognitiveProfileSnapshotSchema.nullable(),
});
export type RefreshCognitiveProfileResponse = z.infer<typeof RefreshCognitiveProfileResponseSchema>;
