import { z } from 'zod';
import { ProjectVerifyFlagSchema } from '../domain/enums.js';
import { DefenseTurnSchema, type DefenseRubricWeightsSchema } from './evaluation.dto.js';
import { IsoDateTimeSchema, ScoreSchema, UuidSchema } from './common.js';

export const PROJECT_DEFENSE_EXAMINER_PROMPT_REF = 'project-defense-examiner@1' as const;
export const PROJECT_DEFENSE_GRADER_PROMPT_REF = 'project-defense-grader@1' as const;
export const PROJECT_DEFENSE_GRADER_V2_PROMPT_REF = 'project-defense-grader@2' as const;

export const ProjectDefenseCompetencyScoreSchema = z.object({
  competencyId: z.string().min(1).max(80),
  score: z.number().min(0).max(100),
  status: z.enum(['DEMONSTRATED', 'PARTIALLY_DEMONSTRATED', 'NOT_DEMONSTRATED', 'UNCERTAIN']),
});
export type ProjectDefenseCompetencyScore = z.infer<typeof ProjectDefenseCompetencyScoreSchema>;
/** Maximum wall-clock interview duration (10 minutes). */
export const PROJECT_DEFENSE_MAX_DURATION_SECONDS = 10 * 60;
/** Minimum student answers before the examiner may end the interview early. */
export const PROJECT_DEFENSE_MIN_CANDIDATE_TURNS = 3;
/** Redis session TTL — interview duration plus buffer for grading. */
export const PROJECT_DEFENSE_SESSION_TTL_SECONDS = PROJECT_DEFENSE_MAX_DURATION_SECONDS + 5 * 60;

export const PROJECT_INTERVIEW_STATUSES = [
  'NOT_REQUIRED',
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
] as const;
export const ProjectInterviewStatusSchema = z.enum(PROJECT_INTERVIEW_STATUSES);
export type ProjectInterviewStatus = z.infer<typeof ProjectInterviewStatusSchema>;

export const ProjectDefenseContextSchema = z.object({
  projectId: UuidSchema,
  projectTitle: z.string().min(2),
  projectSummary: z.string().min(20).max(4_000),
  stack: z.string().min(1).max(1_000),
  declaredArtefacts: z.array(z.string().max(200)).max(30),
  verifyFlags: z.array(ProjectVerifyFlagSchema).max(10),
  verifyGaps: z.array(z.string().max(500)).max(10),
  snapshotDigest: z.string().max(16_000),
  qlixReportDigest: z.string().max(8_000).nullable().optional(),
});
export type ProjectDefenseContext = z.infer<typeof ProjectDefenseContextSchema>;

export const ProjectDefenseSessionDtoSchema = z.object({
  sessionId: UuidSchema,
  projectId: UuidSchema,
  status: z.enum(['ACTIVE', 'COMPLETED', 'EXPIRED']),
  turns: z.array(DefenseTurnSchema),
  startedAt: IsoDateTimeSchema,
  maxDurationSeconds: z.number().int().positive(),
  secondsRemaining: z.number().int().nonnegative(),
  expiresAt: IsoDateTimeSchema,
});
export type ProjectDefenseSessionDto = z.infer<typeof ProjectDefenseSessionDtoSchema>;

export const ProjectDefenseSttModeSchema = z.enum(['browser', 'server']);
export type ProjectDefenseSttMode = z.infer<typeof ProjectDefenseSttModeSchema>;

export const PrepareProjectDefenseResponseSchema = z.object({
  sessionId: UuidSchema,
});
export type PrepareProjectDefenseResponse = z.infer<typeof PrepareProjectDefenseResponseSchema>;

export const StartProjectDefenseResponseSchema = z.object({
  session: ProjectDefenseSessionDtoSchema,
  /** Project-specific examiner opening (or last examiner turn if start is retried). */
  openingPromptText: z.string().min(10).max(2_000),
  openingPromptAudioUrl: z.string().url().nullable(),
  /** browser = Web Speech live transcript; server = record audio and transcribe via API. */
  sttMode: ProjectDefenseSttModeSchema,
});
export type StartProjectDefenseResponse = z.infer<typeof StartProjectDefenseResponseSchema>;

export const AbandonProjectDefenseResponseSchema = z.object({
  abandoned: z.literal(true),
});
export type AbandonProjectDefenseResponse = z.infer<typeof AbandonProjectDefenseResponseSchema>;

export const ProjectDefenseAudioUploadRequestSchema = z.object({
  contentType: z.enum(['audio/webm', 'audio/wav', 'audio/mp4', 'audio/mpeg']),
  fileName: z.string().min(1).max(200).default('turn.webm'),
});
export type ProjectDefenseAudioUploadRequest = z.infer<
  typeof ProjectDefenseAudioUploadRequestSchema
>;

export const ProjectDefenseAudioUploadResponseSchema = z.object({
  uploadUrl: z.string().url(),
  objectKey: z.string().min(8).max(512),
  expiresInSeconds: z.number().int().positive(),
});
export type ProjectDefenseAudioUploadResponse = z.infer<
  typeof ProjectDefenseAudioUploadResponseSchema
>;

export const ProjectDefenseReplyRequestSchema = z
  .object({
    sessionId: UuidSchema,
    audioObjectKey: z.string().min(8).max(512).optional(),
    transcript: z.string().min(1).max(8_000).optional(),
  })
  .refine((value) => Boolean(value.transcript?.trim() || value.audioObjectKey), {
    message: 'Either transcript or audioObjectKey is required.',
  });
export type ProjectDefenseReplyRequest = z.infer<typeof ProjectDefenseReplyRequestSchema>;

export const ProjectDefenseReplyResponseSchema = z.object({
  session: ProjectDefenseSessionDtoSchema,
  questionText: z.string().min(1).max(1_000).nullable(),
  questionAudioUrl: z.string().url().nullable(),
  isFinalTurn: z.boolean(),
});
export type ProjectDefenseReplyResponse = z.infer<typeof ProjectDefenseReplyResponseSchema>;

export const ProjectDefenseGradeSchema = z.object({
  defenseScore: ScoreSchema,
  ownershipConcern: z.boolean(),
  ownershipConcernReason: z.string().max(1_000).nullable(),
  dimensions: z.object({
    depthOfUnderstanding: z.number().min(0).max(100),
    ownershipAndOriginality: z.number().min(0).max(100),
    defenseQuality: z.number().min(0).max(100),
  }),
  routedToReview: z.boolean(),
  promptRef: z.string().regex(/^[a-z0-9-]+@\d+$/),
  auditId: UuidSchema.nullable(),
  justification: z.string().max(2_000).optional(),
  demonstratedClaims: z.array(z.string().max(500)).max(15).optional(),
  inferredClaims: z.array(z.string().max(500)).max(15).optional(),
  competencyScores: z.array(ProjectDefenseCompetencyScoreSchema).max(20).optional(),
});
export type ProjectDefenseGrade = z.infer<typeof ProjectDefenseGradeSchema>;

export const ProjectDefensePersistedRecordSchema = z.object({
  projectId: UuidSchema,
  sessionId: UuidSchema,
  studentId: UuidSchema,
  consentAt: IsoDateTimeSchema.nullable(),
  proctoringSessionId: UuidSchema,
  transcript: z.array(DefenseTurnSchema),
  grade: ProjectDefenseGradeSchema,
  completedAt: IsoDateTimeSchema,
  appeals: z
    .array(
      z.object({
        appealId: UuidSchema,
        reason: z.string().min(8).max(2_000),
        createdAt: IsoDateTimeSchema,
        status: z.enum(['OPEN', 'RESOLVED']),
      }),
    )
    .max(10),
  reviewResolutions: z
    .array(
      z.object({
        resolution: z.enum(['APPROVE', 'REJECT']),
        reason: z.string().min(8).max(2_000),
        reviewedBy: UuidSchema,
        reviewedAt: IsoDateTimeSchema,
        priorStatus: z.enum(['VERIFIED', 'UNDER_REVIEW', 'REJECTED']),
        newStatus: z.enum(['VERIFIED', 'UNDER_REVIEW', 'REJECTED']),
      }),
    )
    .max(20),
});
export type ProjectDefensePersistedRecord = z.infer<typeof ProjectDefensePersistedRecordSchema>;

export const ProjectDefenseOutcomeDtoSchema = z.object({
  projectId: UuidSchema,
  projectStatus: z.enum(['VERIFIED', 'UNDER_REVIEW', 'REJECTED', 'SUBMITTED']),
  interviewStatus: ProjectInterviewStatusSchema,
  interviewCompletedAt: IsoDateTimeSchema.nullable(),
  /** Full grade when VERIFIED; summary only when under review. */
  grade: ProjectDefenseGradeSchema.nullable(),
  transcript: z.array(DefenseTurnSchema).nullable(),
  canAppeal: z.boolean(),
  appealOpen: z.boolean(),
});
export type ProjectDefenseOutcomeDto = z.infer<typeof ProjectDefenseOutcomeDtoSchema>;

export const ProjectDefenseAppealRequestSchema = z.object({
  reason: z.string().min(8).max(2_000),
});
export type ProjectDefenseAppealRequest = z.infer<typeof ProjectDefenseAppealRequestSchema>;

export const ProjectDefenseAppealResponseSchema = z.object({
  projectId: UuidSchema,
  projectStatus: z.literal('UNDER_REVIEW'),
  appealId: UuidSchema,
});
export type ProjectDefenseAppealResponse = z.infer<typeof ProjectDefenseAppealResponseSchema>;

export const CompleteProjectDefenseRequestSchema = z.object({
  sessionId: UuidSchema,
  /** Set when proctoring locks the session (warning limit); routes project to review. */
  integrityTerminated: z.boolean().optional().default(false),
});
export type CompleteProjectDefenseRequest = z.infer<typeof CompleteProjectDefenseRequestSchema>;

export const CompleteProjectDefenseResponseSchema = z.object({
  projectId: UuidSchema,
  projectStatus: z.enum(['VERIFIED', 'UNDER_REVIEW']),
  interviewStatus: z.literal('COMPLETED'),
  grade: ProjectDefenseGradeSchema,
});
export type CompleteProjectDefenseResponse = z.infer<typeof CompleteProjectDefenseResponseSchema>;

export const ProjectInterviewStateSchema = z.object({
  interviewRequired: z.boolean(),
  interviewStatus: ProjectInterviewStatusSchema,
  interviewCompletedAt: IsoDateTimeSchema.nullable(),
});
export type ProjectInterviewState = z.infer<typeof ProjectInterviewStateSchema>;

export const PROJECT_DEFENSE_RUBRIC_WEIGHTS: z.infer<typeof DefenseRubricWeightsSchema> = {
  depthOfUnderstanding: 0.35,
  ownershipAndOriginality: 0.35,
  defenseQuality: 0.3,
};
