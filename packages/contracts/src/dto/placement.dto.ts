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
import { PublicCompetencyEvidenceSummarySchema } from './public-candidate-profile.dto.js';
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

export const SkillRequirementSchema = z.object({
  skillCode: TaxonomySkillCodeSchema,
  minProficiency: SkillProficiencySchema,
});
export type SkillRequirement = z.infer<typeof SkillRequirementSchema>;

/** LLM output for jd-skill-extract@1 — maps JD prose to skill@1 + blueprint competencies. */
export const EmphasisedCapabilitySchema = z.object({
  competencyId: UuidSchema,
  capability: z.string().min(1).max(500),
  skillCode: TaxonomySkillCodeSchema,
  role: z.enum(['critical', 'core', 'supporting']).default('core'),
});
export type EmphasisedCapability = z.infer<typeof EmphasisedCapabilitySchema>;

export const JdSkillExtractVectorSchema = z.object({
  requiredSkills: z.array(SkillRequirementSchema).max(20),
  emphasisedCapabilities: z.array(EmphasisedCapabilitySchema).max(30),
  parseConfidence: z.number().min(0).max(1),
});
export type JdSkillExtractVector = z.infer<typeof JdSkillExtractVectorSchema>;

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
  /** Minimum verified skill coverage (0–1) before a candidate enters the ranked shortlist. */
  minSkillCoverage: z.number().min(0).max(1).default(0.6),
});
export type MatchRequest = z.infer<typeof MatchRequestSchema>;

export const SKILL_FIT_STATUSES = ['MET', 'PARTIAL', 'MISSING'] as const;
export const SkillFitStatusSchema = z.enum(SKILL_FIT_STATUSES);
export type SkillFitStatus = z.infer<typeof SkillFitStatusSchema>;

export const SkillFitRowSchema = z.object({
  skillCode: TaxonomySkillCodeSchema,
  skillName: z.string(),
  status: SkillFitStatusSchema,
  requiredProficiency: SkillProficiencySchema,
  actualProficiency: SkillProficiencySchema.nullable(),
});
export type SkillFitRow = z.infer<typeof SkillFitRowSchema>;

/** Verified skill held by the candidate at match time (TPO card context). */
export const VerifiedSkillSummarySchema = z.object({
  skillCode: TaxonomySkillCodeSchema,
  skillName: z.string(),
  proficiency: SkillProficiencySchema,
});
export type VerifiedSkillSummary = z.infer<typeof VerifiedSkillSummarySchema>;

export const MATCH_EVIDENCE_SOURCES = ['ASSESSMENT', 'INFERRED', 'QLIX', 'NONE'] as const;
export const MatchEvidenceSourceSchema = z.enum(MATCH_EVIDENCE_SOURCES);
export type MatchEvidenceSource = z.infer<typeof MatchEvidenceSourceSchema>;

export const CapabilityFitRowSchema = z.object({
  competencyId: UuidSchema,
  capability: z.string(),
  skillCode: TaxonomySkillCodeSchema,
  hitScore: z.number().min(0).max(1),
  evidenceSource: MatchEvidenceSourceSchema,
});
export type CapabilityFitRow = z.infer<typeof CapabilityFitRowSchema>;

export const POTENTIAL_FIT_BANDS = ['STRONG', 'MODERATE', 'STRETCH'] as const;
export const PotentialFitSchema = z.enum(POTENTIAL_FIT_BANDS);
export type PotentialFit = z.infer<typeof PotentialFitSchema>;

export const TRANSFER_SKILL_REASONS = ['SAME_CATEGORY', 'CAPABILITY_OVERLAP'] as const;
export const TransferSkillReasonSchema = z.enum(TRANSFER_SKILL_REASONS);
export type TransferSkillReason = z.infer<typeof TransferSkillReasonSchema>;

export const TransferSkillRowSchema = z.object({
  skillCode: TaxonomySkillCodeSchema,
  skillName: z.string(),
  reason: TransferSkillReasonSchema,
});
export type TransferSkillRow = z.infer<typeof TransferSkillRowSchema>;

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
  /**
   * Rank shown to the TPO. For `SKILL_CAPABILITY`, verified required-skill demand (0–1 display;
   * may sort on uncapped raw when above bar). Not self-reported or blended capability score.
   */
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
    skillCoveragePct: z.number().min(0).max(1).optional(),
    capabilityCoveragePct: z.number().min(0).max(1).optional(),
    potentialFit: PotentialFitSchema.optional(),
    skillFit: z.array(SkillFitRowSchema).optional(),
    capabilityFit: z.array(CapabilityFitRowSchema).optional(),
    recruiterSummary: z.string().max(500).optional(),
    studentSummary: z.string().max(500).optional(),
    skillCapability: z
      .object({
        skill: z.number().min(0).max(1),
        proficiency: z.number().min(0).max(1),
        capability: z.number().min(0).max(1),
      })
      .optional(),
    verifiedSkills: z.array(VerifiedSkillSummarySchema).optional(),
    requiredSkillsHeld: z.number().int().min(0).optional(),
    requiredSkillsMissing: z.number().int().min(0).optional(),
    transferSkills: z.array(TransferSkillRowSchema).optional(),
    competencyEvidenceSummaries: z.array(PublicCompetencyEvidenceSummarySchema).max(12).optional(),
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
  /** Students with at least one verified required skill before `limit` (S6-RM-23). */
  candidatesScoredCount: z.number().int().min(0).optional(),
  matchMethod: MatchMethodSchema.optional(),
  minSkillCoverageApplied: z.number().min(0).max(1).optional(),
  jobRequirements: z
    .object({
      skills: z.array(SkillRequirementSchema),
      capabilities: z.array(EmphasisedCapabilitySchema),
    })
    .optional(),
});
export type ShortlistDto = z.infer<typeof ShortlistDtoSchema>;

/** Single-candidate fit drill-down (TPO or student view). */
export const MatchFitDtoSchema = z.object({
  studentId: UuidSchema,
  openingId: UuidSchema.optional(),
  applicationId: UuidSchema.optional(),
  runId: UuidSchema.optional(),
  roleTitle: z.string(),
  companyName: z.string(),
  matchScore: z.number().min(0).max(1),
  method: MatchMethodSchema,
  skillCoveragePct: z.number().min(0).max(1),
  capabilityCoveragePct: z.number().min(0).max(1),
  potentialFit: PotentialFitSchema,
  skillFit: z.array(SkillFitRowSchema),
  capabilityFit: z.array(CapabilityFitRowSchema),
  skillGaps: z.array(SkillFitRowSchema),
  competencyGaps: z.array(CapabilityFitRowSchema),
  strongCompetencies: z.array(z.string()),
  gapCompetencies: z.array(z.string()),
  why: z.string().max(280).optional(),
  recruiterSummary: z.string().max(500).optional(),
  studentSummary: z.string().max(500).optional(),
});
export type MatchFitDto = z.infer<typeof MatchFitDtoSchema>;

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

/** Company placement-stats page: every recorded outcome for one company (yearwise CTC). */
export const ListPlacementOutcomesQuerySchema = z.object({
  companyName: z.string().trim().min(1).max(150),
});
export type ListPlacementOutcomesQuery = z.infer<typeof ListPlacementOutcomesQuerySchema>;

export const ListPlacementOutcomesResponseSchema = z.object({
  records: z.array(PlacementRecordDtoSchema),
});
export type ListPlacementOutcomesResponse = z.infer<typeof ListPlacementOutcomesResponseSchema>;

/* ----------------------- structured openings (PRD MMP) ---------------------- */

export const SkillTaxonomyDomainSchema = z.enum(SKILL_TAXONOMY_DOMAINS);

export { SkillCategoryIdSchema, TaxonomySkillCodeSchema } from './catalog.dto.js';

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
  /** Optional free-text JD; parsed asynchronously into skills + capabilities. */
  rawText: z.string().max(50_000).optional(),
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
  minSscPercentage: z.number().min(0).max(100).optional(),
  minHscPercentage: z.number().min(0).max(100).optional(),
  /** Minimum college score as percentage; matched against student CGPA (`cgpa * 10`). */
  minCollegePercentage: z.number().min(0).max(100).optional(),
  /** When false, candidates with active backlogs are ineligible. Omitted or true = allowed. */
  backlogsAllowed: z.boolean().optional(),
});

export const CreateJobOpeningRequestSchema = JobOpeningFieldsSchema.extend({
  /** Institution-scoped employer from Company Repository (`PlacementEmployer`). */
  employerId: UuidSchema.optional(),
  /** Object storage key from `POST /placement/openings/logo/upload`. */
  companyLogoStorageKey: z.string().min(1).max(2048).optional(),
})
  .partial({ companyName: true })
  .superRefine((value, ctx) => {
    const name = value.companyName?.trim() ?? '';
    if (!value.employerId && name.length < 2) {
      ctx.addIssue({
        code: 'custom',
        path: ['companyName'],
        message: 'Select a company from the repository or enter a company name.',
      });
    }
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
  /** Linked institution employer profile when the opening was posted company-first. */
  employerId: UuidSchema.nullable().optional(),
  status: JobOpeningStatusSchema,
  createdAt: IsoDateTimeSchema,
  /** Time-limited signed URL when a logo object key is stored. */
  companyLogoUrl: z.string().url().max(2048).optional(),
  jdParseStatus: JdParseStatusSchema.optional(),
  parseConfidence: z.number().min(0).max(1).nullable().optional(),
  parsedAt: IsoDateTimeSchema.nullable().optional(),
  extractedRequirements: JdSkillExtractVectorSchema.nullable().optional(),
});
export type JobOpeningDto = z.infer<typeof JobOpeningDtoSchema>;

export const ParseOpeningJdResponseSchema = z.object({
  openingId: UuidSchema,
  jdParseStatus: JdParseStatusSchema,
  parseConfidence: z.number().min(0).max(1).nullable(),
  extractedRequirements: JdSkillExtractVectorSchema.nullable(),
});
export type ParseOpeningJdResponse = z.infer<typeof ParseOpeningJdResponseSchema>;

export const ListJobOpeningsQuerySchema = z.object({
  status: JobOpeningStatusSchema.optional(),
});
export type ListJobOpeningsQuery = z.infer<typeof ListJobOpeningsQuerySchema>;

export const ListJobOpeningsResponseSchema = z.object({
  openings: z.array(JobOpeningDtoSchema),
});
export type ListJobOpeningsResponse = z.infer<typeof ListJobOpeningsResponseSchema>;

/* ------------------------- placement employers (TPO) ------------------------- */

const placementEmployerLongText = z.string().max(8_000);
const placementEmployerMediumText = z.string().max(4_000);

export const PlacementEmployerFieldsSchema = z.object({
  name: z.string().trim().min(2).max(150),
  website: z.string().trim().max(255).optional(),
  linkedinUrl: z.string().trim().max(512).optional(),
  sector: z.string().trim().max(80).optional(),
  location: z.string().trim().max(120).optional(),
  aboutCompany: placementEmployerLongText.optional(),
  companyOffers: placementEmployerMediumText.optional(),
  additionalCompanyDetails: placementEmployerMediumText.optional(),
  logoStorageKey: z.string().min(1).max(2048).optional(),
});
export type PlacementEmployerFields = z.infer<typeof PlacementEmployerFieldsSchema>;

export const CreatePlacementEmployerRequestSchema = PlacementEmployerFieldsSchema;
export type CreatePlacementEmployerRequest = z.infer<typeof CreatePlacementEmployerRequestSchema>;

export const UpdatePlacementEmployerRequestSchema = PlacementEmployerFieldsSchema.partial();
export type UpdatePlacementEmployerRequest = z.infer<typeof UpdatePlacementEmployerRequestSchema>;

export const ListPlacementEmployersQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
});
export type ListPlacementEmployersQuery = z.infer<typeof ListPlacementEmployersQuerySchema>;

export const PlacementEmployerSummarySchema = PlacementEmployerFieldsSchema.extend({
  employerId: UuidSchema,
  institutionId: UuidSchema,
  openingCount: z.number().int().nonnegative(),
  activeOpeningCount: z.number().int().nonnegative(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  companyLogoUrl: z.string().url().max(2048).optional(),
});
export type PlacementEmployerSummary = z.infer<typeof PlacementEmployerSummarySchema>;

export const PlacementEmployerDriveHistoryItemSchema = z.object({
  openingId: UuidSchema,
  roleTitle: z.string(),
  driveDate: IsoDateSchema.nullable().optional(),
  status: JobOpeningStatusSchema,
  applicationCount: z.number().int().nonnegative(),
  shortlistedCount: z.number().int().nonnegative(),
  selectedCount: z.number().int().nonnegative(),
  createdAt: IsoDateTimeSchema,
});
export type PlacementEmployerDriveHistoryItem = z.infer<
  typeof PlacementEmployerDriveHistoryItemSchema
>;

export const PlacementEmployerDetailSchema = PlacementEmployerSummarySchema.extend({
  driveHistory: z.array(PlacementEmployerDriveHistoryItemSchema),
  currentOpenings: z.array(
    z.object({
      openingId: UuidSchema,
      roleTitle: z.string(),
      status: JobOpeningStatusSchema,
      location: z.string(),
      createdAt: IsoDateTimeSchema,
    }),
  ),
});
export type PlacementEmployerDetail = z.infer<typeof PlacementEmployerDetailSchema>;

export const ListPlacementEmployersResponseSchema = z.object({
  employers: z.array(PlacementEmployerSummarySchema),
});
export type ListPlacementEmployersResponse = z.infer<typeof ListPlacementEmployersResponseSchema>;

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
  /** Diagnostic submitted; grading or follow-on verification not finalized yet. */
  verificationInProgress: z.boolean().optional(),
  /** Why this skill is on the assessment list (manual pick vs project tag vs GitHub). */
  declareOrigin: z.enum(['MANUAL', 'PROJECT_TAGGED', 'GITHUB_DERIVED']).optional(),
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
