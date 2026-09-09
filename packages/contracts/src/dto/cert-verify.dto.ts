import { z } from 'zod';
import { TrackCodeSchema } from '../domain/enums.js';
import {
  CERT_AGENDA_LINE_MAX,
  CertAgendaLineSchema,
  CertAgendaPublicItemSchema,
} from './cert-agenda.dto.js';
import { CandidateCertificateDtoSchema } from './candidate-certificate.dto.js';
import { IsoDateTimeSchema, UuidSchema } from './common.js';
import { SdeSkillFormResponseItemSchema } from './evaluation.dto.js';

/**
 * CV-T02 — agenda-based cert assessment (reuse v0.9 skill-verify session shape).
 * Verified only when source_verified AND assessment pass. No cert→skill auto-credit.
 */

export const CERT_VERIFY_TIME_MINUTES = 25;
export const CERT_VERIFY_PASS_MARK_PERCENT = 80;

export const SubmitCertificateAgendaRequestSchema = z.object({
  trackCode: TrackCodeSchema,
  agendaLines: z.array(CertAgendaLineSchema).min(1).max(CERT_AGENDA_LINE_MAX),
  /** Display-only in v1.0 — does not flip status or force retake. */
  expiryDate: IsoDateTimeSchema.optional(),
});
export type SubmitCertificateAgendaRequest = z.infer<typeof SubmitCertificateAgendaRequestSchema>;

export const StartCertVerifyRequestSchema = z.object({
  prepareOnly: z.boolean().optional(),
  sessionId: UuidSchema.optional(),
});
export type StartCertVerifyRequest = z.infer<typeof StartCertVerifyRequestSchema>;

export const CertVerifyPrepareDtoSchema = z.object({
  sessionId: UuidSchema,
  certificateId: UuidSchema,
  expiresAt: IsoDateTimeSchema,
});
export type CertVerifyPrepareDto = z.infer<typeof CertVerifyPrepareDtoSchema>;

export const CertVerifySessionDtoSchema = z.object({
  sessionId: UuidSchema,
  certificateId: UuidSchema,
  title: z.string().min(1).max(200),
  issuer: z.string().min(1).max(200),
  timeMinutes: z.number().int().positive(),
  passMarkPercent: z.number().int().min(1).max(100),
  expiresAt: IsoDateTimeSchema,
  serverRemainingSeconds: z.number().int().nonnegative(),
  items: z.array(CertAgendaPublicItemSchema).min(1),
  answers: z.array(SdeSkillFormResponseItemSchema),
});
export type CertVerifySessionDto = z.infer<typeof CertVerifySessionDtoSchema>;

export const SaveCertVerifyRequestSchema = z.object({
  responses: z.array(SdeSkillFormResponseItemSchema),
});
export type SaveCertVerifyRequest = z.infer<typeof SaveCertVerifyRequestSchema>;

export const CompleteCertVerifyRequestSchema = z.object({
  responses: z.array(SdeSkillFormResponseItemSchema).optional(),
  technicalFailure: z.boolean().optional().default(false),
  integrityTerminated: z.boolean().optional().default(false),
  explanation: z.string().max(2_000).optional(),
});
export type CompleteCertVerifyRequest = z.infer<typeof CompleteCertVerifyRequestSchema>;

export const GradeCertAgendaItemResultSchema = z.object({
  index: z.number().int().min(1),
  marksEarned: z.number(),
  marksMax: z.number(),
  correct: z.boolean(),
  selectedKey: z.string().max(4).optional(),
  correctKey: z.enum(['A', 'B', 'C', 'D']).optional(),
  feedback: z.string().max(500).optional(),
});
export type GradeCertAgendaItemResult = z.infer<typeof GradeCertAgendaItemResultSchema>;

export const GradeCertAgendaResponseSchema = z.object({
  certificateId: UuidSchema,
  marksEarned: z.number(),
  marksTotal: z.number(),
  scorePercent: z.number(),
  passed: z.boolean(),
  promptRef: z.string().regex(/^[a-z0-9-]+@\d+$/),
  itemResults: z.array(GradeCertAgendaItemResultSchema),
});
export type GradeCertAgendaResponse = z.infer<typeof GradeCertAgendaResponseSchema>;

export const GradeCertAgendaRequestSchema = z.object({
  certificateId: UuidSchema,
  scoringToken: z.string().min(20),
  responses: z.array(SdeSkillFormResponseItemSchema),
});
export type GradeCertAgendaRequest = z.infer<typeof GradeCertAgendaRequestSchema>;

export const CompleteCertVerifyResponseSchema = z.object({
  certificate: CandidateCertificateDtoSchema,
  technicalFailure: z.boolean(),
  grade: GradeCertAgendaResponseSchema.nullable(),
});
export type CompleteCertVerifyResponse = z.infer<typeof CompleteCertVerifyResponseSchema>;
