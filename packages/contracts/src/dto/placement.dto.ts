import { z } from 'zod';
import {
  CertifiableTierSchema,
  JdParseStatusSchema,
  LevelNumberSchema,
  PlacementOutcomeSchema,
  TierSchema,
  TrackCodeSchema,
} from '../domain/enums.js';
import { IsoDateTimeSchema, ScoreSchema, UuidSchema } from './common.js';

/**
 * Placement overlay contracts.
 * Implementation owners: Ramansh (`matching` — JD parse, embeddings, cosine),
 * Vedika G (`placement` — JD records, shortlists, outcome ingestion).
 * Consumer: Satheswaran V (`apps/web-tpo`).
 */

/* --------------------------------- JD ingest ------------------------------- */

export const IngestJdRequestSchema = z.object({
  companyName: z.string().min(2).max(150),
  roleTitle: z.string().min(2).max(150),
  /** Either raw text or an uploaded R2 object key (PDF). */
  rawText: z.string().max(50_000).optional(),
  objectKey: z.string().max(512).optional(),
  institutionId: UuidSchema,
});
export type IngestJdRequest = z.infer<typeof IngestJdRequestSchema>;

/**
 * Structured output of the LLM JD parse. `minThresholds` maps a level to the
 * minimum tier the employer needs — this is what makes matching explainable
 * rather than a black-box similarity number.
 */
export const JdThresholdVectorSchema = z.object({
  requiredTrack: TrackCodeSchema,
  minThresholds: z.record(z.string(), CertifiableTierSchema),
  /** Competency names the JD emphasises, used for the cosine comparison. */
  emphasisedCompetencies: z.array(z.string()).max(20),
  /** Model's confidence in the parse; low confidence prompts TPO review. */
  parseConfidence: z.number().min(0).max(1),
});
export type JdThresholdVector = z.infer<typeof JdThresholdVectorSchema>;

export const JobDescriptionDtoSchema = z.object({
  jdId: UuidSchema,
  institutionId: UuidSchema,
  companyName: z.string(),
  roleTitle: z.string(),
  status: JdParseStatusSchema,
  thresholds: JdThresholdVectorSchema.nullable(),
  /** True when a TPO hand-corrected the parsed thresholds. */
  manuallyCorrected: z.boolean(),
  createdAt: IsoDateTimeSchema,
  parsedAt: IsoDateTimeSchema.nullable(),
});
export type JobDescriptionDto = z.infer<typeof JobDescriptionDtoSchema>;

/* --------------------------------- matching -------------------------------- */

export const MatchRequestSchema = z.object({
  jdId: UuidSchema,
  cohortId: UuidSchema.optional(),
  /** Hard filters applied before cosine ranking. */
  filters: z
    .object({
      trackCodes: z.array(TrackCodeSchema).optional(),
      minHeadlineTier: CertifiableTierSchema.optional(),
      minLevelCleared: LevelNumberSchema.optional(),
      graduationYear: z.number().int().optional(),
    })
    .optional(),
  limit: z.number().int().min(1).max(500).default(50),
});
export type MatchRequest = z.infer<typeof MatchRequestSchema>;

/**
 * One matched candidate. `explanation` is required, not optional: a TPO must be
 * able to defend a shortlist to an employer, and an unexplained similarity
 * score is not defensible.
 */
export const CandidateMatchDtoSchema = z.object({
  studentId: UuidSchema,
  studentName: z.string(),
  trackCode: TrackCodeSchema,
  certificateId: UuidSchema.nullable(),
  highestLevelCleared: LevelNumberSchema,
  headlineTier: CertifiableTierSchema,
  /** Cosine similarity between candidate profile and JD requirement vectors. */
  similarityScore: z.number().min(0).max(1),
  /** Similarity after rule filters and threshold weighting. */
  matchScore: z.number().min(0).max(1),
  explanation: z.object({
    thresholdsMet: z.array(z.object({ level: LevelNumberSchema, required: TierSchema, actual: TierSchema })),
    thresholdsMissed: z.array(
      z.object({ level: LevelNumberSchema, required: TierSchema, actual: TierSchema }),
    ),
    strongCompetencies: z.array(z.string()),
    gapCompetencies: z.array(z.string()),
  }),
});
export type CandidateMatchDto = z.infer<typeof CandidateMatchDtoSchema>;

export const ShortlistDtoSchema = z.object({
  shortlistId: UuidSchema,
  jdId: UuidSchema,
  companyName: z.string(),
  roleTitle: z.string(),
  generatedAt: IsoDateTimeSchema,
  candidates: z.array(CandidateMatchDtoSchema),
  totalCandidatesConsidered: z.number().int(),
});
export type ShortlistDto = z.infer<typeof ShortlistDtoSchema>;

/* ---------------------------- placement outcomes --------------------------- */

/**
 * Real hiring outcomes written back so the predictive validity of the Gold tier
 * can be measured rather than asserted. This closes SMART's core feedback loop.
 */
export const PlacementRecordDtoSchema = z.object({
  recordId: UuidSchema,
  studentId: UuidSchema,
  trackCode: TrackCodeSchema,
  /** Tier held at the moment of placement, frozen for correlation analysis. */
  tierAtPlacement: TierSchema,
  placementCycle: z.string().regex(/^\d{4}-(SPRING|SUMMER|AUTUMN|WINTER)$/),
  companyName: z.string(),
  outcome: PlacementOutcomeSchema,
  interviewOffered: z.boolean(),
  jobOffered: z.boolean(),
  offeredPackageLpa: z.number().nonnegative().nullable(),
  recordedAt: IsoDateTimeSchema,
});
export type PlacementRecordDto = z.infer<typeof PlacementRecordDtoSchema>;

export const RecordOutcomeRequestSchema = PlacementRecordDtoSchema.omit({
  recordId: true,
  recordedAt: true,
  tierAtPlacement: true,
});
export type RecordOutcomeRequest = z.infer<typeof RecordOutcomeRequestSchema>;

/* ---------------------------- outbound webhooks ---------------------------- */

export const WebhookEndpointDtoSchema = z.object({
  endpointId: UuidSchema,
  institutionId: UuidSchema.nullable(),
  url: z.url(),
  events: z.array(z.enum(['smart.certificate.issued', 'smart.placement.matched'])).min(1),
  active: z.boolean(),
  /** Only the prefix is returned; the signing secret is write-once. */
  secretPrefix: z.string(),
  createdAt: IsoDateTimeSchema,
});
export type WebhookEndpointDto = z.infer<typeof WebhookEndpointDtoSchema>;

/** Header names for outbound HMAC-SHA256 signed webhook delivery. */
export const WEBHOOK_HEADERS = {
  signature: 'x-smart-signature',
  timestamp: 'x-smart-timestamp',
  eventId: 'x-smart-event-id',
  eventType: 'x-smart-event-type',
  /** Partners must dedupe on this — retries reuse the same key. */
  idempotencyKey: 'x-smart-idempotency-key',
} as const;

export const SHORTLIST_EXPORT_FORMATS = ['CSV', 'PDF', 'XLSX'] as const;
export const ShortlistExportFormatSchema = z.enum(SHORTLIST_EXPORT_FORMATS);
export type ShortlistExportFormat = z.infer<typeof ShortlistExportFormatSchema>;

export const CohortReadinessRowSchema = z.object({
  trackCode: TrackCodeSchema,
  trackName: z.string(),
  totalStudents: z.number().int(),
  gold: z.number().int(),
  silver: z.number().int(),
  bronze: z.number().int(),
  belowBronze: z.number().int(),
  notAttempted: z.number().int(),
  averageScore: ScoreSchema.nullable(),
});
export type CohortReadinessRow = z.infer<typeof CohortReadinessRowSchema>;
