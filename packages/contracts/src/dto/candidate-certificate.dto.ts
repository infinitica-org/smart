import { z } from 'zod';
import {
  CandidateCertificateStatusSchema,
  CertificateEndorsementStatusSchema,
  CertificateProficiencySchema,
  CertificateVerificationMethodSchema,
} from '../domain/enums.js';
import { isDisallowedEndorserEmailDomain } from '../domain/disallowed-email-domains.js';
import { EmailSchema, IsoDateTimeSchema, UuidSchema } from './common.js';
import { SkillsClaimedSnapshotSchema, TaxonomySkillCodeSchema } from './catalog.dto.js';

/**
 * Candidate certificate verification (externally-issued certs) — a standalone
 * dashboard section, decoupled from onboarding. Distinct from the platform's
 * own issued `Certificate`/tier model in `certificate.dto.ts`.
 *
 * Two verification paths: LLM-based (owned separately — this contract only
 * ever records `verificationMethod: 'LLM'` if/when that lands) and
 * endorsement (built here — a named external reviewer with a work email).
 */

export const CreateCandidateCertificateRequestSchema = z.object({
  title: z.string().min(3).max(200),
  issuer: z.string().min(2).max(200),
});
export type CreateCandidateCertificateRequest = z.infer<
  typeof CreateCandidateCertificateRequestSchema
>;

export const CandidateCertificateSkillDtoSchema = z.object({
  skillCode: TaxonomySkillCodeSchema,
  skillName: z.string(),
  selfAssessedProficiency: CertificateProficiencySchema,
});
export type CandidateCertificateSkillDto = z.infer<typeof CandidateCertificateSkillDtoSchema>;

export const AddCertificateSkillsRequestSchema = z.object({
  skills: z
    .array(
      z.object({
        skillCode: TaxonomySkillCodeSchema,
        selfAssessedProficiency: CertificateProficiencySchema,
      }),
    )
    .min(1)
    .max(20),
});
export type AddCertificateSkillsRequest = z.infer<typeof AddCertificateSkillsRequestSchema>;

export const UpdateCertificateLearningRequestSchema = z.object({
  learningDescription: z.string().min(10).max(4_000).optional(),
  tools: z.array(z.string().min(1).max(60)).max(20).optional(),
  practicalApplied: z.boolean().optional(),
  practicalDescription: z.string().max(4_000).optional(),
});
export type UpdateCertificateLearningRequest = z.infer<
  typeof UpdateCertificateLearningRequestSchema
>;

export const CandidateCertificateDtoSchema = z.object({
  certificateId: UuidSchema,
  candidateId: UuidSchema,
  title: z.string(),
  issuer: z.string(),
  status: CandidateCertificateStatusSchema,
  verificationMethod: CertificateVerificationMethodSchema.nullable(),
  certificateFileUrl: z.string().nullable(),
  certificateFileName: z.string().nullable(),
  fileMimeType: z.string().nullable(),
  fileSizeBytes: z.number().int().nonnegative().nullable(),
  learningDescription: z.string().nullable(),
  tools: z.array(z.string()),
  practicalApplied: z.boolean().nullable(),
  practicalDescription: z.string().nullable(),
  skills: z.array(CandidateCertificateSkillDtoSchema),
  /** Frozen when status becomes VERIFIED — codes + taxonomy version at endorsement. */
  skillsClaimedSnapshot: SkillsClaimedSnapshotSchema.nullable().optional(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type CandidateCertificateDto = z.infer<typeof CandidateCertificateDtoSchema>;

export const ListMyCandidateCertificatesResponseSchema = z.object({
  certificates: z.array(CandidateCertificateDtoSchema),
});
export type ListMyCandidateCertificatesResponse = z.infer<
  typeof ListMyCandidateCertificatesResponseSchema
>;

export const CertificateUploadResponseSchema = z.object({
  certificate: CandidateCertificateDtoSchema,
});
export type CertificateUploadResponse = z.infer<typeof CertificateUploadResponseSchema>;

export const CertificateVerificationEventDtoSchema = z.object({
  eventId: UuidSchema,
  status: CandidateCertificateStatusSchema,
  message: z.string(),
  createdAt: IsoDateTimeSchema,
});
export type CertificateVerificationEventDto = z.infer<typeof CertificateVerificationEventDtoSchema>;

export const ListCertificateVerificationEventsResponseSchema = z.object({
  events: z.array(CertificateVerificationEventDtoSchema),
});
export type ListCertificateVerificationEventsResponse = z.infer<
  typeof ListCertificateVerificationEventsResponseSchema
>;

/** A work email only — a free/personal address is too easy for a candidate to control. */
export const CreateCertificateEndorsementRequestSchema = z.object({
  endorserName: z.string().min(2).max(200),
  endorserEmail: EmailSchema.refine((email) => !isDisallowedEndorserEmailDomain(email), {
    message: "Use the endorser's work email address, not a personal email provider.",
  }),
  endorserTitle: z.string().max(200).optional(),
});
export type CreateCertificateEndorsementRequest = z.infer<
  typeof CreateCertificateEndorsementRequestSchema
>;

export const CertificateEndorsementDtoSchema = z.object({
  endorsementId: UuidSchema,
  status: CertificateEndorsementStatusSchema,
  endorserName: z.string(),
  createdAt: IsoDateTimeSchema,
});
export type CertificateEndorsementDto = z.infer<typeof CertificateEndorsementDtoSchema>;

/** Public, token-resolved — what an endorser with no SMART account sees. */
export const GetCertificateEndorsementResponseSchema = z.object({
  candidateName: z.string(),
  certificateTitle: z.string(),
  certificateIssuer: z.string(),
  certificateFileUrl: z.string().nullable(),
  skills: z.array(
    z.object({ skillName: z.string(), selfAssessedProficiency: CertificateProficiencySchema }),
  ),
  learningDescription: z.string().nullable(),
  tools: z.array(z.string()),
  practicalApplied: z.boolean().nullable(),
  practicalDescription: z.string().nullable(),
  status: CertificateEndorsementStatusSchema,
  isExpired: z.boolean(),
  isAlreadyResponded: z.boolean(),
});
export type GetCertificateEndorsementResponse = z.infer<
  typeof GetCertificateEndorsementResponseSchema
>;

export const SubmitCertificateEndorsementDecisionRequestSchema = z.object({
  approved: z.boolean(),
  comments: z.string().max(2_000).optional(),
});
export type SubmitCertificateEndorsementDecisionRequest = z.infer<
  typeof SubmitCertificateEndorsementDecisionRequestSchema
>;

export const SubmitCertificateEndorsementDecisionResponseSchema = z.object({
  status: CertificateEndorsementStatusSchema,
  message: z.string(),
});
export type SubmitCertificateEndorsementDecisionResponse = z.infer<
  typeof SubmitCertificateEndorsementDecisionResponseSchema
>;
