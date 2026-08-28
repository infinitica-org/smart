import { z } from 'zod';
import {
  AtsStageSchema,
  CertifiableTierSchema,
  JobOpeningStatusSchema,
  JdParseStatusSchema,
  LevelNumberSchema,
  MatchMethodSchema,
  PlacementOutcomeSchema,
  SkillClaimStatusSchema,
  SkillProficiencySchema,
  TierSchema,
  TrackCodeSchema,
} from '../domain/enums.js';
import { IsoDateTimeSchema, ScoreSchema, UuidSchema } from './common.js';

/**
 * Placement overlay contracts.
 * Implementation owners: Vishal V (rules ranker + loop), Ramansh (`matching`
 * path / optional cosine), Vedika G (JD records, shortlists, outcomes),
 * Vishal Bharath R (skill claims + ATS APIs). Consumer: Satheswaran V.
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
  /** Cosine similarity — optional V1; omit or 0 when method is RULES. */
  similarityScore: z.number().min(0).max(1),
  /** Rank shown to the TPO. Rules are P0 (ADR 0012). */
  matchScore: z.number().min(0).max(1),
  method: MatchMethodSchema.default('RULES'),
  explanation: z.object({
    thresholdsMet: z.array(
      z.object({ level: LevelNumberSchema, required: TierSchema, actual: TierSchema }),
    ),
    thresholdsMissed: z.array(
      z.object({ level: LevelNumberSchema, required: TierSchema, actual: TierSchema }),
    ),
    strongCompetencies: z.array(z.string()),
    gapCompetencies: z.array(z.string()),
    /** One-line why for the TPO. Required when method is RULES. */
    why: z.string().max(280).optional(),
    rules: z
      .object({
        skill: z.number().min(0).max(1),
        proficiency: z.number().min(0).max(1),
        domain: z.number().min(0).max(1),
        experience: z.number().min(0).max(1),
        location: z.number().min(0).max(1),
      })
      .optional(),
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

/* ----------------------- structured openings (PRD MMP) ---------------------- */

export const SkillRequirementSchema = z.object({
  skillCode: z.string().min(2).max(64),
  minProficiency: SkillProficiencySchema,
});
export type SkillRequirement = z.infer<typeof SkillRequirementSchema>;

export const CreateJobOpeningRequestSchema = z.object({
  institutionId: UuidSchema,
  companyName: z.string().min(2).max(150),
  roleTitle: z.string().min(2).max(150),
  requiredSkills: z.array(SkillRequirementSchema).min(1).max(20),
  domainCode: z.string().max(8).optional(),
  minYearsExperience: z.number().int().min(0).max(40).optional(),
  location: z.string().max(120).optional(),
});
export type CreateJobOpeningRequest = z.infer<typeof CreateJobOpeningRequestSchema>;

export const JobOpeningDtoSchema = CreateJobOpeningRequestSchema.extend({
  openingId: UuidSchema,
  status: JobOpeningStatusSchema,
  createdAt: IsoDateTimeSchema,
});
export type JobOpeningDto = z.infer<typeof JobOpeningDtoSchema>;

export const ApplicationDtoSchema = z.object({
  applicationId: UuidSchema,
  openingId: UuidSchema,
  studentId: UuidSchema,
  stage: AtsStageSchema,
  matchScore: z.number().min(0).max(1).nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type ApplicationDto = z.infer<typeof ApplicationDtoSchema>;

export const PatchApplicationStageRequestSchema = z.object({
  stage: AtsStageSchema,
});
export type PatchApplicationStageRequest = z.infer<typeof PatchApplicationStageRequestSchema>;

export const SkillClaimDtoSchema = z.object({
  claimId: UuidSchema,
  studentId: UuidSchema,
  skillCode: z.string().min(2).max(64),
  proficiency: SkillProficiencySchema,
  status: SkillClaimStatusSchema,
  strikes: z.number().int().min(0).max(2),
  lockedUntil: IsoDateTimeSchema.nullable(),
  lastAttemptId: UuidSchema.nullable(),
});
export type SkillClaimDto = z.infer<typeof SkillClaimDtoSchema>;

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
