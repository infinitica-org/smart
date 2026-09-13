import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema, WeightSchema } from '../../dto/common.js';
import { TaxonomySkillCodeSchema } from '../../dto/catalog.dto.js';
import {
  AccessibilityLevelSchema,
  EvidenceReliabilitySchema,
  EvidenceStrengthSchema,
  EvidenceVerificationMethodSchema,
  FreshnessClassSchema,
  IndependenceLevelSchema,
  ResponsibilityLevelSchema,
} from './enums.js';

export const ProvenanceSchema = z.object({
  collectedBy: z.string().max(120).optional(),
  collectionMethod: z.string().max(120).optional(),
  sourceSystem: z.string().max(120).optional(),
  chainOfCustody: z.array(z.string().max(200)).max(20).default([]),
});
export type Provenance = z.infer<typeof ProvenanceSchema>;

export const FreshnessSchema = z.object({
  evidenceDate: z.string().max(32).optional(),
  freshnessClass: FreshnessClassSchema.optional(),
  expiresAt: IsoDateTimeSchema.nullable().optional(),
  lastValidatedAt: IsoDateTimeSchema.nullable().optional(),
});
export type Freshness = z.infer<typeof FreshnessSchema>;

export const SkillMappingSchema = z.object({
  skillCode: TaxonomySkillCodeSchema,
  contribution: z.string().max(2000).optional(),
  evidenceStrength: EvidenceStrengthSchema.optional(),
  responsibilityLevel: ResponsibilityLevelSchema.optional(),
});
export type SkillMapping = z.infer<typeof SkillMappingSchema>;

export const ContributionSchema = z.object({
  whatWasDone: z.string().min(1).max(4000),
  personalContribution: z.string().min(1).max(4000),
  responsibilityLevel: ResponsibilityLevelSchema,
  independenceLevel: IndependenceLevelSchema.optional(),
  frequency: z.string().max(120).optional(),
  scope: z.string().max(500).optional(),
  decisionsMade: z.array(z.string().max(500)).max(20).default([]),
});
export type Contribution = z.infer<typeof ContributionSchema>;

export const ActivitySchema = z.object({
  task: z.string().min(1).max(2000),
  objective: z.string().max(2000).optional(),
  toolsOrMethods: z.array(z.string().max(120)).max(30).default([]),
  process: z.string().max(2000).optional(),
  constraints: z.array(z.string().max(500)).max(20).default([]),
  decision: z.string().max(2000).optional(),
  reasonForDecision: z.string().max(2000).optional(),
  result: z.string().max(2000).optional(),
  measurableOutcome: z.string().max(500).optional(),
  baseline: z.string().max(500).optional(),
  finalMetric: z.string().max(500).optional(),
});
export type Activity = z.infer<typeof ActivitySchema>;

export const EvidenceContradictionSchema = z.object({
  contradictionId: UuidSchema,
  relatedEvidenceId: UuidSchema,
  description: z.string().min(1).max(2000),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  detectedAt: IsoDateTimeSchema,
});
export type EvidenceContradiction = z.infer<typeof EvidenceContradictionSchema>;

export const VerificationAuditEntrySchema = z.object({
  at: IsoDateTimeSchema,
  actorId: UuidSchema.nullable().optional(),
  action: z.string().min(1).max(120),
  note: z.string().max(2000).optional(),
});
export type VerificationAuditEntry = z.infer<typeof VerificationAuditEntrySchema>;

export const VerificationMetadataSchema = z.object({
  verificationMethod: EvidenceVerificationMethodSchema,
  verifiedBy: z.string().max(120).nullable().optional(),
  verificationDate: IsoDateTimeSchema.nullable().optional(),
  evidenceStrength: EvidenceStrengthSchema.optional(),
  evidenceReliability: EvidenceReliabilitySchema.optional(),
  contradictions: z.array(EvidenceContradictionSchema).max(50).default([]),
  linkedEvidenceIds: z.array(UuidSchema).max(100).default([]),
  freshnessClass: FreshnessClassSchema.optional(),
  reviewRequired: z.boolean().default(false),
  auditTrail: z.array(VerificationAuditEntrySchema).max(100).default([]),
});
export type VerificationMetadata = z.infer<typeof VerificationMetadataSchema>;

export const UniversalEvidenceFieldsSchema = z.object({
  sourceOwner: z.string().max(120).optional(),
  sourceReference: z.string().max(500).optional(),
  evidenceDate: z.string().max(32).optional(),
  submissionDate: IsoDateTimeSchema.optional(),
  claim: z.string().max(4000).optional(),
  context: z.string().max(4000).optional(),
  provenance: ProvenanceSchema.optional(),
  accessibility: AccessibilityLevelSchema.default('PRIVATE'),
});
export type UniversalEvidenceFields = z.infer<typeof UniversalEvidenceFieldsSchema>;

export const EvidenceScoringSchema = z.object({
  evidenceStrength: EvidenceStrengthSchema.optional(),
  evidenceReliability: EvidenceReliabilitySchema.optional(),
  confidence: WeightSchema.optional(),
});
export type EvidenceScoring = z.infer<typeof EvidenceScoringSchema>;
