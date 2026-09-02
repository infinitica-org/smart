import { z } from 'zod';
import {
  AiProviderSchema,
  AtsStageSchema,
  AttemptStatusSchema,
  CertifiableTierSchema,
  IntegrityFlagSchema,
  LevelNumberSchema,
  ProjectVerifyFlagSchema,
  TierSchema,
  TrackCodeSchema,
  UserRoleSchema,
} from '../domain/enums.js';
import { TierTrailSchema } from '../domain/levels.js';
import { IsoDateTimeSchema, ScoreSchema, UuidSchema } from '../dto/common.js';
import { SMART_TOPICS } from './topics.js';

/**
 * Kafka event payloads.
 *
 * Every event is wrapped in a versioned envelope so a consumer can reject an
 * incompatible version loudly instead of silently mis-parsing it. Adding an
 * optional field is backwards compatible; changing or removing a field is a
 * version bump plus a contract PR naming every consumer.
 *
 * Owner: Tino (System Architect).
 */

export const EventEnvelopeMetaSchema = z.object({
  /** Unique per emission. Consumers dedupe on this for at-least-once delivery. */
  eventId: UuidSchema,
  eventType: z.string(),
  /** Payload schema version. Consumers must assert the version they support. */
  version: z.literal(1),
  occurredAt: IsoDateTimeSchema,
  /** Distributed trace id, propagated from the originating HTTP request. */
  traceId: z.string(),
  /** Emitting module, e.g. `assessment`. Useful when debugging fan-out. */
  source: z.string(),
});
export type EventEnvelopeMeta = z.infer<typeof EventEnvelopeMetaSchema>;

export function envelopeSchema<T extends z.ZodTypeAny>(eventType: string, data: T) {
  return z.object({
    meta: EventEnvelopeMetaSchema.extend({ eventType: z.literal(eventType) }),
    data,
  });
}

/* -------------------------------------------------------------------------- */
/*                          identity  (owner: Vishal V)                       */
/* -------------------------------------------------------------------------- */

export const UserCreatedDataSchema = z.object({
  userId: UuidSchema,
  role: UserRoleSchema,
  institutionId: UuidSchema.nullable(),
  primaryTrack: TrackCodeSchema.nullable(),
});
export const UserCreatedEventSchema = envelopeSchema(
  SMART_TOPICS.userCreated,
  UserCreatedDataSchema,
);
export type UserCreatedEvent = z.infer<typeof UserCreatedEventSchema>;

export const UserUpdatedDataSchema = z.object({
  userId: UuidSchema,
  changedFields: z.array(z.string()),
  primaryTrack: TrackCodeSchema.nullable(),
  secondaryTrack: TrackCodeSchema.nullable(),
});
export const UserUpdatedEventSchema = envelopeSchema(
  SMART_TOPICS.userUpdated,
  UserUpdatedDataSchema,
);
export type UserUpdatedEvent = z.infer<typeof UserUpdatedEventSchema>;

/* -------------------------------------------------------------------------- */
/*                    assessment  (owner: Vishal Bharath R)                   */
/* -------------------------------------------------------------------------- */

export const AssessmentStartedDataSchema = z.object({
  attemptId: UuidSchema,
  studentId: UuidSchema,
  trackCode: TrackCodeSchema,
  levelNumber: LevelNumberSchema,
  /** Parallel form assigned — consumed by catalog for exposure tracking. */
  formId: z.string(),
  itemIds: z.array(UuidSchema),
  startedAt: IsoDateTimeSchema,
  expiresAt: IsoDateTimeSchema,
});
export const AssessmentStartedEventSchema = envelopeSchema(
  SMART_TOPICS.assessmentStarted,
  AssessmentStartedDataSchema,
);
export type AssessmentStartedEvent = z.infer<typeof AssessmentStartedEventSchema>;

/**
 * THE handoff from delivery to grading.
 *
 * `responses` carries everything the evaluator needs so it does not have to call
 * back into `assessment` — that is what keeps the two modules independently
 * deployable and independently ownable.
 */
export const AssessmentSubmittedDataSchema = z.object({
  attemptId: UuidSchema,
  studentId: UuidSchema,
  trackCode: TrackCodeSchema,
  levelNumber: LevelNumberSchema,
  status: AttemptStatusSchema,
  autoSubmitted: z.boolean(),
  integrityFlag: IntegrityFlagSchema,
  submittedAt: IsoDateTimeSchema,
  responses: z.array(
    z.object({
      responseId: UuidSchema,
      itemId: UuidSchema,
      competencyId: UuidSchema,
      itemWeight: z.number(),
      /** Raw candidate answer, discriminated the same way as AnswerPayload. */
      answer: z.unknown(),
      /** R2 object key for audio or artifact submissions. */
      objectKey: z.string().nullable(),
    }),
  ),
});
export const AssessmentSubmittedEventSchema = envelopeSchema(
  SMART_TOPICS.assessmentSubmitted,
  AssessmentSubmittedDataSchema,
);
export type AssessmentSubmittedEvent = z.infer<typeof AssessmentSubmittedEventSchema>;

/* -------------------------------------------------------------------------- */
/*                       evaluation  (owner: Ramansh)                         */
/* -------------------------------------------------------------------------- */

export const EvalRequestedDataSchema = z.object({
  responseId: UuidSchema,
  attemptId: UuidSchema,
  competencyId: UuidSchema,
  levelNumber: LevelNumberSchema,
  promptRef: z.string(),
  /** Presigned URL for audio; short-lived and single-use. */
  audioUrl: z.url().nullable(),
  transcript: z.string().nullable(),
  priority: z.enum(['P1_REALTIME', 'P2_ASYNC_EVAL', 'P3_BATCH']),
});
export const EvalRequestedEventSchema = envelopeSchema(
  SMART_TOPICS.evalRequested,
  EvalRequestedDataSchema,
);
export type EvalRequestedEvent = z.infer<typeof EvalRequestedEventSchema>;

/**
 * Level scored and tier assigned.
 *
 * `tierAwarded` is produced by `scoring-engine.assignTier()` against the
 * PUBLISHED cut scores — the raw score alone never determines a tier.
 */
export const EvalCompletedDataSchema = z.object({
  attemptId: UuidSchema,
  studentId: UuidSchema,
  trackCode: TrackCodeSchema,
  levelNumber: LevelNumberSchema,
  rawScore: ScoreSchema,
  tierAwarded: TierSchema,
  confidenceBand: z.string(),
  borderline: z.boolean(),
  /** Which cut-score set was applied — makes a grade reproducible later. */
  cutScoreSetId: UuidSchema.nullable(),
  cohensKappa: z.number().nullable(),
  humanReviewed: z.boolean(),
  provider: AiProviderSchema.nullable(),
  usedFallback: z.boolean(),
  competencyScores: z.array(
    z.object({ competencyId: UuidSchema, score: ScoreSchema, isGap: z.boolean() }),
  ),
  evaluatedAt: IsoDateTimeSchema,
});
export const EvalCompletedEventSchema = envelopeSchema(
  SMART_TOPICS.evalCompleted,
  EvalCompletedDataSchema,
);
export type EvalCompletedEvent = z.infer<typeof EvalCompletedEventSchema>;

/* -------------------------------------------------------------------------- */
/*                       calibration  (owner: Vedika G)                       */
/* -------------------------------------------------------------------------- */

export const TrackUpdatedDataSchema = z.object({
  trackCode: TrackCodeSchema,
  changeKind: z.enum([
    'CUT_SCORES_PUBLISHED',
    'RUBRIC_REVISED',
    'ITEMS_ROTATED',
    'RELIABILITY_RECOMPUTED',
  ]),
  affectedLevels: z.array(LevelNumberSchema),
  /** Cache keys the consumer should invalidate. */
  invalidateKeys: z.array(z.string()),
});
export const TrackUpdatedEventSchema = envelopeSchema(
  SMART_TOPICS.trackUpdated,
  TrackUpdatedDataSchema,
);
export type TrackUpdatedEvent = z.infer<typeof TrackUpdatedEventSchema>;

/* -------------------------------------------------------------------------- */
/*                    certificate  (owner: Vishal Bharath R)                  */
/* -------------------------------------------------------------------------- */

export const CertificateIssuedDataSchema = z.object({
  certificateId: UuidSchema,
  studentId: UuidSchema,
  trackCode: TrackCodeSchema,
  highestLevelCleared: LevelNumberSchema,
  headlineTier: CertifiableTierSchema,
  tierTrail: TierTrailSchema,
  verificationUrl: z.url(),
  issuedAt: IsoDateTimeSchema,
});
export const CertificateIssuedEventSchema = envelopeSchema(
  SMART_TOPICS.certificateIssued,
  CertificateIssuedDataSchema,
);
export type CertificateIssuedEvent = z.infer<typeof CertificateIssuedEventSchema>;

/* -------------------------------------------------------------------------- */
/*                      placement  (owner: Vedika G)                          */
/* -------------------------------------------------------------------------- */

export const PlacementMatchedDataSchema = z.object({
  shortlistId: UuidSchema,
  jdId: UuidSchema,
  institutionId: UuidSchema,
  companyName: z.string(),
  roleTitle: z.string(),
  matchedCount: z.number().int(),
  /** Identifiers only; the webhook dispatcher hydrates what the partner may see. */
  studentIds: z.array(UuidSchema),
  generatedAt: IsoDateTimeSchema,
});
export const PlacementMatchedEventSchema = envelopeSchema(
  SMART_TOPICS.placementMatched,
  PlacementMatchedDataSchema,
);
export type PlacementMatchedEvent = z.infer<typeof PlacementMatchedEventSchema>;

export const ApplicationStageChangedDataSchema = z.object({
  applicationId: UuidSchema,
  openingId: UuidSchema,
  studentId: UuidSchema,
  fromStage: AtsStageSchema.nullable(),
  toStage: AtsStageSchema,
  changedAt: IsoDateTimeSchema,
});
export const ApplicationStageChangedEventSchema = envelopeSchema(
  SMART_TOPICS.applicationStageChanged,
  ApplicationStageChangedDataSchema,
);
export type ApplicationStageChangedEvent = z.infer<typeof ApplicationStageChangedEventSchema>;

export const INVITATION_EMAIL_TEMPLATES = [
  'institution-admin-invite',
  'student-invite',
  'invite-reminder',
] as const;

export const InvitationSentDataSchema = z.object({
  invitationId: UuidSchema,
  userId: UuidSchema,
  email: z.string().email(),
  fullName: z.string(),
  institutionName: z.string(),
  inviteUrl: z.string().url(),
  template: z.enum(INVITATION_EMAIL_TEMPLATES),
  batchName: z.string().nullable(),
});
export const InvitationSentEventSchema = envelopeSchema(
  SMART_TOPICS.invitationSent,
  InvitationSentDataSchema,
);
export type InvitationSentEvent = z.infer<typeof InvitationSentEventSchema>;

export const SKILL_VERIFICATION_STATUSES = ['VERIFIED', 'BEGINNER_REATTEMPT', 'LOCKED'] as const;

export const SkillVerificationCompletedDataSchema = z.object({
  claimId: UuidSchema,
  userId: UuidSchema,
  skillName: z.string(),
  status: z.enum(SKILL_VERIFICATION_STATUSES),
  detail: z.string(),
});
export const SkillVerificationCompletedEventSchema = envelopeSchema(
  SMART_TOPICS.skillVerificationCompleted,
  SkillVerificationCompletedDataSchema,
);
export type SkillVerificationCompletedEvent = z.infer<typeof SkillVerificationCompletedEventSchema>;

/* -------------------------------------------------------------------------- */
/*                         platform audit  (owner: Vishal V)                  */
/* -------------------------------------------------------------------------- */

export const AuditRecordedDataSchema = z.object({
  actorId: UuidSchema.nullable(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string().nullable(),
  reasonCode: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  recordedAt: IsoDateTimeSchema,
});
export const AuditRecordedEventSchema = envelopeSchema(
  SMART_TOPICS.auditRecorded,
  AuditRecordedDataSchema,
);
export type AuditRecordedEvent = z.infer<typeof AuditRecordedEventSchema>;

/* -------------------------------------------------------------------------- */
/*                       ai-gateway audit  (owner: Ramansh)                   */
/* -------------------------------------------------------------------------- */

export const AiCompletionRecordedDataSchema = z.object({
  promptRef: z.string(),
  provider: AiProviderSchema,
  model: z.string(),
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  latencyMs: z.number().int().nonnegative(),
  usedFallback: z.boolean(),
  estimatedCostUsd: z.number().nonnegative(),
  responseId: UuidSchema.nullable(),
  recordedAt: IsoDateTimeSchema,
});
export const AiCompletionRecordedEventSchema = envelopeSchema(
  SMART_TOPICS.aiCompletionRecorded,
  AiCompletionRecordedDataSchema,
);
export type AiCompletionRecordedEvent = z.infer<typeof AiCompletionRecordedEventSchema>;

/* -------------------------------------------------------------------------- */
/*                      rate limiting  (owner: Vishal V)                      */
/* -------------------------------------------------------------------------- */

export const RateLimitExceededDataSchema = z.object({
  identifier: z.string(),
  scope: z.enum(['IP', 'USER', 'ATTEMPT', 'INSTITUTION', 'API_KEY', 'SERVICE_WORKER']),
  policyKey: z.string(),
  endpoint: z.string(),
  limit: z.number().int(),
  windowSeconds: z.number().int(),
  violationsInWindow: z.number().int(),
  /** Set when the violation happened during a live attempt — feeds integrity review. */
  attemptId: UuidSchema.nullable(),
});
export const RateLimitExceededEventSchema = envelopeSchema(
  SMART_TOPICS.rateLimitExceeded,
  RateLimitExceededDataSchema,
);
export type RateLimitExceededEvent = z.infer<typeof RateLimitExceededEventSchema>;

/* -------------------------------------------------------------------------- */
/*                   project verify (VV snapshot / RM score)                   */
/* -------------------------------------------------------------------------- */

export const ProjectSubmittedDataSchema = z.object({
  projectId: UuidSchema,
  studentId: UuidSchema,
});
export const ProjectSubmittedEventSchema = envelopeSchema(
  SMART_TOPICS.projectSubmitted,
  ProjectSubmittedDataSchema,
);
export type ProjectSubmittedEvent = z.infer<typeof ProjectSubmittedEventSchema>;

export const ProjectSnapshotReadyDataSchema = z.object({
  projectId: UuidSchema,
  snapshotVersion: z.number().int().positive(),
});
export const ProjectSnapshotReadyEventSchema = envelopeSchema(
  SMART_TOPICS.projectSnapshotReady,
  ProjectSnapshotReadyDataSchema,
);
export type ProjectSnapshotReadyEvent = z.infer<typeof ProjectSnapshotReadyEventSchema>;

export const ProjectVerifyCompletedDataSchema = z.object({
  projectId: UuidSchema,
  score: ScoreSchema,
  confidence: z.number().min(0).max(1),
  routedToReview: z.boolean(),
  flags: z.array(ProjectVerifyFlagSchema),
});
export const ProjectVerifyCompletedEventSchema = envelopeSchema(
  SMART_TOPICS.projectVerifyCompleted,
  ProjectVerifyCompletedDataSchema,
);
export type ProjectVerifyCompletedEvent = z.infer<typeof ProjectVerifyCompletedEventSchema>;

/* -------------------------------------------------------------------------- */
/*                              topic → schema map                            */
/* -------------------------------------------------------------------------- */

/**
 * Lookup used by the Kafka platform service to validate every message on both
 * produce and consume. Validating on produce means a bad payload fails in the
 * producer's own CI rather than in someone else's consumer at 2 a.m.
 */
export const EVENT_SCHEMA_BY_TOPIC = {
  [SMART_TOPICS.userCreated]: UserCreatedEventSchema,
  [SMART_TOPICS.userUpdated]: UserUpdatedEventSchema,
  [SMART_TOPICS.assessmentStarted]: AssessmentStartedEventSchema,
  [SMART_TOPICS.assessmentSubmitted]: AssessmentSubmittedEventSchema,
  [SMART_TOPICS.evalRequested]: EvalRequestedEventSchema,
  [SMART_TOPICS.evalCompleted]: EvalCompletedEventSchema,
  [SMART_TOPICS.trackUpdated]: TrackUpdatedEventSchema,
  [SMART_TOPICS.certificateIssued]: CertificateIssuedEventSchema,
  [SMART_TOPICS.placementMatched]: PlacementMatchedEventSchema,
  [SMART_TOPICS.applicationStageChanged]: ApplicationStageChangedEventSchema,
  [SMART_TOPICS.invitationSent]: InvitationSentEventSchema,
  [SMART_TOPICS.skillVerificationCompleted]: SkillVerificationCompletedEventSchema,
  [SMART_TOPICS.auditRecorded]: AuditRecordedEventSchema,
  [SMART_TOPICS.aiCompletionRecorded]: AiCompletionRecordedEventSchema,
  [SMART_TOPICS.rateLimitExceeded]: RateLimitExceededEventSchema,
  [SMART_TOPICS.projectSubmitted]: ProjectSubmittedEventSchema,
  [SMART_TOPICS.projectSnapshotReady]: ProjectSnapshotReadyEventSchema,
  [SMART_TOPICS.projectVerifyCompleted]: ProjectVerifyCompletedEventSchema,
} as const;

export type SmartEvent =
  | UserCreatedEvent
  | UserUpdatedEvent
  | AssessmentStartedEvent
  | AssessmentSubmittedEvent
  | EvalRequestedEvent
  | EvalCompletedEvent
  | TrackUpdatedEvent
  | CertificateIssuedEvent
  | PlacementMatchedEvent
  | ApplicationStageChangedEvent
  | InvitationSentEvent
  | SkillVerificationCompletedEvent
  | AuditRecordedEvent
  | AiCompletionRecordedEvent
  | RateLimitExceededEvent
  | ProjectSubmittedEvent
  | ProjectSnapshotReadyEvent
  | ProjectVerifyCompletedEvent;
