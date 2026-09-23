import { z } from 'zod';
import { EvidenceRecordDtoSchema } from './evidence.dto.js';
import {
  EvidenceSourceSchema,
  EvidenceVerificationStatusSchema,
} from '../domain/evidence/enums.js';
import { IsoDateTimeSchema, UuidSchema } from './common.js';

export const EvidenceRecordVersionSnapshotSchema = EvidenceRecordDtoSchema;
export type EvidenceRecordVersionSnapshot = z.infer<typeof EvidenceRecordVersionSnapshotSchema>;

/** Redacted snapshot for placement company/B2B read paths (no sourcePayload or verifier contact). */
export const EvidenceRecordVersionRedactedSnapshotSchema = EvidenceRecordDtoSchema.omit({
  sourcePayload: true,
  sourceOwner: true,
  sourceReference: true,
  verificationMetadata: true,
});
export type EvidenceRecordVersionRedactedSnapshot = z.infer<
  typeof EvidenceRecordVersionRedactedSnapshotSchema
>;

export const EvidenceRecordVersionDtoSchema = z.object({
  versionId: UuidSchema,
  evidenceId: UuidSchema,
  versionNumber: z.number().int().min(1),
  snapshot: EvidenceRecordVersionSnapshotSchema,
  actorId: UuidSchema.nullable().optional(),
  organizationId: UuidSchema.nullable().optional(),
  source: EvidenceSourceSchema,
  priorVerificationStatus: EvidenceVerificationStatusSchema.nullable().optional(),
  newVerificationStatus: EvidenceVerificationStatusSchema,
  createdAt: IsoDateTimeSchema,
});
export type EvidenceRecordVersionDto = z.infer<typeof EvidenceRecordVersionDtoSchema>;

export const EvidenceRecordVersionRedactedDtoSchema = EvidenceRecordVersionDtoSchema.extend({
  snapshot: EvidenceRecordVersionRedactedSnapshotSchema,
});
export type EvidenceRecordVersionRedactedDto = z.infer<
  typeof EvidenceRecordVersionRedactedDtoSchema
>;

export const ListEvidenceRecordVersionsResponseSchema = z.object({
  evidenceId: UuidSchema,
  total: z.number().int().min(0),
  items: z.array(EvidenceRecordVersionDtoSchema),
});
export type ListEvidenceRecordVersionsResponse = z.infer<
  typeof ListEvidenceRecordVersionsResponseSchema
>;

export const ListEvidenceRecordVersionsRedactedResponseSchema = z.object({
  evidenceId: UuidSchema,
  total: z.number().int().min(0),
  items: z.array(EvidenceRecordVersionRedactedDtoSchema),
});
export type ListEvidenceRecordVersionsRedactedResponse = z.infer<
  typeof ListEvidenceRecordVersionsRedactedResponseSchema
>;
