import { z } from 'zod';
import {
  AssessableTypeSchema,
  AttemptStatusSchema,
  IntegrityFlagSchema,
  ItemTypeSchema,
  LevelFormatSchema,
  LevelNumberSchema,
  SharedVerificationStatusSchema,
  SkillProficiencySchema,
  TierSchema,
  TrackCodeSchema,
} from '../domain/enums.js';
import { DeliverableItemDtoSchema } from './catalog.dto.js';
import { SkillClaimDtoSchema } from './placement.dto.js';
import {
  GradeSdeSkillFormResponseSchema,
  SdeSkillFormPublicItemSchema,
  SdeSkillFormResponseItemSchema,
} from './evaluation.dto.js';
import { IsoDateTimeSchema, ScoreSchema, UuidSchema } from './common.js';
import {
  AssessmentResultSchema,
  AssessmentStageSchema,
  RecommendedNextStepSchema,
  SkillEvidenceContextSchema,
} from '../domain/evidence/index.js';
import {
  ProctoringEventClassSchema,
  ProctoringSeveritySchema,
  ProctoringViolationKindSchema,
} from './proctoring.dto.js';

/**
 * Assessment lifecycle contracts.
 * Implementation owner: Vishal Bharath R (`apps/api-core/src/modules/assessment`).
 * Primary consumer: Satheswaran V (`apps/web-student` player).
 *
 * THE SEAM RULE (TEAM.md §4.4): the server is the clock and the authority.
 * The client renders a countdown but never decides that an attempt is still
 * open — `expiresAt` from the server is the only truth.
 */

/* --------------------------------- start ---------------------------------- */

export const StartAttemptRequestSchema = z.object({
  trackCode: TrackCodeSchema,
  levelNumber: LevelNumberSchema,
});
export type StartAttemptRequest = z.infer<typeof StartAttemptRequestSchema>;

/**
 * Live attempt session. Mirrors the Redis hash `session:assessment:{attemptId}`
 * (TTL 2h) so a refresh or a reconnect can resume exactly where the candidate was.
 */
export const AttemptSessionDtoSchema = z.object({
  attemptId: UuidSchema,
  studentId: UuidSchema,
  trackCode: TrackCodeSchema,
  levelNumber: LevelNumberSchema,
  levelFormat: LevelFormatSchema,
  status: AttemptStatusSchema,
  formId: z.string(),
  startedAt: IsoDateTimeSchema,
  /** Server-computed hard deadline. Auto-submit fires at this instant. */
  expiresAt: IsoDateTimeSchema,
  /** Authoritative remaining time. Reconcile the local countdown against this. */
  serverRemainingSeconds: z.number().int().nonnegative(),
  totalItems: z.number().int(),
  answeredItems: z.number().int(),
  currentItemIndex: z.number().int().nonnegative(),
  integrityFlag: IntegrityFlagSchema,
  /** True once the candidate may no longer change answers. */
  locked: z.boolean(),
});
export type AttemptSessionDto = z.infer<typeof AttemptSessionDtoSchema>;

/* ------------------------------- next item -------------------------------- */

export const NextItemDtoSchema = z.object({
  attemptId: UuidSchema,
  /** Null when the form is exhausted — the player should move to submit. */
  item: DeliverableItemDtoSchema.nullable(),
  index: z.number().int().nonnegative(),
  totalItems: z.number().int(),
  /** Draft the candidate previously saved for this item, if any. */
  savedDraft: z.unknown().optional(),
  serverRemainingSeconds: z.number().int().nonnegative(),
});
export type NextItemDto = z.infer<typeof NextItemDtoSchema>;

/* ------------------------------ answer drafts ----------------------------- */

/**
 * One answer payload, discriminated by item type. Adding a new item type means
 * adding a member here — that is intentional, so the player and the grader can
 * never silently disagree about a shape.
 */
export const AnswerPayloadSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('MCQ'), selectedOptionIds: z.array(z.string()).max(10) }),
  z.object({ kind: z.literal('NUMERIC'), value: z.number() }),
  z.object({ kind: z.literal('TEXT'), text: z.string().max(20_000) }),
  z.object({
    kind: z.literal('CODE'),
    language: z.enum(['node', 'python', 'postgres']),
    source: z.string().max(100_000),
  }),
  z.object({
    kind: z.literal('AUDIO'),
    /** R2 object key from the presigned direct upload. Audio never proxies through the API. */
    objectKey: z.string().max(512),
    durationSeconds: z.number().int().positive().max(1800),
  }),
  z.object({
    kind: z.literal('ARTIFACT'),
    objectKeys: z.array(z.string().max(512)).max(20),
    repositoryUrl: z.url().optional(),
    presentationUrl: z.url().optional(),
    notes: z.string().max(5_000).optional(),
  }),
]);
export type AnswerPayload = z.infer<typeof AnswerPayloadSchema>;

export const SaveDraftRequestSchema = z.object({
  attemptId: UuidSchema,
  itemId: UuidSchema,
  answer: AnswerPayloadSchema,
  /**
   * Monotonic client sequence number. The server keeps the highest sequence and
   * discards out-of-order retries, so a flaky connection cannot overwrite a
   * newer answer with an older one.
   */
  clientSequence: z.number().int().nonnegative(),
});
export type SaveDraftRequest = z.infer<typeof SaveDraftRequestSchema>;

export const SaveDraftResponseSchema = z.object({
  accepted: z.boolean(),
  /** False when a newer draft already exists for this item. */
  superseded: z.boolean(),
  answeredItems: z.number().int(),
  serverRemainingSeconds: z.number().int().nonnegative(),
});
export type SaveDraftResponse = z.infer<typeof SaveDraftResponseSchema>;

/* ------------------------ sandbox execution (L2) -------------------------- */

export const RunSandboxRequestSchema = z.object({
  attemptId: UuidSchema,
  itemId: UuidSchema,
  language: z.enum(['node', 'python', 'postgres']),
  source: z.string().max(100_000),
});
export type RunSandboxRequest = z.infer<typeof RunSandboxRequestSchema>;

/** Resource caps are fixed by ARCHITECTURE.md §13.2 — 256 MB, 1 CPU, 5 s. */
export const SANDBOX_LIMITS = {
  memoryMb: 256,
  cpuCores: 1,
  timeoutSeconds: 5,
  networkEnabled: false,
  maxOutputBytes: 64 * 1024,
} as const;

export const SandboxResultDtoSchema = z.object({
  jobId: z.string(),
  status: z.enum(['QUEUED', 'RUNNING', 'PASSED', 'FAILED', 'TIMEOUT', 'ERROR']),
  stdout: z.string().max(65_536),
  stderr: z.string().max(65_536),
  exitCode: z.number().int().nullable(),
  durationMs: z.number().int().nonnegative(),
  /** Only non-hidden test cases are reported back to the candidate. */
  testResults: z.array(
    z.object({
      id: z.string(),
      passed: z.boolean(),
      expected: z.string().optional(),
      actual: z.string().optional(),
    }),
  ),
  passedCount: z.number().int(),
  totalCount: z.number().int(),
});
export type SandboxResultDto = z.infer<typeof SandboxResultDtoSchema>;

/* ------------------------------- completion -------------------------------- */

export const CompleteAttemptRequestSchema = z.object({
  attemptId: UuidSchema,
  /** Set by the server-side auto-submit path, not by the client. */
  autoSubmitted: z.boolean().default(false),
  /**
   * SE-T01/CN-T04 skill-claim wiring: when set, this attempt settles the
   * named claim (must belong to the caller). The written-assessment score
   * plus `interviewPassed`/`technicalFailure` drive `applySkillClaimTransition`.
   * Omit for a plain (non-skill-linked) attempt completion.
   */
  claimId: UuidSchema.optional(),
  /**
   * Result of a prior, separate `POST /evaluation/skill-interview/grade` call.
   * Required to pass INTERMEDIATE/ADVANCED claims (PRD v1 §7.3: "both
   * components >= 0.60"); ignored for BEGINNER, which is assessment-only.
   */
  interviewPassed: z.boolean().optional(),
  /** A proctoring/infra fault, not a genuine attempt — never consumes a strike. */
  technicalFailure: z.boolean().default(false),
  /** Candidate-facing one-line reason, mirrors GradeSkillInterviewResponse.explanation. */
  explanation: z.string().max(1_000).optional(),
});
export type CompleteAttemptRequest = z.infer<typeof CompleteAttemptRequestSchema>;

export const CompleteAttemptResponseSchema = z.object({
  attemptId: UuidSchema,
  status: AttemptStatusSchema,
  /** Present when scoring is asynchronous — poll the results endpoint. */
  evaluationJobId: z.string().nullable(),
  estimatedResultSeconds: z.number().int().nullable(),
  /** Mark-weighted written-assessment score (INF-05 Scoring Schema Core Formula). */
  marksEarned: ScoreSchema.optional(),
  marksTotal: z.number().positive().optional(),
  scorePercent: ScoreSchema.optional(),
  /** True while one or more items could not be auto/AI-graded (e.g. CODE_TASK — no sandbox yet). */
  incomplete: z.boolean().optional(),
  /** Present only when `claimId` was supplied — the claim's post-transition state. */
  claim: SkillClaimDtoSchema.nullable().optional(),
});
export type CompleteAttemptResponse = z.infer<typeof CompleteAttemptResponseSchema>;

/* --------------------------- integrity telemetry -------------------------- */

/**
 * Client-reported integrity signals. A single tab-blur is not cheating and must
 * not void an attempt. HMAC fields are required on `/proctoring/violations`.
 */
export const IntegrityEventSchema = z.object({
  attemptId: UuidSchema,
  kind: ProctoringViolationKindSchema,
  occurredAt: IsoDateTimeSchema,
  severity: ProctoringSeveritySchema.optional(),
  eventClass: ProctoringEventClassSchema.optional(),
  nonce: z.string().min(16).max(128).optional(),
  signature: z.string().min(32).max(128).optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});
export type IntegrityEvent = z.infer<typeof IntegrityEventSchema>;

/* -------------------------------- results --------------------------------- */

export const ItemResultDtoSchema = z.object({
  itemId: UuidSchema,
  competencyId: UuidSchema,
  competencyName: z.string(),
  itemType: ItemTypeSchema,
  score: ScoreSchema,
  maxScore: ScoreSchema,
  /** Candidate-facing feedback. Never exposes the answer key verbatim. */
  feedback: z.string().nullable(),
});
export type ItemResultDto = z.infer<typeof ItemResultDtoSchema>;

export const LevelResultDtoSchema = z.object({
  resultId: UuidSchema,
  attemptId: UuidSchema,
  trackCode: TrackCodeSchema,
  levelNumber: LevelNumberSchema,
  rawScore: ScoreSchema,
  tierAwarded: TierSchema,
  /** Human-readable confidence band, e.g. "Gold cut score 75 ± 4". */
  confidenceBand: z.string(),
  /** True when the score falls inside the cut-score uncertainty band. */
  borderline: z.boolean(),
  borderlineNote: z.string().nullable(),
  /** Per-competency breakdown that powers the gap report. */
  competencyBreakdown: z.array(
    z.object({
      competencyId: UuidSchema,
      competencyName: z.string(),
      score: ScoreSchema,
      weight: z.number(),
      isGap: z.boolean(),
    }),
  ),
  itemResults: z.array(ItemResultDtoSchema),
  evaluatedAt: IsoDateTimeSchema,
  /** Set when automated scoring was paused (kappa < 0.65) and a human graded it. */
  humanReviewed: z.boolean(),
});
export type LevelResultDto = z.infer<typeof LevelResultDtoSchema>;

/* ---------------- SDE v4 skill verify session (additive; not L1) ---------- */

/**
 * Timed skill-form session. Redis key `session:skill-verify:{sessionId}`.
 * Does not touch `startAttempt` / `completeAttempt` / item rotation.
 * HTTP owner: assessment (VB). Form generate/grade: evaluation (RM).
 */
export const StartSkillVerifyRequestSchema = z.object({
  prepareOnly: z.boolean().optional(),
  sessionId: UuidSchema.optional(),
});
export type StartSkillVerifyRequest = z.infer<typeof StartSkillVerifyRequestSchema>;

export const SkillVerifyPrepareDtoSchema = z.object({
  sessionId: UuidSchema,
  claimId: UuidSchema,
  expiresAt: IsoDateTimeSchema,
  evidenceContext: SkillEvidenceContextSchema.optional(),
});
export type SkillVerifyPrepareDto = z.infer<typeof SkillVerifyPrepareDtoSchema>;

export const SkillVerifySessionDtoSchema = z.object({
  sessionId: UuidSchema,
  claimId: UuidSchema,
  skillCode: z.string().min(2).max(64),
  proficiency: SkillProficiencySchema,
  timeMinutes: z.number().int().positive(),
  passMarkPercent: z.number().int().min(1).max(100).optional(),
  expiresAt: IsoDateTimeSchema,
  serverRemainingSeconds: z.number().int().nonnegative(),
  items: z.array(SdeSkillFormPublicItemSchema).min(1),
  answers: z.array(SdeSkillFormResponseItemSchema),
  stage: AssessmentStageSchema.optional(),
  intelligenceEnabled: z.boolean().optional(),
  stageLabel: z.string().max(120).optional(),
  pendingCompetencies: z.array(z.string().max(500)).max(10).optional(),
  pendingVerification: z.boolean().optional(),
  verificationStep: RecommendedNextStepSchema.optional(),
  evidenceContext: SkillEvidenceContextSchema.optional(),
});
export type SkillVerifySessionDto = z.infer<typeof SkillVerifySessionDtoSchema>;

export const SaveSkillVerifyRequestSchema = z.object({
  responses: z.array(SdeSkillFormResponseItemSchema),
});
export type SaveSkillVerifyRequest = z.infer<typeof SaveSkillVerifyRequestSchema>;

export const CompleteSkillVerifyRequestSchema = z.object({
  responses: z.array(SdeSkillFormResponseItemSchema).optional(),
  technicalFailure: z.boolean().optional().default(false),
  /** Proctor warning-cap lock — recorded as a genuine fail, not a technical abort. */
  integrityTerminated: z.boolean().optional().default(false),
  explanation: z.string().max(2_000).optional(),
});
export type CompleteSkillVerifyRequest = z.infer<typeof CompleteSkillVerifyRequestSchema>;

export const CompleteSkillVerifyResponseSchema = z.object({
  claim: SkillClaimDtoSchema,
  technicalFailure: z.boolean(),
  grade: GradeSdeSkillFormResponseSchema.nullable(),
  assessmentResult: AssessmentResultSchema.nullable().optional(),
  sessionContinues: z.boolean().optional(),
  session: SkillVerifySessionDtoSchema.nullable().optional(),
  pendingVerification: z.boolean().optional(),
});

export const StartSkillVerifyInterviewRequestSchema = z.object({
  /** When true, regenerate questions (capped server-side). Default reuses cached questions. */
  regenerate: z.boolean().optional().default(false),
});
export type StartSkillVerifyInterviewRequest = z.infer<
  typeof StartSkillVerifyInterviewRequestSchema
>;

export const CompleteSkillVerifyInterviewRequestSchema = z.object({
  items: z
    .array(
      z.object({
        index: z.number().int().min(1).max(3),
        /** Ignored for grading — server binds answers to interview/start questions. */
        question: z.string().min(10).max(500).optional(),
        answer: z.string().min(1).max(8_000),
      }),
    )
    .length(3),
});
export type CompleteSkillVerifyInterviewRequest = z.infer<
  typeof CompleteSkillVerifyInterviewRequestSchema
>;

export const SkillVerifyInterviewDtoSchema = z.object({
  sessionId: UuidSchema,
  skillCode: z.string().min(2).max(64),
  proficiency: z.enum(['ADVANCED', 'PROFESSIONAL']),
  questions: z
    .array(
      z.object({
        index: z.number().int().min(1).max(3),
        text: z.string().min(10).max(500),
      }),
    )
    .length(3),
});
export type SkillVerifyInterviewDto = z.infer<typeof SkillVerifyInterviewDtoSchema>;
export type CompleteSkillVerifyResponse = z.infer<typeof CompleteSkillVerifyResponseSchema>;

/* ---------------- polymorphic assessment session (SE-T10) ---------------- */

export const PolymorphicAssessmentSessionDtoSchema = z.object({
  sessionId: UuidSchema,
  assessableType: AssessableTypeSchema,
  assessableId: UuidSchema,
  status: SharedVerificationStatusSchema,
  retryAvailableAt: IsoDateTimeSchema.nullable().optional(),
  lockedUntil: IsoDateTimeSchema.nullable().optional(),
  expiresAt: IsoDateTimeSchema.nullable().optional(),
  serverRemainingSeconds: z.number().int().nonnegative().optional(),
});
export type PolymorphicAssessmentSessionDto = z.infer<typeof PolymorphicAssessmentSessionDtoSchema>;
