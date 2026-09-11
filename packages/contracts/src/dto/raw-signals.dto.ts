import { z } from 'zod';
import { ACTIVE_TAXONOMY_VERSION } from '../domain/skill-dimensions.js';
import { LanguageBreakdownEntrySchema } from './candidate-social.dto.js';
import { IsoDateTimeSchema, UuidSchema } from './common.js';
import { SignalSourceIdSchema } from './signals.dto.js';

/**
 * Provider-agnostic raw signal envelope emitted by signal-ingestion (S6-VB-01).
 *
 * Owner: Vishal Bharath R.
 */

export const GithubRawPayloadSchema = z.object({
  sourceId: z.literal('GITHUB'),
  languages: z.array(LanguageBreakdownEntrySchema).max(20),
  selectedSkillNames: z.array(z.string().min(1).max(80)).max(30),
});
export type GithubRawPayload = z.infer<typeof GithubRawPayloadSchema>;

export const HackerrankBadgeSchema = z.object({
  name: z.string().min(1).max(120),
  level: z.string().min(1).max(40),
});
export type HackerrankBadge = z.infer<typeof HackerrankBadgeSchema>;

export const HackerrankContestRatingSchema = z.object({
  track: z.string().min(1).max(80),
  rating: z.number().nonnegative(),
  rank: z.number().int().nonnegative().optional(),
});
export type HackerrankContestRating = z.infer<typeof HackerrankContestRatingSchema>;

export const HackerrankSolvedByTagSchema = z.object({
  tag: z.string().min(1).max(80),
  count: z.number().int().nonnegative(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'UNKNOWN']).default('UNKNOWN'),
});
export type HackerrankSolvedByTag = z.infer<typeof HackerrankSolvedByTagSchema>;

export const HackerrankRawPayloadSchema = z.object({
  sourceId: z.literal('HACKERRANK'),
  badges: z.array(HackerrankBadgeSchema).max(50),
  contestRatings: z.array(HackerrankContestRatingSchema).max(20).optional(),
  solvedByTag: z.array(HackerrankSolvedByTagSchema).max(100),
});
export type HackerrankRawPayload = z.infer<typeof HackerrankRawPayloadSchema>;

export const LeetcodeSolvedCountsSchema = z.object({
  easy: z.number().int().nonnegative(),
  medium: z.number().int().nonnegative(),
  hard: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});
export type LeetcodeSolvedCounts = z.infer<typeof LeetcodeSolvedCountsSchema>;

export const LeetcodeTagStatSchema = z.object({
  tagSlug: z.string().min(1).max(80),
  problemsSolved: z.number().int().nonnegative(),
  difficultyMix: z
    .object({
      easy: z.number().int().nonnegative().default(0),
      medium: z.number().int().nonnegative().default(0),
      hard: z.number().int().nonnegative().default(0),
    })
    .optional(),
});
export type LeetcodeTagStat = z.infer<typeof LeetcodeTagStatSchema>;

export const LeetcodeRawPayloadSchema = z.object({
  sourceId: z.literal('LEETCODE'),
  solvedCounts: LeetcodeSolvedCountsSchema,
  tagStats: z.array(LeetcodeTagStatSchema).max(100),
  recentActivityDays: z.number().int().nonnegative(),
});
export type LeetcodeRawPayload = z.infer<typeof LeetcodeRawPayloadSchema>;

export const RawSignalPayloadSchema = z.discriminatedUnion('sourceId', [
  GithubRawPayloadSchema,
  HackerrankRawPayloadSchema,
  LeetcodeRawPayloadSchema,
]);
export type RawSignalPayload = z.infer<typeof RawSignalPayloadSchema>;

export const RawSignalEnvelopeSchema = z.object({
  userId: UuidSchema,
  sourceId: SignalSourceIdSchema,
  externalAccountId: z.string().min(1).max(120),
  fetchedAt: IsoDateTimeSchema,
  consentScope: z.string().min(1).max(120),
  taxonomyVersion: z.string().min(1).max(40).default(ACTIVE_TAXONOMY_VERSION),
  payload: RawSignalPayloadSchema,
});
export type RawSignalEnvelope = z.infer<typeof RawSignalEnvelopeSchema>;
