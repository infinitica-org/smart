import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from '../../dto/common.js';
import { TaxonomySkillCodeSchema } from '../../dto/catalog.dto.js';
import {
  EvidenceReliabilitySchema,
  EvidenceSourceSchema,
  EvidenceStrengthSchema,
  EvidenceTypeSchema,
  EvidenceVerificationStatusSchema,
} from './enums.js';
import {
  EvidenceContradictionSchema,
  FreshnessSchema,
  UniversalEvidenceFieldsSchema,
  VerificationMetadataSchema,
} from './metadata.js';

export const EvidenceRecordSchema = z
  .object({
    evidenceId: UuidSchema,
    candidateId: UuidSchema,
    evidenceType: EvidenceTypeSchema,
    source: EvidenceSourceSchema,
    relatedSkillIds: z.array(TaxonomySkillCodeSchema).max(50).default([]),
    verificationStatus: EvidenceVerificationStatusSchema.default('PENDING'),
    evidenceStrength: EvidenceStrengthSchema.optional(),
    evidenceReliability: EvidenceReliabilitySchema.optional(),
    freshness: FreshnessSchema.optional(),
    artifactIds: z.array(UuidSchema).max(50).default([]),
    contradictions: z.array(EvidenceContradictionSchema).max(50).default([]),
    verificationMetadata: VerificationMetadataSchema.optional(),
    sourceEntityId: UuidSchema.nullable().optional(),
    sourcePayload: z.record(z.string(), z.unknown()).optional(),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .merge(UniversalEvidenceFieldsSchema);
export type EvidenceRecord = z.infer<typeof EvidenceRecordSchema>;

export const CreateEvidenceRecordSchema = EvidenceRecordSchema.omit({
  evidenceId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  candidateId: UuidSchema.optional(),
});
export type CreateEvidenceRecord = z.infer<typeof CreateEvidenceRecordSchema>;

export function evidenceRequiresRelatedSkills(
  evidence: Pick<EvidenceRecord, 'claim' | 'relatedSkillIds'>,
): boolean {
  if (!evidence.claim?.trim()) {
    return true;
  }
  return evidence.relatedSkillIds.length >= 1;
}
