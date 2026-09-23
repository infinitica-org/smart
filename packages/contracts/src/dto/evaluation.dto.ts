import { z } from 'zod';
import {
  AiModelRoleSchema,
  AiPrioritySchema,
  AiProviderSchema,
  EvaluatorSchema,
  LevelNumberSchema,
  TierSchema,
} from '../domain/enums.js';
import { IsoDateTimeSchema, ScoreSchema, UuidSchema } from './common.js';

/**
 * AI gateway & evaluation contracts.
 * Implementation owner: Ramansh (`ai-gateway`, `evaluation`).
 *
 * THE GATEWAY RULE: no module other than `ai-gateway` imports an LLM SDK. All
 * AI traffic crosses this contract so that token buckets, priority lanes,
 * failover, auditing and the cost ceiling apply uniformly.
 *
 * THE AUTHORITY RULE: `evaluation` produces a RAW SCORE. `calibration` owns the
 * published cut scores, and `scoring-engine.assignTier()` converts score → tier.
 * No threshold is ever hardcoded here.
 */

/* ------------------------------- BARS rubric ------------------------------- */

/**
 * Behaviourally Anchored Rating Scale anchors, reconciled by the calibration
 * panel via MODE CONSENSUS — the most commonly agreed anchor points, not an
 * average. Averaging destroys the behavioural specificity that makes an anchor
 * gradeable.
 */
export const BarsAnchorSetSchema = z.object({
  competencyId: UuidSchema,
  competencyName: z.string(),
  levelNumber: LevelNumberSchema,
  anchors: z.object({
    GOLD: z.string().min(20),
    SILVER: z.string().min(20),
    BRONZE: z.string().min(20),
  }),
  /** Bumped whenever the panel revises the anchors. Grades cite the version. */
  version: z.number().int().positive(),
});
export type BarsAnchorSet = z.infer<typeof BarsAnchorSetSchema>;

/**
 * Structured LLM grading output. Schema-validated on every call — a tier is
 * never regex-extracted from prose. Invalid output is retried against the
 * schema and then escalated, never guessed.
 */
export const BarsGradeSchema = z.object({
  /** The LLM's anchor match. Advisory: the final tier comes from cut scores. */
  matchedAnchor: TierSchema,
  barsScore: ScoreSchema,
  /** Model's self-reported confidence in its own anchor match. */
  confidence: z.number().min(0).max(1),
  justification: z.string().min(20).max(4_000),
  /** Specific behaviours the model observed, quoted from the response. */
  evidence: z.array(z.string()).max(10),
  /** Competency gaps for the candidate's gap report. */
  observedGaps: z.array(z.string()).max(10),
});
export type BarsGrade = z.infer<typeof BarsGradeSchema>;

/* ------------------------------- AI gateway -------------------------------- */

export const AiCompletionRequestSchema = z.object({
  /** Prompt template id + version, e.g. `bars-l3@2`. Prompts are immutable. */
  promptRef: z.string().regex(/^[a-z0-9-]+@\d+$/, 'promptRef must look like `bars-l3@2`'),
  modelRole: AiModelRoleSchema,
  priority: AiPrioritySchema,
  variables: z.record(z.string(), z.unknown()),
  /** RAG context retrieved from pgvector, injected by the caller. */
  contextChunks: z.array(z.string()).max(20).optional(),
  /** Correlates the call with the response/attempt it graded. */
  correlation: z.object({
    responseId: UuidSchema.optional(),
    attemptId: UuidSchema.optional(),
    jdId: UuidSchema.optional(),
  }),
  maxOutputTokens: z.number().int().positive().max(16_000).default(2_048),
  temperature: z.number().min(0).max(1).default(0),
});
export type AiCompletionRequest = z.infer<typeof AiCompletionRequestSchema>;

export const AiCompletionResponseSchema = z.object({
  /** Parsed, schema-validated JSON payload. */
  output: z.unknown(),
  provider: AiProviderSchema,
  model: z.string(),
  /** True when the primary provider failed and the fallback answered. */
  usedFallback: z.boolean(),
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  latencyMs: z.number().int().nonnegative(),
  estimatedCostUsd: z.number().nonnegative(),
  /** `ai_evaluation_audits.id` after insert. Null when the row was not written. */
  auditId: UuidSchema.nullable(),
});
export type AiCompletionResponse = z.infer<typeof AiCompletionResponseSchema>;

export const AiHealthDtoSchema = z.object({
  providers: z.array(
    z.object({
      provider: AiProviderSchema,
      reachable: z.boolean(),
      circuitState: z.enum(['CLOSED', 'OPEN', 'HALF_OPEN']),
      latencyMs: z.number().nullable(),
    }),
  ),
  tokenBucket: z.object({
    requestsRemaining: z.number().int(),
    tokensRemaining: z.number().int(),
    windowResetsAt: IsoDateTimeSchema,
  }),
  queueDepth: z.record(z.string(), z.number().int()),
  /** True when automated scoring is paused because Cohen's kappa < 0.65. */
  automatedScoringPaused: z.boolean(),
  pauseReason: z.string().nullable(),
  monthlySpendUsd: z.number(),
  monthlyCeilingUsd: z.number(),
});
export type AiHealthDto = z.infer<typeof AiHealthDtoSchema>;

/**
 * Per-provider slice of an AI usage window, aggregated from
 * `ai_evaluation_audits` (`groupBy provider` — see `AiGatewayUsageService`).
 */
export const AiUsageProviderBreakdownSchema = z.object({
  provider: AiProviderSchema,
  requestCount: z.number().int().nonnegative(),
  totalCostUsd: z.number().nonnegative(),
  avgLatencyMs: z.number().nonnegative(),
  fallbackRate: z.number().min(0).max(1),
});
export type AiUsageProviderBreakdown = z.infer<typeof AiUsageProviderBreakdownSchema>;

/**
 * Cost/volume/latency/fallback aggregation for one time window, sourced from
 * every completion recorded to `ai_evaluation_audits` (see
 * `AiGatewayAuditService.record()` and the `aiCompletionRecorded` consumer).
 */
export const AiUsageWindowSchema = z.object({
  requestCount: z.number().int().nonnegative(),
  totalCostUsd: z.number().nonnegative(),
  avgLatencyMs: z.number().nonnegative(),
  p95LatencyMs: z.number().nonnegative(),
  /** Share of requests answered by a fallback provider, 0-1. */
  fallbackRate: z.number().min(0).max(1),
  byProvider: z.array(AiUsageProviderBreakdownSchema),
});
export type AiUsageWindow = z.infer<typeof AiUsageWindowSchema>;

export const AiUsageSummaryDtoSchema = z.object({
  last24h: AiUsageWindowSchema,
  last30d: AiUsageWindowSchema,
  /**
   * `ai_evaluation_audits` only records completions that succeeded (see
   * `AiGatewayService.complete()` — a failed provider attempt is logged and
   * the next provider in the chain is tried, but no row is ever written for
   * the failure). There is therefore no error/failure signal to aggregate an
   * error rate from yet; this stays `false` until that instrumentation
   * exists. Kept as an explicit field rather than omitted so a consumer can't
   * silently assume a zero error rate.
   */
  errorRateAvailable: z.literal(false),
});
export type AiUsageSummaryDto = z.infer<typeof AiUsageSummaryDtoSchema>;

/* ----------------------------- L4 defense sim ------------------------------ */

export const DefenseTurnSchema = z.object({
  turnIndex: z.number().int().nonnegative(),
  role: z.enum(['EXAMINER', 'CANDIDATE']),
  text: z.string().max(8_000),
  at: IsoDateTimeSchema,
});
export type DefenseTurn = z.infer<typeof DefenseTurnSchema>;

export const DefenseSessionDtoSchema = z.object({
  sessionId: UuidSchema,
  attemptId: UuidSchema,
  status: z.enum(['ACTIVE', 'COMPLETED', 'EXPIRED']),
  turns: z.array(DefenseTurnSchema),
  turnsRemaining: z.number().int().nonnegative(),
  /** Per-turn response budget in seconds. */
  turnTimeoutSeconds: z.number().int().positive(),
  expiresAt: IsoDateTimeSchema,
});
export type DefenseSessionDto = z.infer<typeof DefenseSessionDtoSchema>;

export const DefenseReplyRequestSchema = z.object({
  sessionId: UuidSchema,
  text: z.string().min(1).max(8_000),
});
export type DefenseReplyRequest = z.infer<typeof DefenseReplyRequestSchema>;

/** L4 rubric dimension weights vary per track (see role blueprints). */
export const DefenseRubricWeightsSchema = z.object({
  depthOfUnderstanding: z.number().min(0).max(1),
  ownershipAndOriginality: z.number().min(0).max(1),
  defenseQuality: z.number().min(0).max(1),
});
export type DefenseRubricWeights = z.infer<typeof DefenseRubricWeightsSchema>;

/* -------------------- skill / confidence interview (SE-T02) --------------- */

/**
 * Short skill interview (VEGA): not L4 defense, not MCQ.
 * Generate 3 questions in one call; grade once. Interview is required at
 * Advanced / Professional (INF-05), not Beginner.
 *
 * Implementation: Ramansh (`evaluation` + prompts). Consumers: Satheswaran
 * (visible why) and Vishal Bharath R (attempt / claim wiring later).
 */
export const SKILL_INTERVIEW_QUESTION_COUNT = 3;
export const SKILL_INTERVIEW_EXPLANATION_MAX_CHARS = 160;
export const SKILL_INTERVIEW_ANSWER_MAX_CHARS = 500;
export const SKILL_INTERVIEW_PROFICIENCIES = ['ADVANCED', 'PROFESSIONAL'] as const;
export const SkillInterviewProficiencySchema = z.enum(SKILL_INTERVIEW_PROFICIENCIES);
export type SkillInterviewProficiency = z.infer<typeof SkillInterviewProficiencySchema>;

export const SkillInterviewQuestionSchema = z.object({
  index: z.number().int().min(1).max(SKILL_INTERVIEW_QUESTION_COUNT),
  text: z.string().min(10).max(500),
});
export type SkillInterviewQuestion = z.infer<typeof SkillInterviewQuestionSchema>;

export const GenerateSkillInterviewRequestSchema = z.object({
  skillCode: z.string().min(2).max(64),
  proficiency: SkillInterviewProficiencySchema,
});
export type GenerateSkillInterviewRequest = z.infer<typeof GenerateSkillInterviewRequestSchema>;

export const GenerateSkillInterviewResponseSchema = z.object({
  skillCode: z.string().min(2).max(64),
  proficiency: SkillInterviewProficiencySchema,
  questions: z.array(SkillInterviewQuestionSchema).length(SKILL_INTERVIEW_QUESTION_COUNT),
  promptRef: z
    .string()
    .regex(/^[a-z0-9-]+@\d+$/, 'promptRef must look like `skill-interview-examiner@1`'),
});
export type GenerateSkillInterviewResponse = z.infer<typeof GenerateSkillInterviewResponseSchema>;

export const SkillInterviewAnswerSchema = z.object({
  index: z.number().int().min(1).max(SKILL_INTERVIEW_QUESTION_COUNT),
  question: z.string().min(10).max(500),
  answer: z.string().min(1).max(SKILL_INTERVIEW_ANSWER_MAX_CHARS),
});
export type SkillInterviewAnswer = z.infer<typeof SkillInterviewAnswerSchema>;

export const GradeSkillInterviewRequestSchema = z.object({
  skillCode: z.string().min(2).max(64),
  proficiency: SkillInterviewProficiencySchema,
  items: z.array(SkillInterviewAnswerSchema).length(SKILL_INTERVIEW_QUESTION_COUNT),
});
export type GradeSkillInterviewRequest = z.infer<typeof GradeSkillInterviewRequestSchema>;

/** Ticket AC: pass/fail plus a visible one-line why — never a score alone. */
export const GradeSkillInterviewResponseSchema = z.object({
  skillCode: z.string().min(2).max(64),
  proficiency: SkillInterviewProficiencySchema,
  passed: z.boolean(),
  explanation: z.string().min(10).max(SKILL_INTERVIEW_EXPLANATION_MAX_CHARS),
  promptRef: z
    .string()
    .regex(/^[a-z0-9-]+@\d+$/, 'promptRef must look like `skill-interview-grader@1`'),
  auditId: UuidSchema.nullable(),
});
export type GradeSkillInterviewResponse = z.infer<typeof GradeSkillInterviewResponseSchema>;

/* -------------------- SDE v4 skill form (assessment-only) ----------------- */

/**
 * LLM-generated form from SDE Skill Verification Framework v4.
 * Does not change INF-05 L1 banks or skill-interview routes.
 * Implementation: Ramansh (`evaluation` + prompts). Session/settle: assessment.
 */
export const SDE_V4_FORM_PROFICIENCIES = [
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
  'PROFESSIONAL',
] as const;
export const SdeV4FormProficiencySchema = z.enum(SDE_V4_FORM_PROFICIENCIES);
export type SdeV4FormProficiency = z.infer<typeof SdeV4FormProficiencySchema>;

export const SdeSkillFormFormatSchema = z.enum([
  'MCQ',
  'TRACE',
  'CODING',
  'SCENARIO',
  'DEBUG',
  'DESIGN_REASONING',
]);
export type SdeSkillFormFormat = z.infer<typeof SdeSkillFormFormatSchema>;

export const GenerateSdeSkillFormRequestSchema = z.object({
  skillCode: z.string().min(2).max(64),
  proficiency: SdeV4FormProficiencySchema,
  attemptId: z.string().min(1).max(80).optional(),
  priorStems: z.array(z.string().max(200)).max(40).optional(),
  skillFocus: z.string().min(1).max(64).optional(),
  stage: z.enum(['DIAGNOSTIC', 'FULL']).optional().default('FULL'),
  catalogSkillCode: z.string().min(2).max(64).optional(),
});
export type GenerateSdeSkillFormRequest = z.infer<typeof GenerateSdeSkillFormRequestSchema>;

export const SdeSkillFormExampleSchema = z.object({
  input: z.string().min(1).max(800),
  output: z.string().min(1).max(800),
  explanation: z.string().max(800).optional(),
});
export type SdeSkillFormExample = z.infer<typeof SdeSkillFormExampleSchema>;

export const SdeSkillFormPublicItemSchema = z.object({
  index: z.number().int().min(1),
  format: SdeSkillFormFormatSchema,
  prompt: z.string().min(1),
  options: z
    .object({
      A: z.string(),
      B: z.string(),
      C: z.string(),
      D: z.string(),
    })
    .nullable(),
  title: z.string().min(1).max(120).optional(),
  constraints: z.string().min(1).max(2_000).optional(),
  /** Visible examples only. Hidden judge cases stay in the scoring token. */
  examples: z.array(SdeSkillFormExampleSchema).max(4).optional(),
  competencyIds: z.array(z.uuid()).max(5).optional(),
});
export type SdeSkillFormPublicItem = z.infer<typeof SdeSkillFormPublicItemSchema>;

export const SdeSkillFormResponseItemSchema = z.object({
  index: z.number().int().min(1),
  selectedKey: z.string().max(4).optional(),
  text: z.string().max(8_000).optional(),
});
export type SdeSkillFormResponseItem = z.infer<typeof SdeSkillFormResponseItemSchema>;

export const GenerateSdeSkillFormResponseSchema = z.object({
  skillCode: z.string().min(2).max(64),
  proficiency: SdeV4FormProficiencySchema,
  attemptId: z.string().min(1).max(80),
  timeMinutes: z.number().int().positive(),
  passMarkPercent: z.number().int().min(1).max(100).optional(),
  stage: z.enum(['DIAGNOSTIC', 'FULL']).optional(),
  promptRefs: z.object({
    closed: z.string().regex(/^[a-z0-9-]+@\d+$/),
    open: z.string().regex(/^[a-z0-9-]+@\d+$/),
  }),
  items: z.array(SdeSkillFormPublicItemSchema).min(1),
  scoringToken: z.string().min(20),
});
export type GenerateSdeSkillFormResponse = z.infer<typeof GenerateSdeSkillFormResponseSchema>;

export const GradeSdeSkillFormRequestSchema = z.object({
  skillCode: z.string().min(2).max(64),
  proficiency: SdeV4FormProficiencySchema,
  scoringToken: z.string().min(20),
  responses: z.array(SdeSkillFormResponseItemSchema),
});
export type GradeSdeSkillFormRequest = z.infer<typeof GradeSdeSkillFormRequestSchema>;

export const SdeSkillFormMissedTestSchema = z.object({
  input: z.string().max(400),
  expected: z.string().max(400),
  reason: z.string().max(400),
});
export type SdeSkillFormMissedTest = z.infer<typeof SdeSkillFormMissedTestSchema>;

export const SdeSkillFormItemResultSchema = z.object({
  index: z.number().int().min(1),
  format: SdeSkillFormFormatSchema,
  marksEarned: z.number(),
  marksMax: z.number(),
  correct: z.boolean().optional(),
  selectedKey: z.string().max(4).optional(),
  correctKey: z.string().max(4).optional(),
  testsPassed: z.number().int().min(0).max(20).optional(),
  testsTotal: z.number().int().min(0).max(20).optional(),
  missedTests: z.array(SdeSkillFormMissedTestSchema).max(8).optional(),
  feedback: z.string().max(2_000).optional(),
  competencyIds: z.array(z.uuid()).max(5).optional(),
});
export type SdeSkillFormItemResult = z.infer<typeof SdeSkillFormItemResultSchema>;

export const GradeSdeSkillFormResponseSchema = z.object({
  skillCode: z.string().min(2).max(64),
  proficiency: SdeV4FormProficiencySchema,
  marksEarned: z.number(),
  marksTotal: z.number(),
  scorePercent: z.number(),
  passed: z.boolean(),
  promptRef: z.string().regex(/^[a-z0-9-]+@\d+$/),
  mcqCorrect: z.number().int().nonnegative(),
  mcqTotal: z.number().int().nonnegative(),
  traceCorrect: z.number().int().nonnegative(),
  traceTotal: z.number().int().nonnegative(),
  itemResults: z.array(SdeSkillFormItemResultSchema),
  competencySupportedProficiency: SdeV4FormProficiencySchema.optional(),
  assessmentPassed: z.boolean().optional(),
});
export type GradeSdeSkillFormResponse = z.infer<typeof GradeSdeSkillFormResponseSchema>;

export const RunSdeSkillFormCodeRequestSchema = z.object({
  prompt: z.string().min(1).max(4_000),
  constraints: z.string().max(2_000).optional(),
  source: z.string().min(1).max(8_000),
  examples: z.array(SdeSkillFormExampleSchema).max(4).default([]),
});
export type RunSdeSkillFormCodeRequest = z.infer<typeof RunSdeSkillFormCodeRequestSchema>;

export const SdeSkillFormRunTestSchema = z.object({
  input: z.string().max(800),
  expected: z.string().max(800),
  actual: z.string().max(800),
  passed: z.boolean(),
});
export type SdeSkillFormRunTest = z.infer<typeof SdeSkillFormRunTestSchema>;

export const RunSdeSkillFormCodeResponseSchema = z.object({
  compileError: z.string().max(1_200).nullable(),
  testsPassed: z.number().int().min(0).max(8),
  testsTotal: z.number().int().min(0).max(8),
  tests: z.array(SdeSkillFormRunTestSchema).max(8),
  promptRef: z.string().regex(/^[a-z0-9-]+@\d+$/),
});
export type RunSdeSkillFormCodeResponse = z.infer<typeof RunSdeSkillFormCodeResponseSchema>;

/* ------------------------ inter-rater reliability ------------------------- */

/**
 * Cohen's kappa monitor. Below 0.65 automated scoring auto-pauses and grading
 * routes to human raters — a circuit breaker, not a dashboard metric.
 */
export const AgreementReportDtoSchema = z.object({
  trackCode: z.string(),
  levelNumber: LevelNumberSchema,
  cohensKappa: z.number().min(-1).max(1),
  sampleSize: z.number().int().nonnegative(),
  /** Interpretation band, e.g. "substantial agreement". */
  interpretation: z.string(),
  meetsThreshold: z.boolean(),
  automatedScoringEnabled: z.boolean(),
  computedAt: IsoDateTimeSchema,
});
export type AgreementReportDto = z.infer<typeof AgreementReportDtoSchema>;

/* -------------------------------- scoring --------------------------------- */

export const ResponseScoreDtoSchema = z.object({
  responseId: UuidSchema,
  itemId: UuidSchema,
  competencyId: UuidSchema,
  rawScore: ScoreSchema,
  maxScore: ScoreSchema,
  evaluatedBy: EvaluatorSchema,
  barsGrade: BarsGradeSchema.nullable(),
  auditId: UuidSchema.nullable(),
  evaluatedAt: IsoDateTimeSchema,
});
export type ResponseScoreDto = z.infer<typeof ResponseScoreDtoSchema>;

/* -------------------- human subjective grading admin (T17) ---------------- */

export const GradingQueueItemDtoSchema = z.object({
  responseId: UuidSchema,
  attemptId: UuidSchema,
  itemId: UuidSchema,
  studentId: UuidSchema,
  studentName: z.string(),
  trackCode: z.string(),
  levelNumber: LevelNumberSchema,
  itemType: z.string(),
  stem: z.string(),
  answerText: z.string(),
  maxScore: ScoreSchema,
  currentScore: ScoreSchema.nullable(),
  evaluatedBy: EvaluatorSchema.nullable(),
  attemptStatus: z.string(),
  submittedAt: IsoDateTimeSchema.nullable(),
});
export type GradingQueueItemDto = z.infer<typeof GradingQueueItemDtoSchema>;

export const ListGradingQueueQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListGradingQueueQuery = z.infer<typeof ListGradingQueueQuerySchema>;

export const ListGradingQueueResponseSchema = z.object({
  items: z.array(GradingQueueItemDtoSchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().nonnegative(),
});
export type ListGradingQueueResponse = z.infer<typeof ListGradingQueueResponseSchema>;

export const ManualGradeResponseRequestSchema = z.object({
  score: ScoreSchema,
  reason: z.string().min(4).max(2_000).optional(),
});
export type ManualGradeResponseRequest = z.infer<typeof ManualGradeResponseRequestSchema>;

export const ManualGradeResponseResultSchema = z.object({
  responseId: UuidSchema,
  attemptId: UuidSchema,
  score: ScoreSchema,
  maxScore: ScoreSchema,
  evaluatedBy: EvaluatorSchema,
  evaluatedAt: IsoDateTimeSchema,
  attemptScorePercent: ScoreSchema,
  tierAwarded: TierSchema.nullable(),
});
export type ManualGradeResponseResult = z.infer<typeof ManualGradeResponseResultSchema>;
