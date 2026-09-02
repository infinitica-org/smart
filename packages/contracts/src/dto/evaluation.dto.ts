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
