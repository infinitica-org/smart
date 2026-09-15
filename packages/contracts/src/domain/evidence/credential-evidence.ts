import { z } from 'zod';
import { UuidSchema } from '../../dto/common.js';
import { TaxonomySkillCodeSchema } from '../../dto/catalog.dto.js';
import {
  CorroborationStatusSchema,
  CredentialStatusSchema,
  CredentialTypeSchema,
  EvidenceVerificationMethodSchema,
} from './enums.js';

export const CredentialApplicationEvidenceSchema = z.object({
  applicationEvidenceId: UuidSchema.optional(),
  claimedApplication: z.string().min(1).max(4000),
  linkedProjectId: UuidSchema.nullable().optional(),
  linkedWorkExperienceId: UuidSchema.nullable().optional(),
  artifactId: UuidSchema.nullable().optional(),
  corroborationStatus: CorroborationStatusSchema.default('UNLINKED'),
});
export type CredentialApplicationEvidence = z.infer<typeof CredentialApplicationEvidenceSchema>;

export const ProfessionalCredentialSchema = z.object({
  credentialId: UuidSchema,
  issuer: z.string().min(1).max(200),
  credentialName: z.string().min(1).max(200),
  credentialType: CredentialTypeSchema,
  externalCredentialId: z.string().max(200).optional(),
  issueDate: z.string().max(32).optional(),
  expiryDate: z.string().max(32).nullable().optional(),
  jurisdiction: z.string().max(120).optional(),
  scope: z.string().max(500).optional(),
  verificationSource: z.string().max(200).optional(),
  status: CredentialStatusSchema.default('PENDING_VERIFICATION'),
  assessmentType: z.string().max(120).optional(),
  practicalComponent: z.boolean().default(false),
  coveredTopics: z.array(z.string().max(200)).max(50).default([]),
  coveredSkills: z.array(TaxonomySkillCodeSchema).max(50).default([]),
  applicationEvidence: z.array(CredentialApplicationEvidenceSchema).max(20).default([]),
  verificationMethod: EvidenceVerificationMethodSchema.optional(),
  /** Object storage key for an uploaded supporting document (Tier 3 OCR fallback). Never a raw URL. */
  documentObjectKey: z.string().max(500).nullable().optional(),
});
export type ProfessionalCredential = z.infer<typeof ProfessionalCredentialSchema>;
