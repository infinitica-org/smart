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
import { AssessmentResultSchema } from '../domain/evidence/assessment-result.js';
import { SKILL_TAXONOMY_DOMAINS } from '../domain/skills.js';
import { IsoDateSchema, IsoDateTimeSchema, ScoreSchema, UuidSchema } from './common.js';
import { SkillCategoryIdSchema, TaxonomySkillCodeSchema } from './catalog.dto.js';

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
  /** @deprecated use `batchIds` — kept for one release, merged server-side as `batchIds ?? [cohortId]`. */
  cohortId: UuidSchema.optional(),
  /** S6-VV-76 — one or more Batches to scope the eligible pool to. Replaces `cohortId`. */
  batchIds: z.array(UuidSchema).max(20).optional(),
  /** S6-VV-76 — pool-scoping filter: excludes students with no CGPA on file when set. */
  minCgpa: z.number().min(0).max(10).optional(),
  /** S6-VV-76 — pool-scoping filter: student must hold every listed skill VERIFIED (AND). */
  requiredSkillCodes: z.array(TaxonomySkillCodeSchema).max(20).optional(),
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
  /** S6-VV-76 — pre-ranking eligible-pool size (post batch/CGPA/skill filters). */
  eligiblePoolCount: z.number().int(),
});
export type ShortlistDto = z.infer<typeof ShortlistDtoSchema>;

/* ------------------------------ async match runs ---------------------------- */

export const MatchRunStatusSchema = z.enum(['PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED']);
export type MatchRunStatus = z.infer<typeof MatchRunStatusSchema>;

/** S6-VV-76 — polling response for an async, batch-scoped match run. */
export const MatchRunDtoSchema = z.object({
  runId: UuidSchema,
  jdId: UuidSchema,
  status: MatchRunStatusSchema,
  eligiblePoolCount: z.number().int().nullable(),
  suggestedCount: z.number().int().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
  completedAt: IsoDateTimeSchema.nullable(),
  /** Populated only once `status` is `SUCCEEDED`. */
  shortlist: ShortlistDtoSchema.nullable(),
});
export type MatchRunDto = z.infer<typeof MatchRunDtoSchema>;

export const CreateMatchRunResponseSchema = z.object({
  runId: UuidSchema,
  status: MatchRunStatusSchema,
});
export type CreateMatchRunResponse = z.infer<typeof CreateMatchRunResponseSchema>;

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

export { SkillCategoryIdSchema, TaxonomySkillCodeSchema } from './catalog.dto.js';

export const SkillRequirementSchema = z.object({
  skillCode: TaxonomySkillCodeSchema,
  minProficiency: SkillProficiencySchema,
});
export type SkillRequirement = z.infer<typeof SkillRequirementSchema>;

/**
 * TPO create body. `institutionId` is taken from the access-token `inst`
 * claim in api-core — do not accept it from the client.
 */
const jobOpeningLongText = z.string().max(12_000);
const jobOpeningMediumText = z.string().max(4_000);
const jobOpeningShortText = z.string().max(500);

/** Metadata for a JD attachment stored in object storage (TPO upload before create). */
export const JobOpeningAttachedDocumentSchema = z.object({
  documentId: UuidSchema,
  fileName: z.string().min(1).max(255),
  fileUrl: z.string().min(1).max(2048),
  mimeType: z.string().min(1).max(127),
  fileSizeBytes: z.number().int().min(1).max(10_485_760),
  label: z.string().max(120).optional(),
});
export type JobOpeningAttachedDocument = z.infer<typeof JobOpeningAttachedDocumentSchema>;

export const UploadJobOpeningDocumentResponseSchema = JobOpeningAttachedDocumentSchema;
export type UploadJobOpeningDocumentResponse = z.infer<
  typeof UploadJobOpeningDocumentResponseSchema
>;

/** Uploaded company logo (object storage key + short-lived preview URL). */
export const UploadJobOpeningLogoResponseSchema = z.object({
  storageKey: z.string().min(1).max(2048),
  previewUrl: z.string().url().max(2048),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(127),
});
export type UploadJobOpeningLogoResponse = z.infer<typeof UploadJobOpeningLogoResponseSchema>;

export const JobOpeningFieldsSchema = z.object({
  companyName: z.string().min(2).max(150),
  roleTitle: z.string().min(2).max(150),
  domain: SkillTaxonomyDomainSchema,
  categoryId: SkillCategoryIdSchema.optional(),
  requiredSkills: z.array(SkillRequirementSchema).min(1).max(20),
  minYearsExperience: z.number().int().min(0).max(40),
  maxYearsExperience: z.number().int().min(0).max(40),
  location: z.string().min(1).max(120),
  employmentType: EmploymentTypeSchema,
  headcount: z.number().int().min(1).max(10_000).optional(),
  attachedDocuments: z.array(JobOpeningAttachedDocumentSchema).max(10).optional(),
  aboutCompany: jobOpeningLongText.optional(),
  companyOffers: jobOpeningMediumText.optional(),
  additionalCompanyDetails: jobOpeningMediumText.optional(),
  roleDetails: jobOpeningLongText.optional(),
  salaryDetails: jobOpeningShortText.optional(),
  roundDetails: jobOpeningMediumText.optional(),
  hiringDetails: jobOpeningLongText.optional(),
  driveSpoc: z.string().min(1).max(200).optional(),
  driveDate: IsoDateSchema.optional(),
  lastDateToApply: IsoDateSchema.optional(),
});

export const CreateJobOpeningRequestSchema = JobOpeningFieldsSchema.extend({
  /** Object storage key from `POST /placement/openings/logo/upload`. */
  companyLogoStorageKey: z.string().min(1).max(2048).optional(),
}).superRefine((value, ctx) => {
  if (value.minYearsExperience > value.maxYearsExperience) {
    ctx.addIssue({
      code: 'custom',
      path: ['maxYearsExperience'],
      message: 'maxYearsExperience must be greater than or equal to minYearsExperience',
    });
  }
  if (value.driveDate && value.lastDateToApply && value.lastDateToApply > value.driveDate) {
    ctx.addIssue({
      code: 'custom',
      path: ['lastDateToApply'],
      message: 'lastDateToApply must be on or before driveDate',
    });
  }
});
export type CreateJobOpeningRequest = z.infer<typeof CreateJobOpeningRequestSchema>;

export const JobOpeningDtoSchema = JobOpeningFieldsSchema.extend({
  openingId: UuidSchema,
  institutionId: UuidSchema,
  status: JobOpeningStatusSchema,
  createdAt: IsoDateTimeSchema,
  /** Time-limited signed URL when a logo object key is stored. */
  companyLogoUrl: z.string().url().max(2048).optional(),
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
  /** Latest competency intelligence from the most recent passed verification (read-only). */
  latestAssessmentResult: AssessmentResultSchema.nullable().optional(),
  /** Most recent settlement outcome when status is VERIFIED. */
  verificationDecision: z.enum(['VERIFIED', 'PROVISIONAL', 'FAILED']).nullable().optional(),
  claimConfidence: z.number().min(0).max(1).nullable().optional(),
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
