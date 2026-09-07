import { z } from 'zod';
import {
  AtsStageSchema,
  CertifiableTierSchema,
  EmploymentTypeSchema,
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
import { SKILL_CODE_SET, SKILL_STREAMS, SKILL_TAXONOMY_DOMAINS } from '../domain/skills.js';
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

export const SkillTaxonomyDomainSchema = z.enum(SKILL_TAXONOMY_DOMAINS);
export const SkillStreamSchema = z.enum(SKILL_STREAMS);

/** INF-05 skill code only — never free-text names. */
export const TaxonomySkillCodeSchema = z
  .string()
  .min(2)
  .max(64)
  .refine((code) => SKILL_CODE_SET.has(code), { message: 'Unknown taxonomy skill code' });

export const SkillRequirementSchema = z.object({
  skillCode: TaxonomySkillCodeSchema,
  minProficiency: SkillProficiencySchema,
});
export type SkillRequirement = z.infer<typeof SkillRequirementSchema>;

/**
 * TPO create body. `institutionId` is taken from the access-token `inst`
 * claim in api-core — do not accept it from the client.
 */
export const JobOpeningFieldsSchema = z.object({
  companyName: z.string().min(2).max(150),
  roleTitle: z.string().min(2).max(150),
  domain: SkillTaxonomyDomainSchema,
  stream: SkillStreamSchema.optional(),
  requiredSkills: z.array(SkillRequirementSchema).min(1).max(20),
  minYearsExperience: z.number().int().min(0).max(40),
  maxYearsExperience: z.number().int().min(0).max(40),
  location: z.string().min(1).max(120),
  employmentType: EmploymentTypeSchema,
  headcount: z.number().int().min(1).max(10_000),
});

export const CreateJobOpeningRequestSchema = JobOpeningFieldsSchema.superRefine((value, ctx) => {
  if (value.minYearsExperience > value.maxYearsExperience) {
    ctx.addIssue({
      code: 'custom',
      path: ['maxYearsExperience'],
      message: 'maxYearsExperience must be greater than or equal to minYearsExperience',
    });
  }
});
export type CreateJobOpeningRequest = z.infer<typeof CreateJobOpeningRequestSchema>;

export const JobOpeningDtoSchema = JobOpeningFieldsSchema.extend({
  openingId: UuidSchema,
  institutionId: UuidSchema,
  status: JobOpeningStatusSchema,
  createdAt: IsoDateTimeSchema,
});
export type JobOpeningDto = z.infer<typeof JobOpeningDtoSchema>;

export const ListJobOpeningsQuerySchema = z.object({
  status: JobOpeningStatusSchema.optional(),
});
export type ListJobOpeningsQuery = z.infer<typeof ListJobOpeningsQuerySchema>;

export const ListJobOpeningsResponseSchema = z.object({
  openings: z.array(JobOpeningDtoSchema),
});
export type ListJobOpeningsResponse = z.infer<typeof ListJobOpeningsResponseSchema>;

export const ApplicationDtoSchema = z.object({
  applicationId: UuidSchema,
  openingId: UuidSchema,
  studentId: UuidSchema,
  studentName: z.string().optional(),
  studentEmail: z.string().optional(),
  primaryTrackCode: z.string().optional(),
  stage: AtsStageSchema,
  matchScore: z.number().min(0).max(1).nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type ApplicationDto = z.infer<typeof ApplicationDtoSchema>;

/**
 * TPO shortlist body (AC-T05). The opening's `institutionId` is taken from the
 * access-token `inst` claim in api-core — do not accept it from the client, and
 * do not accept a stage: shortlisting always lands on `SHORTLISTED`.
 * `matchScore` is the SE-T05 score the TPO actually saw, carried through so a
 * shortlist decision stays auditable against the ranking that produced it.
 */
export const CreateApplicationRequestSchema = z.object({
  openingId: UuidSchema,
  studentId: UuidSchema,
  matchScore: z.number().min(0).max(1).optional(),
});
export type CreateApplicationRequest = z.infer<typeof CreateApplicationRequestSchema>;

export const ListApplicationsResponseSchema = z.object({
  applications: z.array(ApplicationDtoSchema),
});
export type ListApplicationsResponse = z.infer<typeof ListApplicationsResponseSchema>;

/**
 * Candidate My Applications row (CN-T06 / GET /me/applications).
 * Same Application identity and `AtsStage` as CO-T02. Company/role fields are
 * copied from the joined CO-T01 JobOpening — not a second application state.
 * The route accepts no `studentId`; api-core takes identity from the token.
 */
export const CandidateApplicationDtoSchema = ApplicationDtoSchema.extend({
  companyName: JobOpeningFieldsSchema.shape.companyName,
  roleTitle: JobOpeningFieldsSchema.shape.roleTitle,
  location: z.string().max(120),
  employmentType: EmploymentTypeSchema.nullable(),
  domain: SkillTaxonomyDomainSchema.nullable(),
});
export type CandidateApplicationDto = z.infer<typeof CandidateApplicationDtoSchema>;

export const ListMyApplicationsResponseSchema = z.object({
  applications: z.array(CandidateApplicationDtoSchema),
});
export type ListMyApplicationsResponse = z.infer<typeof ListMyApplicationsResponseSchema>;

export const PatchApplicationStageRequestSchema = z.object({
  stage: AtsStageSchema,
});
export type PatchApplicationStageRequest = z.infer<typeof PatchApplicationStageRequestSchema>;

/**
 * AC-T06 send-to-company lands on `AI_VERIFIED` — the SE-T02 confidence check
 * gating this transition (see `sendToCompany` below) *is* the AI verification
 * step, so it maps onto the real CO-T02 kanban column rather than skipping
 * straight to `INTERVIEW`.
 */
export const SEND_TO_COMPANY_STAGE = 'AI_VERIFIED' as const;

export const ApplicationConfidenceDtoSchema = z.object({
  applicationId: UuidSchema,
  studentId: UuidSchema,
  available: z.boolean(),
  complete: z.boolean(),
  passed: z.boolean().nullable(),
  explanation: z.string().nullable(),
  promptRef: z.string().nullable(),
  sendBlockedReason: z.string().nullable(),
});
export type ApplicationConfidenceDto = z.infer<typeof ApplicationConfidenceDtoSchema>;

export const SkillClaimDtoSchema = z.object({
  claimId: UuidSchema,
  studentId: UuidSchema,
  skillCode: z.string().min(2).max(64),
  proficiency: SkillProficiencySchema,
  status: SkillClaimStatusSchema,
  strikes: z.number().int().min(0).max(2),
  lockedUntil: IsoDateTimeSchema.nullable(),
  lastAttemptId: UuidSchema.nullable(),
  /** ISO time when START is allowed again after a genuine fail (48h) or LOCKED. */
  retryAvailableAt: IsoDateTimeSchema.nullable().optional(),
  /** Language/framework/topic slice; drives v4 stem generation. */
  skillFocus: z.string().min(1).max(64).nullable().optional(),
  /** Per-focus verification state. Cooldown/lock applies only to that slice. */
  focusProgress: z
    .array(
      z.object({
        focus: z.string().min(1).max(64),
        status: SkillClaimStatusSchema,
        strikes: z.number().int().min(0).max(2),
        lockedUntil: IsoDateTimeSchema.nullable(),
        lastAttemptId: UuidSchema.nullable(),
        lastGenuineFailureAt: IsoDateTimeSchema.nullable().optional(),
        retryAvailableAt: IsoDateTimeSchema.nullable().optional(),
      }),
    )
    .optional(),
});
export type SkillClaimDto = z.infer<typeof SkillClaimDtoSchema>;

/**
 * CN-T04 — candidate declares a track-scoped skill from INF-05.
 * Creates/updates SkillClaim at DECLARED (re-declare after LOCKED cooldown).
 * Owner: Vishal Bharath R (assessment). Consumer: Satheswaran V (web-student).
 */
export const DeclareSkillClaimRequestSchema = z.object({
  skillCode: z.string().min(2).max(64),
  proficiency: SkillProficiencySchema,
  skillFocus: z.string().min(1).max(64).optional(),
});
export type DeclareSkillClaimRequest = z.infer<typeof DeclareSkillClaimRequestSchema>;

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
