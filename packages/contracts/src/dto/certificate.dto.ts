import { z } from 'zod';
import {
  CertificateStatusSchema,
  CertifiableTierSchema,
  LevelNumberSchema,
  TierSchema,
  TrackCodeSchema,
} from '../domain/enums.js';
import { TierTrailSchema } from '../domain/levels.js';
import { ConfidenceNoteDtoSchema } from './calibration.dto.js';
import { IsoDateTimeSchema, ScoreSchema, UuidSchema } from './common.js';

/**
 * Certificate & public verification contracts.
 * Implementation owner: Vishal Bharath R (`certificate` module, `web-verify`).
 *
 * PRODUCT GUARANTEE: an attempt whose integrity flag is not CLEAN or CLEARED
 * must never produce an issued certificate. Issuance is blocked and routed to
 * the admin integrity review queue.
 */

export const CertificateDtoSchema = z.object({
  certificateId: UuidSchema,
  studentId: UuidSchema,
  studentName: z.string(),
  trackCode: TrackCodeSchema,
  trackName: z.string(),
  status: CertificateStatusSchema,
  /** Headline: the highest level cleared at BRONZE or above. */
  highestLevelCleared: LevelNumberSchema,
  headlineTier: CertifiableTierSchema,
  /** Tier at every level up to and including the headline level. */
  tierTrail: TierTrailSchema,
  verificationUrl: z.url(),
  /** SHA-256 hash signed with the platform key; encoded in the QR code. */
  signature: z.string(),
  qrCodeUrl: z.url(),
  pdfUrl: z.url().nullable(),
  issuedAt: IsoDateTimeSchema.nullable(),
  /** Student-controlled: the student decides whether the link resolves publicly. */
  publiclyVisible: z.boolean(),
});
export type CertificateDto = z.infer<typeof CertificateDtoSchema>;

/* --------------------------- public verification --------------------------- */

/**
 * The public verification payload. Cached as `verify:cert:{id}` with a 1h TTL,
 * throttled to 20 req/min per IP.
 *
 * PRIVACY: this is unauthenticated and world-readable. It must contain nothing
 * beyond what the student consented to share — no email, no institution
 * internals, no itemised responses.
 */
export const PublicVerificationDtoSchema = z.object({
  certificateId: UuidSchema,
  /** Display name only. Never the email or student identifier. */
  candidateName: z.string(),
  trackName: z.string(),
  issuedDate: z.iso.date(),
  highestLevelCleared: LevelNumberSchema,
  headlineTier: CertifiableTierSchema,
  /** Employer-facing readiness label, e.g. "Ready Now". */
  headlineTierLabel: z.string(),
  tierTrail: z.array(
    z.object({
      levelNumber: LevelNumberSchema,
      levelName: z.string(),
      tier: TierSchema,
      /** Set when the score fell inside the cut-score confidence band. */
      borderline: z.boolean(),
      /** Competencies assessed at this level — transparency over authority. */
      competenciesAssessed: z.array(z.string()),
    }),
  ),
  confidenceNote: ConfidenceNoteDtoSchema,
  /** Regional employers who validated the cut scores. */
  calibrationEmployers: z.array(z.string()),
  methodologyUrl: z.url(),
  signatureValid: z.boolean(),
  status: CertificateStatusSchema,
});
export type PublicVerificationDto = z.infer<typeof PublicVerificationDtoSchema>;

/* ------------------------------- issuance --------------------------------- */

export const IssueCertificateRequestSchema = z.object({
  studentId: UuidSchema,
  trackCode: TrackCodeSchema,
});
export type IssueCertificateRequest = z.infer<typeof IssueCertificateRequestSchema>;

export const IssueCertificateResponseSchema = z.object({
  certificateId: UuidSchema.nullable(),
  status: CertificateStatusSchema,
  /** Present when issuance was blocked — e.g. an integrity hold. */
  blockedReason: z.string().nullable(),
  pdfJobId: z.string().nullable(),
});
export type IssueCertificateResponse = z.infer<typeof IssueCertificateResponseSchema>;

/* -------------------------- student growth report ------------------------- */

/**
 * The student-facing diagnostic. Below-Bronze results surface here as an
 * actionable gap report and are never framed as a public failure.
 */
export const StudentGrowthReportDtoSchema = z.object({
  studentId: UuidSchema,
  trackCode: TrackCodeSchema,
  trackName: z.string(),
  currentLevel: LevelNumberSchema,
  nextLevelUnlocked: z.boolean(),
  lockedReason: z.string().nullable(),
  tierTrail: TierTrailSchema,
  levelScores: z.array(
    z.object({
      levelNumber: LevelNumberSchema,
      rawScore: ScoreSchema,
      tier: TierSchema,
      confidenceBand: z.string(),
    }),
  ),
  /** Weakest competencies, ranked — this is the value the student pays for. */
  gapAreas: z.array(
    z.object({
      competencyId: UuidSchema,
      competencyName: z.string(),
      domainCode: z.string(),
      score: ScoreSchema,
      cohortAverage: ScoreSchema.nullable(),
      recommendation: z.string(),
    }),
  ),
  strengths: z.array(z.object({ competencyName: z.string(), score: ScoreSchema })),
  retestEligibleAt: IsoDateTimeSchema.nullable(),
});
export type StudentGrowthReportDto = z.infer<typeof StudentGrowthReportDtoSchema>;
