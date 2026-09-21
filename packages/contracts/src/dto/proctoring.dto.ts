import { z } from 'zod';
import { IntegrityFlagSchema } from '../domain/enums.js';
import { IsoDateTimeSchema, UuidSchema } from './common.js';

/** HMAC-signed client/CV events. Additive vs the original advisory IntegrityEvent kinds. */
export const PROCTORING_VIOLATION_KINDS = [
  'TAB_BLUR',
  'FULLSCREEN_EXIT',
  'PASTE_DETECTED',
  'DEVTOOLS_OPEN',
  'MULTIPLE_FACES',
  'NO_FACE',
  'AUDIO_SILENCE',
  'NETWORK_LOSS',
  'COPY_ATTEMPT',
  'CUT_ATTEMPT',
  'RIGHT_CLICK',
  'TEXT_SELECT',
  'OS_KEY',
  'PRINT_SCREEN',
  'ERRATIC_CLICK',
  'HEARTBEAT_LOST',
  'AUTOMATION_DETECTED',
  'VIRTUAL_CAMERA',
  'LOOKING_AWAY',
  'CAMERA_OBSTRUCTED',
  'POOR_LIGHTING',
  'LIVENESS_FAILURE',
  'CAMERA_STATIC',
  'TECHNICAL_INTERRUPTION',
  /** @deprecated Prefer FOREIGN_OBJECT_DETECTED — kept for legacy events. */
  'PHONE_DETECTED',
  'FOREIGN_OBJECT_DETECTED',
] as const;
export const ProctoringViolationKindSchema = z.enum(PROCTORING_VIOLATION_KINDS);
export type ProctoringViolationKind = z.infer<typeof ProctoringViolationKindSchema>;

export const ProctoringEventClassSchema = z.enum(['INTEGRITY', 'TECHNICAL']);
export type ProctoringEventClass = z.infer<typeof ProctoringEventClassSchema>;

export const ProctoringSeveritySchema = z.enum(['low', 'medium', 'high']);
export type ProctoringSeverity = z.infer<typeof ProctoringSeveritySchema>;

export const TECHNICAL_VIOLATION_KINDS: readonly ProctoringViolationKind[] = [
  'NETWORK_LOSS',
  'HEARTBEAT_LOST',
  'CAMERA_STATIC',
  'TECHNICAL_INTERRUPTION',
];

export const DEFAULT_VIOLATION_SEVERITY: Record<ProctoringViolationKind, ProctoringSeverity> = {
  TAB_BLUR: 'medium',
  FULLSCREEN_EXIT: 'medium',
  PASTE_DETECTED: 'medium',
  DEVTOOLS_OPEN: 'high',
  MULTIPLE_FACES: 'high',
  NO_FACE: 'medium',
  AUDIO_SILENCE: 'low',
  NETWORK_LOSS: 'high',
  COPY_ATTEMPT: 'medium',
  CUT_ATTEMPT: 'medium',
  RIGHT_CLICK: 'low',
  TEXT_SELECT: 'low',
  OS_KEY: 'medium',
  PRINT_SCREEN: 'medium',
  ERRATIC_CLICK: 'low',
  HEARTBEAT_LOST: 'high',
  AUTOMATION_DETECTED: 'high',
  VIRTUAL_CAMERA: 'high',
  LOOKING_AWAY: 'low',
  CAMERA_OBSTRUCTED: 'medium',
  POOR_LIGHTING: 'low',
  LIVENESS_FAILURE: 'high',
  CAMERA_STATIC: 'medium',
  TECHNICAL_INTERRUPTION: 'medium',
  PHONE_DETECTED: 'high',
  FOREIGN_OBJECT_DETECTED: 'high',
};

export const PROCTORING_WARNING_LIMIT_DEFAULT = 5;

export const IntegrityScoreBandSchema = z.enum(['CLEAN', 'MINOR', 'MAJOR']);
export type IntegrityScoreBand = z.infer<typeof IntegrityScoreBandSchema>;

export const ProctoringViolationRequestSchema = z.object({
  attemptId: UuidSchema,
  kind: ProctoringViolationKindSchema,
  occurredAt: IsoDateTimeSchema,
  severity: ProctoringSeveritySchema.optional(),
  eventClass: ProctoringEventClassSchema.optional(),
  nonce: z.string().min(16).max(128),
  signature: z.string().min(32).max(128),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});
export type ProctoringViolationRequest = z.infer<typeof ProctoringViolationRequestSchema>;

export const ProctoringWarningSnapshotSchema = z.object({
  attemptId: UuidSchema,
  warningCount: z.number().int().nonnegative(),
  warningLimit: z.number().int().positive(),
  locked: z.boolean(),
  integrityScore: z.number().int().nonnegative(),
  integrityBand: IntegrityScoreBandSchema,
  integrityFlag: IntegrityFlagSchema,
  hmacSecret: z.string().min(16).optional(),
});
export type ProctoringWarningSnapshot = z.infer<typeof ProctoringWarningSnapshotSchema>;

export const ProctoringNonceResponseSchema = z.object({
  attemptId: UuidSchema,
  nonce: z.string().min(16),
  expiresInSeconds: z.number().int().positive(),
});
export type ProctoringNonceResponse = z.infer<typeof ProctoringNonceResponseSchema>;

export const BlobHudStateSchema = z.enum(['idle', 'alert', 'pass_cue', 'terminated']);
export const BlobWsPayloadSchema = z.object({
  type: z.enum(['blob_state', 'session_terminated']),
  state: BlobHudStateSchema.optional(),
  violation: ProctoringViolationKindSchema.optional(),
  message: z.string().max(280).optional(),
  reason: z.string().max(80).optional(),
});
export type BlobWsPayload = z.infer<typeof BlobWsPayloadSchema>;

export const ProctoringConsentRequestSchema = z.object({
  attemptId: UuidSchema,
  camera: z.literal(true),
  microphone: z.literal(true),
  biometricProcessing: z.literal(true),
});
export type ProctoringConsentRequest = z.infer<typeof ProctoringConsentRequestSchema>;

export const ProctoringOnboardingStatusSchema = z.object({
  attemptId: UuidSchema,
  consentAt: IsoDateTimeSchema.nullable(),
  precheckPassed: z.boolean(),
  faceEnrolled: z.boolean(),
  livenessPassed: z.boolean(),
  voiceCalibrated: z.boolean(),
  onboardingPassed: z.boolean(),
});
export type ProctoringOnboardingStatus = z.infer<typeof ProctoringOnboardingStatusSchema>;

export const ProctoringPrecheckRequestSchema = z.object({
  attemptId: UuidSchema,
  brightness: z.number().min(0).max(255),
  audioRmsPercent: z.number().min(0).max(100),
  faceCentered: z.boolean(),
});
export type ProctoringPrecheckRequest = z.infer<typeof ProctoringPrecheckRequestSchema>;

export const ProctoringPrecheckResponseSchema = z.object({
  passed: z.boolean(),
  message: z.string(),
});
export type ProctoringPrecheckResponse = z.infer<typeof ProctoringPrecheckResponseSchema>;

export const ProctoringEnrollResponseSchema = z.object({
  enrolled: z.boolean(),
  message: z.string(),
});
export type ProctoringEnrollResponse = z.infer<typeof ProctoringEnrollResponseSchema>;

export const ProctoringLivenessRequestSchema = z.object({
  attemptId: UuidSchema,
  challenge: z.enum(['TURN_LEFT', 'TURN_RIGHT', 'BLINK']),
  /** Legacy client-reported deltas; ignored when objectKey is present. */
  yawDelta: z.number().optional(),
  earDelta: z.number().optional(),
  objectKey: z.string().min(8).max(512).optional(),
});
export type ProctoringLivenessRequest = z.infer<typeof ProctoringLivenessRequestSchema>;

export const ProctoringLivenessResponseSchema = z.object({
  isLive: z.boolean(),
  message: z.string(),
});
export type ProctoringLivenessResponse = z.infer<typeof ProctoringLivenessResponseSchema>;

export const ProctoringVoiceResponseSchema = z.object({
  verified: z.boolean(),
  transcribedText: z.string(),
  message: z.string(),
});
export type ProctoringVoiceResponse = z.infer<typeof ProctoringVoiceResponseSchema>;

export const ProctoringCheckpointRequestSchema = z.object({
  attemptId: UuidSchema,
  objectKey: z.string().min(8).max(512),
});
export type ProctoringCheckpointRequest = z.infer<typeof ProctoringCheckpointRequestSchema>;

export const PROCTORING_SNAPSHOT_KEY_PREFIX = 'proctoring/' as const;

/** JPEG dimensions uploaded for server CV (16:9). */
export const PROCTORING_SNAPSHOT_WIDTH = 640;
export const PROCTORING_SNAPSHOT_HEIGHT = 360;
/** ~60 snapshots/min — sync checkpoint analyzes inline; scale CV sidecar horizontally. */
export const PROCTORING_SNAPSHOT_INTERVAL_MS = 1_000;
/** Server CV: suppress repeat kinds until this window elapses (≈ two snapshot cycles). */
export const PROCTORING_CHECKPOINT_DEDUP_MS = 2_000;
/** Client HMAC ingest: same kind must not increment warning count again within this window. */
export const PROCTORING_INGEST_DEDUP_MS = 45_000;

export const ProctoringCheckpointResponseSchema = z.object({
  attemptId: UuidSchema,
  analyzed: z.boolean(),
  /** Raw kinds from CV before dedup. */
  detected: z.array(ProctoringViolationKindSchema),
  /** Integrity kinds recorded this checkpoint (after dedup). */
  newViolations: z.array(ProctoringViolationKindSchema),
  warningCount: z.number().int().nonnegative(),
  warningLimit: z.number().int().positive(),
  locked: z.boolean(),
});
export type ProctoringCheckpointResponse = z.infer<typeof ProctoringCheckpointResponseSchema>;

export const ProctoringSnapshotUploadRequestSchema = z.object({
  contentType: z.literal('image/jpeg'),
});
export type ProctoringSnapshotUploadRequest = z.infer<typeof ProctoringSnapshotUploadRequestSchema>;

export const ProctoringSnapshotUploadResponseSchema = z.object({
  uploadUrl: z.string().url(),
  objectKey: z.string().min(8).max(512),
  expiresInSeconds: z.number().int().positive(),
});
export type ProctoringSnapshotUploadResponse = z.infer<
  typeof ProctoringSnapshotUploadResponseSchema
>;

export const ProctoringEnrollRequestSchema = z.object({
  attemptId: UuidSchema,
  objectKey: z.string().min(8).max(512).optional(),
});
export type ProctoringEnrollRequest = z.infer<typeof ProctoringEnrollRequestSchema>;

export const ProctoringPingResponseSchema = z.object({
  status: z.literal('ok'),
  attemptId: UuidSchema,
});
export type ProctoringPingResponse = z.infer<typeof ProctoringPingResponseSchema>;

export const ProctoringFingerprintRequestSchema = z.object({
  attemptId: UuidSchema,
  fingerprintHash: z.string().min(16).max(128),
  userAgent: z.string().max(512).optional(),
  screenResolution: z.string().max(32).optional(),
  webglVendor: z.string().max(128).optional(),
});
export type ProctoringFingerprintRequest = z.infer<typeof ProctoringFingerprintRequestSchema>;

export const PROCTORING_ROUTE_RBAC = {
  roles: ['STUDENT'] as const,
  rateLimit: 'proctoring.telemetry',
} as const;
